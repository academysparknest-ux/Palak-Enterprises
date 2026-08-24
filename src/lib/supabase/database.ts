import { supabase, isSupabaseConfigured } from "./client";
import {
  PRODUCTS as LOCAL_PRODUCTS,
  DIGITAL_SERVICES as LOCAL_SERVICES,
  type LocalProduct,
  type LocalService,
  type LocalCategory,
} from "../storage/catalogData";
import { PalakDataStore, normalizeOrder, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest } from "../storage/store";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import { getQueueClassification, type QueueType, type QueuePriority } from "../queue";
import type { StoredInvoice } from "../invoice/types";
import { PalakInvoiceStore } from "../invoice/invoiceStore";
import type {
  OrderPrintSnapshot,
  PrintJob,
  PrintJobStatus,
  AdminPrintOverride,
  PrintAuditLog,
} from "../../types/printJob";

/** Returns true only for valid UUID strings that can be stored in Supabase user_id columns */
function isValidSupabaseUUID(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface PrintOrderPayload {
  serviceId: "document-printing" | "passport-photo" | "visiting-cards" | "id-cards" | "poster-banner" | "custom-print" | "invitation-cards" | string;
  serviceName: string;
  clientSubmissionId?: string;
  printSnapshot?: OrderPrintSnapshot;
  documentType?: string;
  customerName: string;
  customerPhone: string;
  customerWhatsApp?: string;
  customerEmail?: string;
  instructions?: string;
  userId?: string;
  paymentMethod?: "pay_at_store" | "pay_at_shop" | "pay_after_confirmation" | "upi_online" | "pay_online";
  paymentStatus?: "pending" | "confirmed" | "paid" | "refunded";
  queueType?: QueueType;
  queuePriority?: QueuePriority;
  submittedAt?: string;
  priorityAt?: string;
  pricingSnapshot: {
    unitPrice: number;
    subtotal: number;
    finishingTotal?: number;
    totalAmount: number;
    breakdown?: Record<string, any>;
  };
  options: Record<string, any>;
  optionsLabels?: Record<string, string>;
  finishingOptions?: {
    spiralBinding?: boolean;
    combBinding?: boolean;
    lamination?: boolean;
    stapling?: boolean;
  };
  file?: {
    name: string;
    size: number;
    url?: string;
    storagePath?: string;
    pageCount?: number;
    mimeType?: string;
  };
  files?: Array<{
    name: string;
    size: number;
    url?: string;
    storagePath?: string;
    pageCount?: number;
    mimeType?: string;
  }>;
}

// ==============================================================================
// 1. PUBLIC CATALOG DATA FETCHERS (Database-Driven with Safe Local Fallback)
// ==============================================================================

export async function getCategories(): Promise<LocalCategory[]> {
  const localList = PalakDataStore.getCategories();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name_en, name_hi, description_en, description_hi, icon_name, category_type, badge_en, badge_hi, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const dbCategories = data.map((c) => ({
      id: c.id,
      name: { en: c.name_en, hi: c.name_hi },
      description: { en: c.description_en || "", hi: c.description_hi || "" },
      iconName: c.icon_name || "Printer",
      categoryType: c.category_type,
      badge: c.badge_en ? { en: c.badge_en, hi: c.badge_hi || c.badge_en } : undefined,
      count: 0,
    }));

    const mergedMap = new Map<string, LocalCategory>();
    localList.forEach((c) => mergedMap.set(c.id, c));
    dbCategories.forEach((c) => mergedMap.set(c.id, c));
    const mergedList = Array.from(mergedMap.values());
    PalakDataStore.setCategories(mergedList);
    return mergedList;
  } catch {
    return localList;
  }
}

export async function getProducts(): Promise<LocalProduct[]> {
  const localList = PalakDataStore.getProducts();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_options (
          id,
          option_key,
          name_en,
          name_hi,
          is_required,
          sort_order,
          product_option_values (
            id,
            value_key,
            label_en,
            label_hi,
            price_modifier,
            price_multiplier,
            is_default,
            sort_order
          )
        )
      `)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const dbProducts: LocalProduct[] = (data as any[]).map((p: any) => {
      // Map joined options
      const options = (p.product_options || []).map((opt: any) => ({
        key: opt.option_key as any,
        name: { en: opt.name_en, hi: opt.name_hi },
        values: (opt.product_option_values || []).map((v: any) => ({
          key: v.value_key,
          label: { en: v.label_en, hi: v.label_hi },
          priceModifier: Number(v.price_modifier) || 0,
          multiplier: Number(v.price_multiplier) || 1,
          isDefault: Boolean(v.is_default),
        })),
      }));

      // If no options joined from DB, use local product options template if available
      const localMatch = localList.find((lp) => lp.id === p.id || lp.slug === p.slug) || LOCAL_PRODUCTS.find((lp) => lp.id === p.id || lp.slug === p.slug);

      return {
        id: p.id,
        slug: p.slug,
        categoryId: p.category_id,
        categoryType: p.category_type || localMatch?.categoryType || "printing",
        name: { en: p.name_en, hi: p.name_hi },
        shortDesc: { en: p.short_desc_en || "", hi: p.short_desc_hi || "" },
        description: { en: p.description_en, hi: p.description_hi },
        startingPrice: Number(p.starting_price) || localMatch?.startingPrice || 0,
        baseQuantity: p.base_quantity || localMatch?.baseQuantity || 1,
        unit: p.unit || localMatch?.unit || "Pcs",
        imageUrl: p.image_url || localMatch?.imageUrl || "/images/gallery/visiting-cards-sample.svg",
        galleryUrls: p.gallery_urls && p.gallery_urls.length > 0 ? p.gallery_urls : localMatch?.galleryUrls || [],
        isFeatured: Boolean(p.is_featured),
        isPopular: Boolean(p.is_popular),
        isNew: Boolean(p.is_new),
        turnaroundTime: { en: p.turnaround_time_en || "24-48 Hours", hi: p.turnaround_time_hi || "24-48 घंटे" },
        tags: p.tags || localMatch?.tags || [],
        options: options.length > 0 ? options : localMatch?.options || [],
        specifications: p.specifications || localMatch?.specifications || {},
      };
    });

    const mergedMap = new Map<string, LocalProduct>();
    localList.forEach((p) => mergedMap.set(p.id, p));
    dbProducts.forEach((p) => mergedMap.set(p.id, p));
    const mergedList = Array.from(mergedMap.values());
    PalakDataStore.setProducts(mergedList);
    return mergedList;
  } catch {
    return localList;
  }
}

export async function getServices(): Promise<LocalService[]> {
  const localList = PalakDataStore.getDigitalServices();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, estimated_fee, processing_time_en, processing_time_hi, required_documents_en, required_documents_hi, who_needs_it_en, who_needs_it_hi, important_instructions_en, important_instructions_hi, official_portal_name, disclaimer_en, disclaimer_hi, icon_name, is_featured, is_popular, tags, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const dbServices: LocalService[] = data.map((s) => {
      const localMatch = localList.find((ls) => ls.id === s.id || ls.slug === s.slug) || LOCAL_SERVICES.find((ls) => ls.id === s.id || ls.slug === s.slug);
      return {
        id: s.id,
        slug: s.slug,
        categoryId: s.category_id,
        name: { en: s.name_en, hi: s.name_hi },
        shortDesc: { en: s.short_desc_en || "", hi: s.short_desc_hi || "" },
        description: { en: s.description_en, hi: s.description_hi },
        estimatedFee: Number(s.estimated_fee) || localMatch?.estimatedFee || 0,
        processingTime: { en: s.processing_time_en || "1-3 Days", hi: s.processing_time_hi || "1-3 दिन" },
        requiredDocuments: (s.required_documents_en || []).map((docEn: string, idx: number) => ({
          en: docEn,
          hi: (s.required_documents_hi && s.required_documents_hi[idx]) || docEn,
        })),
        whoNeedsIt: (s.who_needs_it_en || []).map((itemEn: string, idx: number) => ({
          en: itemEn,
          hi: (s.who_needs_it_hi && s.who_needs_it_hi[idx]) || itemEn,
        })),
        importantInstructions: (s.important_instructions_en || []).map((insEn: string, idx: number) => ({
          en: insEn,
          hi: (s.important_instructions_hi && s.important_instructions_hi[idx]) || insEn,
        })),
        officialPortalName: s.official_portal_name,
        disclaimer: { en: s.disclaimer_en || "", hi: s.disclaimer_hi || "" },
        iconName: s.icon_name || "FileCheck",
        isFeatured: Boolean(s.is_featured),
        isPopular: Boolean(s.is_popular),
        tags: s.tags || localMatch?.tags || [],
      };
    });

    const mergedMap = new Map<string, LocalService>();
    localList.forEach((s) => mergedMap.set(s.id, s));
    dbServices.forEach((s) => mergedMap.set(s.id, s));
    const mergedList = Array.from(mergedMap.values());
    PalakDataStore.setDigitalServices(mergedList);
    return mergedList;
  } catch {
    return localList;
  }
}

// ==============================================================================
// 2. SECURE TRACKING RPC
// ==============================================================================

export interface PublicTrackingResponse {
  success: boolean;
  entityType?: "order" | "service_request" | "quote_request" | "design_request";
  record?: any;
  timeline?: Array<{
    previousStatus?: string;
    newStatus: string;
    messageEn: string;
    messageHi: string;
    performedBy: string;
    createdAt: string;
  }>;
  error?: "PHONE_MISMATCH" | "NOT_FOUND" | "NETWORK_ERROR";
}

export async function fetchPublicTracking(
  trackingCode: string,
  phoneVerification?: string
): Promise<PublicTrackingResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "NETWORK_ERROR" };
  }

  try {
    const { data, error } = await supabase.rpc("get_public_order_tracking", {
      p_tracking_code: trackingCode.trim().toUpperCase(),
      p_phone: phoneVerification ? phoneVerification.trim() : null,
    });

    if (error) {
      console.warn("Tracking RPC Error:", error);
      return { success: false, error: "NETWORK_ERROR" };
    }

    return (data as PublicTrackingResponse) || { success: false, error: "NOT_FOUND" };
  } catch (err) {
    console.error("fetchPublicTracking exception:", err);
    return { success: false, error: "NETWORK_ERROR" };
  }
}

// ==============================================================================
// 3. STAFF & ERP OPERATIONS (Protected by Database RLS & Staff Roles)
// ==============================================================================

export function mapOrderRowToStoredOrder(o: any): StoredOrder {
  return normalizeOrder(o);
}

export async function getStaffOrders(limit: number = 150): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) {
    return PalakDataStore.getOrders();
  }

  let data: any[] | null = null;
  let queryError: any = null;

  // 1. First attempt: Query orders with order_items joined
  try {
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const res = await query;
    if (res.error) {
      queryError = res.error;
    } else {
      data = res.data;
    }
  } catch (err) {
    queryError = err;
  }

  // 2. Fallback attempt: If relation query failed, try simple select("*")
  if (queryError || !data) {
    console.warn("getStaffOrders primary query notice, attempting flat select fallback:", queryError?.message || queryError);
    try {
      let flatQuery = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit > 0) {
        flatQuery = flatQuery.limit(limit);
      }

      const flatRes = await flatQuery;
      if (!flatRes.error && flatRes.data) {
        data = flatRes.data;
        queryError = null;
      } else if (flatRes.error) {
        queryError = flatRes.error;
      }
    } catch (err) {
      queryError = err;
    }
  }

  if (queryError && (!data || data.length === 0)) {
    console.warn("getStaffOrders database notice:", queryError?.message || queryError);
    // Return local cache rather than failing
    return PalakDataStore.getOrders();
  }

  const normalizedList: StoredOrder[] = [];
  (data || []).forEach((row) => {
    try {
      normalizedList.push(normalizeOrder(row));
    } catch (e) {
      console.warn("Row normalization notice for order:", row?.id || row?.order_code, e);
    }
  });

  if (normalizedList.length > 0) {
    PalakDataStore.syncOrdersFromCloud(normalizedList);
  }

  return normalizedList;
}

export async function getStaffOrderByCodeOrId(codeOrId: string): Promise<StoredOrder | null> {
  if (!isSupabaseConfigured || !supabase || !codeOrId) return null;

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(codeOrId);
    let query = supabase.from("orders").select("*, order_items(*)");
    if (isUUID) {
      query = query.eq("id", codeOrId);
    } else {
      query = query.eq("order_code", codeOrId.trim().toUpperCase());
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return mapOrderRowToStoredOrder(data);
  } catch (err) {
    console.warn("getStaffOrderByCodeOrId query notice:", err);
    return null;
  }
}

export async function getStaffServiceRequests(): Promise<StoredServiceRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, request_code, service_id, service_name, customer_name, customer_phone, customer_email, preferred_contact, applicant_details, uploaded_document_urls, uploaded_document_names, additional_notes, estimated_fee, request_status, acknowledgement_number, staff_notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id,
    requestCode: s.request_code,
    serviceId: s.service_id,
    serviceName: s.service_name,
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    customerEmail: s.customer_email,
    preferredContact: s.preferred_contact,
    applicantDetails: s.applicant_details,
    uploadedDocumentUrls: s.uploaded_document_urls || [],
    uploadedDocumentNames: s.uploaded_document_names || [],
    additionalNotes: s.additional_notes,
    estimatedFee: Number(s.estimated_fee) || 0,
    requestStatus: s.request_status,
    acknowledgementNumber: s.acknowledgement_number,
    staffNotes: s.staff_notes,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

export async function getStaffQuoteRequests(): Promise<StoredQuoteRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, quote_code, service_or_product_type, quantity, size_specifications, material_preferences, sample_image_urls, special_instructions, required_by_date, design_status, reference_file_urls, reference_file_names, additional_details, customer_name, customer_phone, customer_email, preferred_contact, business_name, timeline_requirement, estimated_budget, quoted_amount, quote_status, staff_notes, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((q) => ({
    id: q.id,
    quoteCode: q.quote_code,
    serviceOrProductType: q.service_or_product_type,
    quantity: q.quantity,
    sizeSpecifications: q.size_specifications,
    materialPreferences: q.material_preferences,
    requiredByDate: q.required_by_date,
    designStatus: q.design_status,
    referenceFileUrls: q.reference_file_urls || [],
    referenceFileNames: q.reference_file_names || [],
    additionalDetails: q.additional_details,
    customerName: q.customer_name,
    customerPhone: q.customer_phone,
    customerEmail: q.customer_email,
    businessName: q.business_name,
    quotedAmount: q.quoted_amount ? Number(q.quoted_amount) : undefined,
    quoteStatus: q.quote_status,
    staffNotes: q.staff_notes,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  }));
}

export async function updateStaffOrderStatus(
  orderCode: string,
  newStatus: StoredOrder["orderStatus"],
  staffNotes?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  // Read current status before updating — for accurate history
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("order_status")
    .eq("order_code", orderCode)
    .single();
  const previousStatus = currentOrder?.order_status || null;

  const updatePayload: any = {
    order_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (staffNotes !== undefined) updatePayload.staff_notes = staffNotes;

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("order_code", orderCode);

  if (error) throw error;

  // Insert status history entry with previous_status
  const { error: historyError } = await supabase.from("status_history").insert({
    entity_type: "order",
    entity_code: orderCode,
    previous_status: previousStatus,
    new_status: newStatus,
    message_en: `Order status updated to ${newStatus}`,
    message_hi: `ऑर्डर स्थिति ${newStatus} में अपडेट हुई`,
    performed_by: "Palak Staff ERP",
  });

  if (historyError) {
    console.error("Failed to insert status history:", historyError);
  }

  // Auto-generate invoice when order reaches COMPLETED state
  if (newStatus === "COMPLETED") {
    try {
      const { data: invRes, error: invErr } = await supabase.rpc("create_or_regenerate_invoice", {
        p_order_code: orderCode,
        p_force_regenerate: false,
        p_performed_by: "Palak Staff ERP",
      });

      if (!invErr && invRes && invRes.invoice) {
        const inv = invRes.invoice;
        PalakInvoiceStore.saveInvoiceToLocal({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          orderId: inv.order_id,
          orderCode: inv.order_code,
          userId: inv.user_id,
          source: (inv.source as any) || "ONLINE",
          documentType: (inv.document_type as any) || "TAX_INVOICE",
          financialYear: inv.financial_year || "2026-27",
          invoiceDate: inv.invoice_date,
          completionDate: inv.completion_date,
          customerSnapshot: inv.customer_snapshot,
          businessSnapshot: inv.business_snapshot,
          items: inv.items,
          subtotalAmount: Number(inv.subtotal_amount) || 0,
          discountAmount: Number(inv.discount_amount) || 0,
          taxableAmount: Number(inv.taxable_amount) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          deliveryFee: Number(inv.delivery_fee) || 0,
          otherCharges: Number(inv.other_charges) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          amountPaid: Number(inv.amount_paid) || 0,
          amountDue: Number(inv.amount_due) || 0,
          paymentStatus: inv.payment_status || "pending",
          paymentMethod: inv.payment_method || "pay_at_store",
          status: inv.status || "ISSUED",
          signatureUrl: inv.signature_url || undefined,
          cancelledAt: inv.cancelled_at || undefined,
          cancelledBy: inv.cancelled_by || undefined,
          cancellationReason: inv.cancellation_reason || undefined,
          createdBy: inv.created_by || undefined,
          notes: inv.notes,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        });
      }
    } catch (err) {
      console.warn("[Palak Invoices] Cloud auto-generation notice:", err);
    }
  }
}

export async function updateStaffOrderPaymentStatus(
  orderCode: string,
  paymentStatus: StoredOrder["paymentStatus"],
  staffNotes?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const updatePayload: any = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (staffNotes !== undefined) updatePayload.staff_notes = staffNotes;

  const { error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("order_code", orderCode);

  if (error) throw error;

  // Synchronize local invoice cache and cloud invoice
  PalakInvoiceStore.updateInvoicePaymentStatus(orderCode, paymentStatus);
  try {
    await supabase
      .from("invoices")
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("order_code", orderCode);
  } catch (invSyncErr) {
    console.warn("Invoice status update notice:", invSyncErr);
  }

  await supabase.from("status_history").insert({
    entity_type: "order",
    entity_code: orderCode,
    new_status: `PAYMENT_${paymentStatus.toUpperCase()}`,
    message_en: `Payment status marked as ${paymentStatus.toUpperCase()}`,
    message_hi: `भुगतान स्थिति ${paymentStatus} के रूप में चिह्नित की गई`,
    performed_by: "Palak Staff ERP",
  });
}

export async function markStaffPaymentReceived(
  orderCode: string,
  amount: number,
  paymentMethod: string = "cash",
  notes?: string,
  staffName: string = "Palak Cashier"
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: orderData } = await supabase
    .from("orders")
    .select("id")
    .eq("order_code", orderCode)
    .maybeSingle();

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode);

  // Synchronize local invoice cache
  PalakInvoiceStore.updateInvoicePaymentStatus(orderCode, "paid");
  try {
    await supabase
      .from("invoices")
      .update({
        payment_status: "paid",
        amount_paid: amount,
        amount_due: 0.00,
        updated_at: new Date().toISOString(),
      })
      .eq("order_code", orderCode);
  } catch (invSyncErr) {
    console.warn("Invoice payment update notice:", invSyncErr);
  }

  if (orderData?.id) {
    try {
      await supabase.from("payments").insert({
        order_id: orderData.id,
        amount: amount,
        payment_method: paymentMethod,
        payment_status: "paid",
        received_by: staffName,
        notes: notes || `Payment collected at store by ${staffName}`,
        paid_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Payment table insert notice:", e);
    }
  }

  await supabase.from("status_history").insert({
    entity_type: "order",
    entity_code: orderCode,
    new_status: "PAYMENT_PAID",
    message_en: `Payment of ₹${amount} received via ${paymentMethod.toUpperCase()} (${staffName})`,
    message_hi: `₹${amount} का भुगतान प्राप्त हुआ (${paymentMethod.toUpperCase()})`,
    performed_by: staffName,
  });
}

export async function addStaffOrderNote(
  orderCode: string,
  noteText: string,
  noteType: "staff" | "customer" = "staff"
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !noteText.trim()) return;
  const fieldToUpdate = noteType === "customer" ? "order_notes" : "staff_notes";
  const { error } = await supabase
    .from("orders")
    .update({
      [fieldToUpdate]: noteText.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode);

  if (error) throw error;
}

export async function getOrderStatusHistory(orderCode: string): Promise<Array<{
  id: string;
  new_status: string;
  message_en: string;
  message_hi?: string;
  performed_by: string;
  created_at: string;
}>> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from("status_history")
      .select("id, entity_type, entity_id, entity_code, from_status, to_status, note, performed_by, created_at")
      .eq("entity_code", orderCode)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      new_status: row.to_status || row.new_status || "updated",
      message_en: row.note || row.message_en || `Order status updated to ${row.to_status || "updated"}`,
      message_hi: row.message_hi,
      performed_by: row.performed_by || "Staff",
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getUserOrders(
  userId?: string,
  phone?: string,
  email?: string
): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) {
    // Offline / unconfigured fallback to local storage
    if (phone) return PalakDataStore.getOrdersByPhone(phone);
    if (userId) return PalakDataStore.getOrdersByUserId(userId);
    return [];
  }

  // 1. Try authenticated authoritative RPC: get_customer_orders
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_customer_orders");
    if (!rpcErr && rpcData && rpcData.success && Array.isArray(rpcData.orders) && rpcData.orders.length > 0) {
      const mappedOrders: StoredOrder[] = rpcData.orders.map((o: any) => ({
        id: o.id,
        orderCode: o.orderCode || o.order_code,
        userId: o.userId || o.user_id,
        customerName: o.customerName || o.customer_name,
        customerPhone: o.customerPhone || o.customer_phone,
        customerEmail: o.customerEmail || o.customer_email,
        fulfillmentType: o.fulfillmentType || o.fulfillment_type || "pickup",
        deliveryAddress: o.deliveryAddress || o.delivery_address,
        orderNotes: o.orderNotes || o.order_notes,
        subtotalAmount: Number(o.subtotalAmount ?? o.subtotal_amount) || 0,
        discountAmount: Number(o.discountAmount ?? o.discount_amount) || 0,
        deliveryFee: Number(o.deliveryFee ?? o.delivery_fee) || 0,
        totalAmount: Number(o.totalAmount ?? o.total_amount) || 0,
        paymentMethod: o.paymentMethod || o.payment_method || "pay_at_store",
        paymentStatus: o.paymentStatus || o.payment_status || "pending",
        orderStatus: o.orderStatus || o.order_status || "NEW",
        items: o.items || [],
        invoice: o.invoice,
        createdAt: o.createdAt || o.created_at,
        updatedAt: o.updatedAt || o.updated_at,
      }));

      // Cache locally for offline durability
      mappedOrders.forEach((ord) => PalakDataStore.saveOrderToLocal(ord));
      return mappedOrders;
    }
  } catch (rpcEx) {
    console.warn("[getUserOrders] Customer RPC note:", rpcEx);
  }

  // 2. Direct PostgreSQL Table Query (Hardened with joined order_items)
  try {
    let query = supabase.from("orders").select("*, order_items(*)");
    if (userId && isValidSupabaseUUID(userId)) {
      query = query.eq("user_id", userId);
    } else if (phone && phone.trim()) {
      const cleanDigits = phone.replace(/\D/g, "");
      query = query.or(`customer_phone.ilike.%${cleanDigits}%,customer_phone.eq.${phone.trim()}`);
    } else if (email && email.trim()) {
      query = query.eq("customer_email", email.trim().toLowerCase());
    } else {
      return [];
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.warn("[getUserOrders] Database select error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const mappedList: StoredOrder[] = data.map((o: any) => {
      // Map joined order_items to items payload
      const joinedItems = Array.isArray(o.order_items) && o.order_items.length > 0
        ? o.order_items.map((oi: any) => ({
            productId: oi.product_id || "print-item",
            productName: oi.product_name || "Print Service",
            quantity: Number(oi.quantity) || 1,
            unitPrice: Number(oi.unit_price) || 0,
            totalPrice: Number(oi.total_price) || 0,
            selectedOptions: oi.selected_options || {},
            selectedOptionsLabels: oi.selected_options_labels || {},
            uploadedFileName: oi.uploaded_file_name,
            uploadedFileUrl: oi.uploaded_file_url,
            designNotes: oi.design_notes,
          }))
        : o.items || [];

      return {
        id: o.id,
        orderCode: o.order_code,
        userId: o.user_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerEmail: o.customer_email,
        fulfillmentType: o.fulfillment_type || "pickup",
        deliveryAddress: o.delivery_address,
        orderNotes: o.order_notes,
        subtotalAmount: Number(o.subtotal_amount) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        deliveryFee: Number(o.delivery_fee) || 0,
        totalAmount: Number(o.total_amount) || 0,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        items: joinedItems,
        staffNotes: o.staff_notes,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });

    mappedList.forEach((ord) => PalakDataStore.saveOrderToLocal(ord));
    return mappedList;
  } catch (err) {
    console.error("[getUserOrders] Data query exception:", err);
    throw err;
  }
}

export async function updateStaffServiceStatus(
  requestCode: string,
  newStatus: StoredServiceRequest["requestStatus"],
  staffNotes?: string,
  ackNumber?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const updatePayload: any = {
    request_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (staffNotes !== undefined) updatePayload.staff_notes = staffNotes;
  if (ackNumber !== undefined) updatePayload.acknowledgement_number = ackNumber;

  const { error } = await supabase
    .from("service_requests")
    .update(updatePayload)
    .eq("request_code", requestCode);

  if (error) throw error;

  await supabase.from("status_history").insert({
    entity_type: "service_request",
    entity_code: requestCode,
    new_status: newStatus,
    message_en: `Service request status updated to ${newStatus}`,
    message_hi: `सेवा अनुरोध स्थिति अपडेट हुई`,
    performed_by: "Palak CSC Operator",
  });
}

export async function updateStaffQuoteStatus(
  quoteCode: string,
  newStatus: StoredQuoteRequest["quoteStatus"],
  quotedAmount?: number,
  staffNotes?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const updatePayload: any = {
    quote_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (quotedAmount !== undefined) updatePayload.quoted_amount = quotedAmount;
  if (staffNotes !== undefined) updatePayload.staff_notes = staffNotes;

  const { error } = await supabase
    .from("quote_requests")
    .update(updatePayload)
    .eq("quote_code", quoteCode);

  if (error) throw error;

  await supabase.from("status_history").insert({
    entity_type: "quote_request",
    entity_code: quoteCode,
    new_status: newStatus,
    message_en: `Quote updated to ${newStatus}${quotedAmount ? ` (₹${quotedAmount})` : ""}`,
    message_hi: `कोटेशन स्थिति अपडेट हुई`,
    performed_by: "Palak Estimator",
  });
}

// ==============================================================================
// 4. INSTANT ONLINE PRINT ORDERS & CONFIGURATION
// ==============================================================================

export function generatePrintOrderCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomSuffix = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");
  return `PE-${year}${month}${day}-${randomSuffix}`;
}

export async function getSecureSignedUrl(
  storagePath: string,
  expiresIn = 3600, // 1 hour short-lived signed access for active print/view session
  options?: { download?: boolean | string }
): Promise<string> {
  if (!storagePath) return "";
  // Data URLs, Blob URLs, or external URLs can be returned directly
  if (storagePath.startsWith("data:") || storagePath.startsWith("blob:")) {
    return storagePath;
  }
  if (!isSupabaseConfigured || !supabase) return storagePath;
  try {
    const cleanPath = storagePath.startsWith("customer-documents/")
      ? storagePath.replace("customer-documents/", "")
      : storagePath;
    const { data, error } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(cleanPath, expiresIn, options as any);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    return storagePath;
  } catch (err) {
    console.error("[Palak Storage] Signed URL exception:", err);
    return storagePath;
  }
}

// In-memory cache for file uploads to eliminate duplicate uploads during session retries
const uploadedFilesCache = new Map<string, { url: string; storagePath: string }>();

export async function uploadOrderFile(
  file: File,
  orderCode: string,
  clientSubmissionId?: string
): Promise<{ url: string; storagePath: string } | null> {
  if (!file) return null;

  const cacheKey = `${clientSubmissionId || orderCode}_${file.name}_${file.size}`;
  if (uploadedFilesCache.has(cacheKey)) {
    return uploadedFilesCache.get(cacheKey)!;
  }

  // Check if this logical file was already uploaded & associated with an existing order for this submission
  if (isSupabaseConfigured && supabase && clientSubmissionId) {
    try {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_code")
        .eq("client_submission_id", clientSubmissionId.trim())
        .maybeSingle();

      if (existingOrder?.id) {
        const { data: existingFiles } = await supabase
          .from("order_files")
          .select("file_name, file_path, file_url, file_size")
          .eq("order_id", existingOrder.id);

        const matched = (existingFiles || []).find(
          (f) => f.file_name === file.name && (Number(f.file_size) === file.size || !f.file_size)
        );

        if (matched?.file_path) {
          const result = {
            url: matched.file_url || matched.file_path,
            storagePath: matched.file_path,
          };
          uploadedFilesCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (chkErr) {
      console.debug("[uploadOrderFile] Existing order file lookup note:", chkErr);
    }
  }

  // Sanitize filename & extension to prevent path traversal
  const rawExt = file.name.split(".").pop() || "dat";
  const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "dat";
  const cleanOrderCode = orderCode.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || `ORDER_${Date.now()}`;
  const fileUniqueId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  const filePath = `orders/${cleanOrderCode}/${Date.now()}_${fileUniqueId}.${safeExt}`;

  // 1. Attempt upload to Supabase Storage if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.storage
        .from("customer-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (!error) {
        // Fast-path: Synchronously resolve public/storage URL (signed URLs are resolved on-demand when viewed in Admin)
        const { data: publicUrlData } = supabase.storage
          .from("customer-documents")
          .getPublicUrl(filePath);

        const uploadResult = {
          url: publicUrlData?.publicUrl || filePath,
          storagePath: filePath,
        };
        uploadedFilesCache.set(cacheKey, uploadResult);
        return uploadResult;
      } else {
        console.warn("[uploadOrderFile] Storage upload note, falling back to local data URL:", error.message || error);
      }
    } catch (err) {
      console.warn("[uploadOrderFile] Storage exception, falling back to local data URL:", err);
    }
  }

  // 2. Resilient Data URL fallback (ensures file is ALWAYS accessible in Admin even offline or without storage bucket)
  try {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

    if (dataUrl) {
      const fallbackResult = {
        url: dataUrl,
        storagePath: `local/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      };
      uploadedFilesCache.set(cacheKey, fallbackResult);
      return fallbackResult;
    }
  } catch (readerErr) {
    console.error("FileReader fallback exception:", readerErr);
  }

  return null;
}

const PRINT_PRICING_STORAGE_KEY = "palak_print_pricing_config_v1";

export function getLocalPrintPricingConfig(): PrintPricingConfig {
  if (typeof window === "undefined") return DEFAULT_PRINT_PRICING;
  try {
    const raw = localStorage.getItem(PRINT_PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_PRICING;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRINT_PRICING,
      ...parsed,
      documentPrinting: {
        ...DEFAULT_PRINT_PRICING.documentPrinting,
        ...(parsed.documentPrinting || {}),
        paperSizes: {
          ...DEFAULT_PRINT_PRICING.documentPrinting.paperSizes,
          ...(parsed.documentPrinting?.paperSizes || {}),
        },
        baseRatePerPage: {
          ...DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage,
          ...(parsed.documentPrinting?.baseRatePerPage || {}),
        },
        finishing: {
          ...DEFAULT_PRINT_PRICING.documentPrinting.finishing,
          ...(parsed.documentPrinting?.finishing || {}),
        },
      },
      passportPhoto: {
        ...DEFAULT_PRINT_PRICING.passportPhoto,
        ...(parsed.passportPhoto || {}),
      },
      visitingCards: {
        ...DEFAULT_PRINT_PRICING.visitingCards,
        ...(parsed.visitingCards || {}),
      },
      idCards: {
        ...DEFAULT_PRINT_PRICING.idCards,
        ...(parsed.idCards || {}),
      },
      posters: {
        ...DEFAULT_PRINT_PRICING.posters,
        ...(parsed.posters || {}),
      },
    };
  } catch {
    return DEFAULT_PRINT_PRICING;
  }
}

export function saveLocalPrintPricingConfig(config: PrintPricingConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRINT_PRICING_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("palak_print_pricing_updated", { detail: config }));
  } catch (e) {
    console.error("Error saving print pricing locally:", e);
  }
}

export async function getPrintPricingConfig(): Promise<PrintPricingConfig> {
  const localConfig = getLocalPrintPricingConfig();
  if (!isSupabaseConfigured || !supabase) {
    return localConfig;
  }
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("value")
      .eq("key", "print_pricing_config")
      .maybeSingle();

    if (error || !data || !data.value) {
      return localConfig;
    }
    const merged = { ...localConfig, ...data.value };
    saveLocalPrintPricingConfig(merged);
    return merged;
  } catch {
    return localConfig;
  }
}

export async function updatePrintPricingConfig(config: PrintPricingConfig): Promise<boolean> {
  // Always persist locally first so edits are guaranteed across reloads
  saveLocalPrintPricingConfig(config);

  if (!isSupabaseConfigured || !supabase) return true;
  try {
    const { error } = await supabase
      .from("business_settings")
      .upsert({
        key: "print_pricing_config",
        value: config as any,
        description: "Authoritative pricing configuration for instant online printing services",
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.warn("[updatePrintPricingConfig] Cloud update notice (saved locally):", error.message);
    }
    return true;
  } catch (err) {
    console.warn("[updatePrintPricingConfig] Cloud update notice (saved locally):", err);
    return true;
  }
}

// ==============================================================================
// QUICK SERVICES AVAILABILITY (ADMIN START / STOP SYSTEM)
// ==============================================================================
export interface QuickServiceItem {
  id: string;
  name_en: string;
  name_hi: string;
  category: "quick_service" | "sub_service" | string;
  description_en?: string;
  description_hi?: string;
  path?: string;
  icon_name?: string;
  is_active: boolean;
  stop_reason?: string | null;
  stop_reason_hi?: string | null;
  sort_order: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_QUICK_SERVICES: QuickServiceItem[] = [
  {
    id: "passport-photo",
    name_en: "Passport Photo Printing",
    name_hi: "पासपोर्ट फोटो प्रिंटिंग",
    category: "quick_service",
    description_en: "8, 16, 32 photo sheets & 4x6 single prints",
    description_hi: "8, 16, 32 फोटो शीट व 4x6 सिंगल प्रिंट",
    path: "/online-services/passport-photo",
    icon_name: "Camera",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "document-printing",
    name_en: "Document Printing",
    name_hi: "दस्तावेज प्रिंटिंग",
    category: "quick_service",
    description_en: "Notes, assignments, forms, reports & all documents",
    description_hi: "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य दस्तावेज",
    path: "/online-services/document-printing",
    icon_name: "FileText",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "color-printing",
    name_en: "Color Printing",
    name_hi: "रंगीन प्रिंटिंग",
    category: "sub_service",
    description_en: "High-quality vibrant color laser printing",
    description_hi: "उच्च गुणवत्ता वाली रंगीन लेजर प्रिंटिंग",
    path: "/online-services/document-printing",
    icon_name: "Printer",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "bw-printing",
    name_en: "Black & White Printing",
    name_hi: "ब्लैक एंड व्हाइट प्रिंटिंग",
    category: "sub_service",
    description_en: "Standard crisp B&W document printing",
    description_hi: "स्पष्ट ब्लैक एंड व्हाइट दस्तावेज प्रिंटिंग",
    path: "/online-services/document-printing",
    icon_name: "Printer",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "lamination",
    name_en: "Document Lamination",
    name_hi: "लेमिनेशन सेवा",
    category: "sub_service",
    description_en: "Glossy protective lamination for certificates & documents",
    description_hi: "प्रमाणपत्रों व दस्तावेजों के लिए सुरक्षात्मक लेमिनेशन",
    path: "/online-services/document-printing",
    icon_name: "Shield",
    is_active: true,
    sort_order: 5,
  },
  {
    id: "spiral-binding",
    name_en: "Spiral Binding",
    name_hi: "स्पाइरल बाइंडिंग",
    category: "sub_service",
    description_en: "Plastic coil binding with transparent protective covers",
    description_hi: "पारदर्शी कवर के साथ प्लास्टिक कॉइल बाइंडिंग",
    path: "/online-services/document-printing",
    icon_name: "BookOpen",
    is_active: true,
    sort_order: 6,
  },
  {
    id: "visiting-cards",
    name_en: "Visiting Cards",
    name_hi: "विजिटिंग कार्ड प्रिंटिंग",
    category: "quick_service",
    description_en: "100, 500, 1000 cards (Matte, Gloss, Velvet finish)",
    description_hi: "100, 500, 1000 कार्ड्स (मैट, ग्लॉस, वेलवेट फिनिश)",
    path: "/online-services/visiting-cards",
    icon_name: "CreditCard",
    is_active: true,
    sort_order: 7,
  },
  {
    id: "id-cards",
    name_en: "ID Cards",
    name_hi: "पहचान पत्र (ID Card)",
    category: "quick_service",
    description_en: "PVC single/double sided with lanyard & card holder",
    description_hi: "पीवीसी सिंगल/डबल साइडेड लैनयार्ड व कार्ड होल्डर सहित",
    path: "/online-services/id-cards",
    icon_name: "Contact",
    is_active: true,
    sort_order: 8,
  },
  {
    id: "poster-banner",
    name_en: "Poster & Flex Banner",
    name_hi: "पोस्टर एवं बैनर प्रिंटिंग",
    category: "quick_service",
    description_en: "A4, A3, A2 glossy photo & vinyl flex per sq.ft",
    description_hi: "A4, A3, A2 फोटो शीट, विनाइल व फ्लेक्स प्रति वर्ग फीट",
    path: "/online-services/poster-banner",
    icon_name: "ImageIcon",
    is_active: true,
    sort_order: 9,
  },
  {
    id: "invitation-cards",
    name_en: "Invitation Cards",
    name_hi: "शादी एवं निमंत्रण कार्ड",
    category: "quick_service",
    description_en: "Customized wedding and ceremony invitation printing",
    description_hi: "शादी और समारोह के लिए कस्टमाइज्ड निमंत्रण पत्र",
    path: "/online-services/invitation-cards",
    icon_name: "Sparkles",
    is_active: true,
    sort_order: 10,
  },
  {
    id: "custom-print",
    name_en: "Custom Print Order",
    name_hi: "कस्टम प्रिंट ऑर्डर",
    category: "quick_service",
    description_en: "Pamphlets, bill books, stickers, menus & custom jobs",
    description_hi: "पम्पलेट, बिल बुक, स्टिकर, मेन्यू व अन्य आवश्यकताएं",
    path: "/online-services/custom-print",
    icon_name: "Printer",
    is_active: true,
    sort_order: 11,
  },
];

const QUICK_SERVICES_LOCAL_KEY = "palak_quick_services_availability";

export function getLocalQuickServices(): QuickServiceItem[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_SERVICES;
  try {
    const raw = localStorage.getItem(QUICK_SERVICES_LOCAL_KEY);
    if (!raw) return DEFAULT_QUICK_SERVICES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUICK_SERVICES;
  } catch {
    return DEFAULT_QUICK_SERVICES;
  }
}

export function saveLocalQuickServices(services: QuickServiceItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUICK_SERVICES_LOCAL_KEY, JSON.stringify(services));
    window.dispatchEvent(new CustomEvent("palak_quick_services_updated", { detail: services }));
  } catch (e) {
    console.error("Error saving quick services locally:", e);
  }
}

/** Fetches all Quick Services with real-time status from cloud or local fallback */
export async function getQuickServices(): Promise<QuickServiceItem[]> {
  const localList = getLocalQuickServices();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase
      .from("quick_services")
      .select("id, name_en, name_hi, category, description_en, description_hi, path, icon_name, is_active, stop_reason, stop_reason_hi, stopped_at, stopped_by, sort_order, updated_at")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const merged = data.map((item: any) => ({
      id: item.id,
      name_en: item.name_en,
      name_hi: item.name_hi,
      category: item.category || "quick_service",
      description_en: item.description_en,
      description_hi: item.description_hi,
      path: item.path,
      icon_name: item.icon_name,
      is_active: item.is_active !== false,
      stop_reason: item.stop_reason,
      stop_reason_hi: item.stop_reason_hi,
      sort_order: item.sort_order || 0,
      updated_by: item.updated_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    saveLocalQuickServices(merged);
    return merged;
  } catch {
    return localList;
  }
}

/** Get a single Quick Service status by ID */
export async function getQuickServiceById(id: string): Promise<QuickServiceItem | null> {
  const all = await getQuickServices();
  return all.find((s) => s.id === id) || null;
}

/** Toggles Quick Service Availability (Start / Stop) with database RPC and audit trail */
export async function toggleQuickServiceAvailability(
  serviceId: string,
  isActive: boolean,
  stopReason?: string,
  performedBy: string = "Admin Staff"
): Promise<{ success: boolean; error?: string; service?: QuickServiceItem }> {
  // Update local cache optimistically
  const currentList = getLocalQuickServices();
  const updatedList = currentList.map((s) =>
    s.id === serviceId
      ? {
          ...s,
          is_active: isActive,
          stop_reason: isActive ? null : stopReason || "Temporarily unavailable",
          updated_by: performedBy,
          updated_at: new Date().toISOString(),
        }
      : s
  );
  saveLocalQuickServices(updatedList);

  if (!isSupabaseConfigured || !supabase) {
    const updated = updatedList.find((s) => s.id === serviceId);
    return { success: true, service: updated };
  }

  try {
    // 1. Try atomic RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc("toggle_quick_service_status", {
      p_service_id: serviceId,
      p_is_active: isActive,
      p_stop_reason: stopReason?.trim() || null,
      p_performed_by: performedBy,
    });

    if (!rpcErr && rpcData?.success) {
      const fresh = await getQuickServices();
      const s = fresh.find((x) => x.id === serviceId);
      return { success: true, service: s };
    }

    // 2. Direct table update fallback
    const { error } = await supabase
      .from("quick_services")
      .update({
        is_active: isActive,
        stop_reason: isActive ? null : stopReason?.trim() || "Temporarily unavailable",
        updated_by: performedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Direct quick_services update error:", error);
      return { success: false, error: error.message };
    }

    const fresh = await getQuickServices();
    return { success: true, service: fresh.find((x) => x.id === serviceId) };
  } catch (err: any) {
    console.error("toggleQuickServiceAvailability exception:", err);
    return { success: false, error: err?.message || "Failed to update service availability" };
  }
}

/** Toggle availability status for ALL quick services at once */
export async function toggleAllQuickServicesAvailability(
  isActive: boolean,
  stopReason?: string,
  performedBy: string = "Admin Staff"
): Promise<{ success: boolean; services?: QuickServiceItem[]; error?: string }> {
  // Update local cache immediately
  const localList = getLocalQuickServices();
  const nowIso = new Date().toISOString();
  const updatedList = localList.map((s) => ({
    ...s,
    is_active: isActive,
    stop_reason: isActive ? null : stopReason || "All quick services temporarily paused",
    updated_by: performedBy,
    updated_at: nowIso,
  }));
  saveLocalQuickServices(updatedList);

  if (!isSupabaseConfigured || !supabase) {
    return { success: true, services: updatedList };
  }

  try {
    // 1. Try atomic RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc("toggle_all_quick_services", {
      p_is_active: isActive,
      p_stop_reason: stopReason?.trim() || null,
      p_performed_by: performedBy,
    });

    if (!rpcErr && rpcData?.success) {
      const fresh = await getQuickServices();
      return { success: true, services: fresh };
    }

    // 2. Direct table update fallback
    const { error } = await supabase
      .from("quick_services")
      .update({
        is_active: isActive,
        stop_reason: isActive ? null : stopReason?.trim() || "All quick services temporarily paused",
        updated_by: performedBy,
        updated_at: nowIso,
      })
      .neq("id", "___nonexistent___");

    if (error) {
      console.warn("Direct bulk quick_services update error:", error);
      return { success: false, error: error.message };
    }

    const fresh = await getQuickServices();
    return { success: true, services: fresh };
  } catch (err: any) {
    console.error("toggleAllQuickServicesAvailability exception:", err);
    return { success: false, error: err?.message || "Failed to update all services availability" };
  }
}

// ─── Centralized Quick Services Realtime Multiplexer (Singleton) ─────────────
type QuickServiceCallback = (services: QuickServiceItem[]) => void;
const quickServiceSubscribers = new Set<QuickServiceCallback>();
let quickServicesChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
let lastCachedQuickServices: QuickServiceItem[] | null = null;

async function notifyQuickServiceSubscribers() {
  try {
    const fresh = await getQuickServices();
    lastCachedQuickServices = fresh;
    quickServiceSubscribers.forEach((cb) => {
      try {
        cb(fresh);
      } catch (err) {
        console.warn("[QuickServicesRealtime] Subscriber callback error:", err);
      }
    });
  } catch (e) {
    console.warn("Quick services realtime fetch notice:", e);
  }
}

/** Subscribe to live real-time changes on quick services via a shared singleton channel */
export function subscribeToQuickServices(
  callback: QuickServiceCallback
): () => void {
  quickServiceSubscribers.add(callback);

  // Deliver cached services immediately if available
  if (lastCachedQuickServices) {
    try {
      callback(lastCachedQuickServices);
    } catch {}
  }

  // Listen for local custom events (instant same-tab updates)
  const localHandler = (e: any) => {
    if (e?.detail) {
      lastCachedQuickServices = e.detail;
      callback(e.detail);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("palak_quick_services_updated", localHandler);
  }

  if (isSupabaseConfigured && supabase && !quickServicesChannel) {
    quickServicesChannel = supabase
      .channel("quick-services-realtime-singleton")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "quick_services" },
        () => {
          notifyQuickServiceSubscribers();
        }
      )
      .subscribe();
  }

  return () => {
    quickServiceSubscribers.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("palak_quick_services_updated", localHandler);
    }
    if (quickServiceSubscribers.size === 0 && quickServicesChannel && supabase) {
      try {
        supabase.removeChannel(quickServicesChannel);
      } catch {}
      quickServicesChannel = null;
    }
  };
}

// In-flight idempotency mutex map to eliminate duplicate submissions from rapid clicks or concurrent attempts
const inFlightPrintSubmissions = new Map<string, Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }>>();

export async function submitPrintOrder(
  payload: PrintOrderPayload
): Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }> {
  const markStart = `print_order_submit_start_${Date.now()}`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(markStart);
  }

  const clientSubmissionId =
    payload.clientSubmissionId ||
    `PE-SUB-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

  if (inFlightPrintSubmissions.has(clientSubmissionId)) {
    console.warn("[submitPrintOrder] Deduplicating in-flight order submission:", clientSubmissionId);
    return inFlightPrintSubmissions.get(clientSubmissionId)!;
  }

  const executionPromise = (async () => {
    // 0. Pre-validate Service Availability (Start / Stop System)
    try {
      const activeServices = await getQuickServices();
      const matchedService = activeServices.find((s) => s.id === payload.serviceId);
      if (matchedService && matchedService.is_active === false) {
        const stopReasonMsg = matchedService.stop_reason
          ? ` (${matchedService.stop_reason})`
          : "";
        return {
          success: false,
          orderCode: "",
          error: `This service has just been stopped and is currently not accepting new orders${stopReasonMsg}. Please choose another service or try again later.`,
        };
      }
    } catch (availCheckErr) {
      console.warn("Availability pre-check notice:", availCheckErr);
    }

    let finalOrderCode = generatePrintOrderCode();
    let finalOrderId: string | undefined = undefined;

    // Normalize payment method and status
    const paymentMethod =
      payload.paymentMethod === "upi_online" || payload.paymentMethod === "pay_online"
        ? "upi_online"
        : payload.paymentMethod === "pay_after_confirmation"
        ? "pay_after_confirmation"
        : "pay_at_store";
    const paymentStatus =
      payload.paymentStatus === "confirmed" || payload.paymentStatus === "paid"
        ? "confirmed"
        : "pending";

    // Collect all files (either array or single file)
    const allFiles = payload.files && payload.files.length > 0
      ? payload.files
      : payload.file
      ? [payload.file]
      : [];

    const primaryFile = allFiles[0] || payload.file;

    const orderItem = {
      productId: payload.serviceId,
      productName: payload.serviceName,
      quantity: Math.max(1, Number(payload.options.copies) || Number(payload.options.quantity) || 1),
      unitPrice: Math.max(0, payload.pricingSnapshot.unitPrice || 0),
      totalPrice: Math.max(0, payload.pricingSnapshot.totalAmount || 0),
      selectedOptions: {
        ...payload.options,
        documentType: payload.documentType || "General Document",
        finishing: payload.finishingOptions || {},
        finishingTotal: payload.pricingSnapshot.finishingTotal || 0,
        breakdown: payload.pricingSnapshot.breakdown || {},
        storagePath: primaryFile?.storagePath,
        files: allFiles.map((f) => ({
          name: f.name,
          size: f.size,
          url: f.url,
          storagePath: f.storagePath,
          pageCount: f.pageCount,
        })),
      },
      selectedOptionsLabels: payload.optionsLabels || {},
      uploadedFileName: primaryFile?.name,
      uploadedFileUrl: primaryFile?.url,
      designNotes: payload.instructions,
    };

    const now = new Date().toISOString();
    const queueMeta = getQueueClassification({
      queueType: payload.queueType,
      queuePriority: payload.queuePriority,
      submittedAt: payload.submittedAt || now,
      priorityAt: payload.priorityAt || (paymentStatus === "confirmed" ? now : undefined),
      paymentMethod,
      paymentStatus,
      orderNotes: payload.instructions,
      createdAt: now,
    });

    // 1. Authoritative Persistence (Single Atomic PostgreSQL RPC with multi-tier fallback)
    if (isSupabaseConfigured && supabase) {
      const validUserId = isValidSupabaseUUID(payload.userId) ? payload.userId : null;
      let rpcSucceeded = false;

      // Tier 1: Try full RPC with print snapshot (18 arguments)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("create_online_print_order", {
          p_order_code: finalOrderCode,
          p_customer_name: payload.customerName.trim(),
          p_customer_phone: payload.customerPhone.trim(),
          p_customer_email: payload.customerEmail?.trim() || null,
          p_fulfillment_type: "pickup",
          p_delivery_address: null,
          p_order_notes: payload.instructions?.trim() || null,
          p_subtotal_amount: payload.pricingSnapshot.subtotal,
          p_delivery_fee: 0,
          p_total_amount: payload.pricingSnapshot.totalAmount,
          p_payment_method: paymentMethod,
          p_payment_status: paymentStatus,
          p_user_id: validUserId,
          p_staff_notes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
          p_items: [orderItem] as any,
          p_files: allFiles.map((f) => ({
            name: f.name,
            path: f.storagePath || f.url || "",
            url: f.url || "",
            type: f.mimeType || "application/pdf",
            size: f.size || 0,
          })) as any,
          p_client_submission_id: clientSubmissionId,
          p_print_snapshot: payload.printSnapshot || null,
        });

        if (!rpcErr && rpcData) {
          rpcSucceeded = true;
          if (rpcData.orderCode) finalOrderCode = rpcData.orderCode;
          if (rpcData.orderId) finalOrderId = rpcData.orderId;
        } else if (rpcErr) {
          console.warn("[submitPrintOrder] Tier 1 RPC error, attempting Tier 2 (legacy params):", rpcErr.message || rpcErr);
        }
      } catch (err) {
        console.warn("[submitPrintOrder] Tier 1 RPC invocation failed:", err);
      }

      // Tier 2: Try legacy 17-argument RPC (without p_print_snapshot) if Tier 1 had schema cache mismatch
      if (!rpcSucceeded) {
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("create_online_print_order", {
            p_order_code: finalOrderCode,
            p_customer_name: payload.customerName.trim(),
            p_customer_phone: payload.customerPhone.trim(),
            p_customer_email: payload.customerEmail?.trim() || null,
            p_fulfillment_type: "pickup",
            p_delivery_address: null,
            p_order_notes: payload.instructions?.trim() || null,
            p_subtotal_amount: payload.pricingSnapshot.subtotal,
            p_delivery_fee: 0,
            p_total_amount: payload.pricingSnapshot.totalAmount,
            p_payment_method: paymentMethod,
            p_payment_status: paymentStatus,
            p_user_id: validUserId,
            p_staff_notes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
            p_items: [orderItem] as any,
            p_files: allFiles.map((f) => ({
              name: f.name,
              path: f.storagePath || f.url || "",
              url: f.url || "",
              type: f.mimeType || "application/pdf",
              size: f.size || 0,
            })) as any,
            p_client_submission_id: clientSubmissionId,
          });

          if (!rpcErr && rpcData) {
            rpcSucceeded = true;
            if (rpcData.orderCode) finalOrderCode = rpcData.orderCode;
            if (rpcData.orderId) finalOrderId = rpcData.orderId;
          } else if (rpcErr) {
            console.warn("[submitPrintOrder] Tier 2 RPC error, falling back to direct table insertion:", rpcErr.message || rpcErr);
          }
        } catch (err) {
          console.warn("[submitPrintOrder] Tier 2 RPC invocation failed:", err);
        }
      }

      // Tier 3: Resilient Direct PostgreSQL Table Insertion Fallback
      if (!rpcSucceeded) {
        try {
          // Check if order already committed under this clientSubmissionId
          const { data: existingOrder } = await supabase
            .from("orders")
            .select("id, order_code")
            .eq("client_submission_id", clientSubmissionId)
            .maybeSingle();

          if (existingOrder?.order_code) {
            finalOrderCode = existingOrder.order_code;
            finalOrderId = existingOrder.id;
            rpcSucceeded = true;
          } else {
            const orderInsertData: any = {
              order_code: finalOrderCode,
              customer_name: payload.customerName.trim(),
              customer_phone: payload.customerPhone.trim(),
              customer_email: payload.customerEmail?.trim() || null,
              fulfillment_type: "pickup",
              order_notes: payload.instructions?.trim() || null,
              subtotal_amount: payload.pricingSnapshot.subtotal,
              delivery_fee: 0,
              total_amount: payload.pricingSnapshot.totalAmount,
              payment_method: paymentMethod,
              payment_status: paymentStatus,
              order_status: "NEW",
              user_id: validUserId,
              staff_notes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
              items: [orderItem],
              client_submission_id: clientSubmissionId,
              print_snapshot: payload.printSnapshot || null,
            };

            let { data: insertedOrder, error: insertErr } = await supabase
              .from("orders")
              .insert(orderInsertData)
              .select("id, order_code")
              .maybeSingle();

            // Column compatibility retry if database schema is missing newer columns
            if (insertErr && (insertErr.message?.includes("column") || insertErr.code === "42703")) {
              delete orderInsertData.client_submission_id;
              delete orderInsertData.print_snapshot;
              const retryRes = await supabase
                .from("orders")
                .insert(orderInsertData)
                .select("id, order_code")
                .maybeSingle();
              insertedOrder = retryRes.data;
              insertErr = retryRes.error;
            }

            if (insertErr) {
              console.error("[submitPrintOrder] Direct table insertion failed:", insertErr);
              return { success: false, orderCode: "", error: insertErr.message || "Failed to confirm order with server." };
            }

            if (insertedOrder) {
              finalOrderId = insertedOrder.id;
              finalOrderCode = insertedOrder.order_code || finalOrderCode;
              rpcSucceeded = true;

              // Insert order_items
              try {
                await supabase.from("order_items").insert({
                  order_id: finalOrderId,
                  product_id: payload.serviceId || "document-printing",
                  product_name: payload.serviceName || "Document Printing",
                  quantity: Math.max(1, Number(payload.options.copies) || Number(payload.options.quantity) || 1),
                  unit_price: Math.max(0, payload.pricingSnapshot.unitPrice || 0),
                  total_price: Math.max(0, payload.pricingSnapshot.totalAmount || 0),
                  selected_options: orderItem.selectedOptions,
                  selected_options_labels: orderItem.selectedOptionsLabels,
                  uploaded_file_url: primaryFile?.url || null,
                  uploaded_file_name: primaryFile?.name || null,
                  design_notes: payload.instructions || null,
                });
              } catch (itemErr) {
                console.warn("[submitPrintOrder] order_items fallback insert note:", itemErr);
              }

              // Insert order_files
              if (allFiles.length > 0) {
                try {
                  const fileRows = allFiles.map((f) => ({
                    order_id: finalOrderId,
                    file_name: f.name,
                    file_path: f.storagePath || f.url || "",
                    file_url: f.url || "",
                    file_type: f.mimeType || "application/pdf",
                    file_size: f.size || 0,
                  }));
                  await supabase.from("order_files").insert(fileRows);
                } catch (fileErr) {
                  console.warn("[submitPrintOrder] order_files fallback insert note:", fileErr);
                }
              }

              // Create print job tracking entry if table exists
              try {
                await supabase.from("print_jobs").insert({
                  order_id: finalOrderId,
                  order_code: finalOrderCode,
                  customer_name: payload.customerName.trim(),
                  customer_phone: payload.customerPhone.trim(),
                  status: "PENDING",
                  items: [orderItem],
                  overrides: [],
                  audit_logs: [{
                    action: "ORDER_PLACED",
                    timestamp: new Date().toISOString(),
                    details: "Order created via online document printing",
                  }],
                });
              } catch (jobErr) {
                console.debug("[submitPrintOrder] print_jobs fallback insert note:", jobErr);
              }
            }
          }
        } catch (directInsertException) {
          console.error("[submitPrintOrder] Direct table fallback failed:", directInsertException);
          return {
            success: false,
            orderCode: "",
            error: (directInsertException as any)?.message || "Failed to confirm order with server.",
          };
        }
      }
    }

    // 2. Save to local storage for offline durability & instant cache
    try {
      PalakDataStore.saveOrderToLocal({
        orderCode: finalOrderCode,
        clientSubmissionId,
        userId: payload.userId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        fulfillmentType: "pickup",
        orderNotes: payload.instructions,
        subtotalAmount: payload.pricingSnapshot.subtotal,
        deliveryFee: 0,
        totalAmount: payload.pricingSnapshot.totalAmount,
        paymentMethod,
        paymentStatus,
        orderStatus: "NEW",
        items: [orderItem],
        printSnapshot: payload.printSnapshot,
        staffNotes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
        queueType: queueMeta.queueType,
        queuePriority: queueMeta.queuePriority,
        submittedAt: queueMeta.submittedAt,
        priorityAt: queueMeta.priorityAt,
      });
    } catch (e) {
      console.warn("Local store fallback sync notice:", e);
    }

    if (typeof performance !== "undefined" && performance.mark && performance.measure) {
      const markEnd = `print_order_submit_end_${Date.now()}`;
      performance.mark(markEnd);
      try {
        performance.measure("print_order_submission_duration", markStart, markEnd);
        const entries = performance.getEntriesByName("print_order_submission_duration");
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          console.log(`⚡ [Performance] Print order ${finalOrderCode} confirmed in ${Math.round(lastEntry.duration)}ms`);
        }
      } catch {}
    }

    return { success: true, orderCode: finalOrderCode, orderId: finalOrderId };
  })();

  inFlightPrintSubmissions.set(clientSubmissionId, executionPromise);
  setTimeout(() => {
    inFlightPrintSubmissions.delete(clientSubmissionId);
  }, 6000);

  try {
    return await executionPromise;
  } finally {
    inFlightPrintSubmissions.delete(clientSubmissionId);
  }
}

// ==============================================================================
// 5. INVOICES & BILLING DATA ACCESS
// ==============================================================================

export async function getStaffInvoices(validOrderCodes?: Set<string>): Promise<StoredInvoice[]> {
  if (!isSupabaseConfigured || !supabase) {
    const local = PalakInvoiceStore.getAllLocalInvoices();
    return validOrderCodes ? local.filter((i) => i.orderCode && validOrderCodes.has(i.orderCode.trim().toUpperCase())) : local;
  }

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, order_id, order_code, user_id, source, document_type, financial_year, invoice_date, completion_date, total_amount, amount_paid, amount_due, payment_status, payment_method, business_snapshot, customer_snapshot, pricing_snapshot, items, notes, status, created_at, updated_at")
      .order("invoice_date", { ascending: false });

    if (error) {
      console.warn("getStaffInvoices cloud query error, reconciling local store:", error.message || error);
      if (validOrderCodes) {
        return PalakInvoiceStore.pruneOrphanedInvoices(validOrderCodes);
      }
      return PalakInvoiceStore.getAllLocalInvoices();
    }

    const cloudData = data || [];
    const mapped: StoredInvoice[] = cloudData.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      orderId: inv.order_id,
      orderCode: inv.order_code,
      userId: inv.user_id,
      source: (inv.source as any) || "ONLINE",
      documentType: (inv.document_type as any) || "TAX_INVOICE",
      financialYear: inv.financial_year || "2026-27",
      invoiceDate: inv.invoice_date,
      completionDate: inv.completion_date,
      customerSnapshot: inv.customer_snapshot || {},
      businessSnapshot: inv.business_snapshot || {},
      items: inv.items || [],
      subtotalAmount: Number(inv.subtotal_amount) || 0,
      discountAmount: Number(inv.discount_amount) || 0,
      taxableAmount: Number(inv.taxable_amount) || 0,
      taxAmount: Number(inv.tax_amount) || 0,
      deliveryFee: Number(inv.delivery_fee) || 0,
      otherCharges: Number(inv.other_charges) || 0,
      totalAmount: Number(inv.total_amount) || 0,
      amountPaid: Number(inv.amount_paid) || 0,
      amountDue: Number(inv.amount_due) || 0,
      paymentStatus: inv.payment_status || "pending",
      paymentMethod: inv.payment_method || "pay_at_store",
      status: inv.status || "ISSUED",
      signatureUrl: inv.signature_url || undefined,
      cancelledAt: inv.cancelled_at || undefined,
      cancelledBy: inv.cancelled_by || undefined,
      cancellationReason: inv.cancellation_reason || undefined,
      createdBy: inv.created_by || undefined,
      notes: inv.notes,
      syncStatus: "SYNCED",
      isTemporary: false,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }));

    // Authoritatively sync into local store
    PalakInvoiceStore.syncInvoicesFromCloud(mapped);

    if (validOrderCodes) {
      return PalakInvoiceStore.pruneOrphanedInvoices(validOrderCodes);
    }

    return mapped;
  } catch (err) {
    console.warn("getStaffInvoices exception, reconciling local store:", err);
    if (validOrderCodes) {
      return PalakInvoiceStore.pruneOrphanedInvoices(validOrderCodes);
    }
    return PalakInvoiceStore.getAllLocalInvoices();
  }
}

export async function getInvoiceByOrderCode(
  orderCode: string,
  phone?: string
): Promise<StoredInvoice | null> {
  const cleanCode = orderCode.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("get_order_invoice", {
        p_order_code: cleanCode,
        p_phone: phone ? phone.trim() : null,
      });

      if (!error && data && data.success && data.invoice) {
        const inv = data.invoice;
        const mapped: StoredInvoice = {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          orderId: inv.order_id,
          orderCode: inv.order_code,
          userId: inv.user_id,
          source: (inv.source as any) || "ONLINE",
          documentType: (inv.document_type as any) || "TAX_INVOICE",
          financialYear: inv.financial_year || "2026-27",
          invoiceDate: inv.invoice_date,
          completionDate: inv.completion_date,
          customerSnapshot: inv.customer_snapshot || {},
          businessSnapshot: inv.business_snapshot || {},
          items: inv.items || [],
          subtotalAmount: Number(inv.subtotal_amount) || 0,
          discountAmount: Number(inv.discount_amount) || 0,
          taxableAmount: Number(inv.taxable_amount) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          deliveryFee: Number(inv.delivery_fee) || 0,
          otherCharges: Number(inv.other_charges) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          amountPaid: Number(inv.amount_paid) || 0,
          amountDue: Number(inv.amount_due) || 0,
          paymentStatus: inv.payment_status || "pending",
          paymentMethod: inv.payment_method || "pay_at_store",
          status: inv.status || "ISSUED",
          signatureUrl: inv.signature_url || undefined,
          cancelledAt: inv.cancelled_at || undefined,
          cancelledBy: inv.cancelled_by || undefined,
          cancellationReason: inv.cancellation_reason || undefined,
          createdBy: inv.created_by || undefined,
          notes: inv.notes,
          syncStatus: "SYNCED",
          isTemporary: false,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        };
        PalakInvoiceStore.saveInvoiceToLocal(mapped);
        return mapped;
      }

      // If invoice was not yet created in public.invoices, try idempotent creation via RPC
      const { data: createData, error: createErr } = await supabase.rpc("create_or_regenerate_invoice", {
        p_order_code: cleanCode,
        p_force_regenerate: false,
        p_performed_by: "Customer Dashboard",
        p_reason: "Invoice requested by customer",
      });

      if (!createErr && createData && createData.success && createData.invoice) {
        const inv = createData.invoice;
        const mapped: StoredInvoice = {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          orderId: inv.order_id,
          orderCode: inv.order_code,
          userId: inv.user_id,
          source: (inv.source as any) || "ONLINE",
          documentType: (inv.document_type as any) || "TAX_INVOICE",
          financialYear: inv.financial_year || "2026-27",
          invoiceDate: inv.invoice_date,
          completionDate: inv.completion_date,
          customerSnapshot: inv.customer_snapshot || {},
          businessSnapshot: inv.business_snapshot || {},
          items: inv.items || [],
          subtotalAmount: Number(inv.subtotal_amount) || 0,
          discountAmount: Number(inv.discount_amount) || 0,
          taxableAmount: Number(inv.taxable_amount) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          deliveryFee: Number(inv.delivery_fee) || 0,
          otherCharges: Number(inv.other_charges) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          amountPaid: Number(inv.amount_paid) || 0,
          amountDue: Number(inv.amount_due) || 0,
          paymentStatus: inv.payment_status || "pending",
          paymentMethod: inv.payment_method || "pay_at_store",
          status: inv.status || "ISSUED",
          signatureUrl: inv.signature_url || undefined,
          cancelledAt: inv.cancelled_at || undefined,
          cancelledBy: inv.cancelled_by || undefined,
          cancellationReason: inv.cancellation_reason || undefined,
          createdBy: inv.created_by || undefined,
          notes: inv.notes,
          syncStatus: "SYNCED",
          isTemporary: false,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        };
        PalakInvoiceStore.saveInvoiceToLocal(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn("Cloud invoice lookup notice:", e);
    }
  }

  // Fallback to local store
  const local = PalakInvoiceStore.getLocalInvoiceByOrderCode(cleanCode);
  return local || null;
}

export async function regenerateStaffInvoice(
  orderCode: string,
  performedBy: string = "Palak Staff ERP",
  reason?: string
): Promise<StoredInvoice | null> {
  const cleanCode = orderCode.trim().toUpperCase();

  // Find local order record
  const localOrder = PalakDataStore.getOrderByCode(cleanCode);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("create_or_regenerate_invoice", {
        p_order_code: cleanCode,
        p_force_regenerate: true,
        p_performed_by: performedBy,
        p_reason: reason || "Admin manual regeneration",
      });

      if (!error && data && data.success && data.invoice) {
        const inv = data.invoice;
        const mapped: StoredInvoice = {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          orderId: inv.order_id,
          orderCode: inv.order_code,
          userId: inv.user_id,
          source: (inv.source as any) || "ONLINE",
          documentType: (inv.document_type as any) || "TAX_INVOICE",
          financialYear: inv.financial_year || "2026-27",
          invoiceDate: inv.invoice_date,
          completionDate: inv.completion_date,
          customerSnapshot: inv.customer_snapshot || {},
          businessSnapshot: inv.business_snapshot || {},
          items: inv.items || [],
          subtotalAmount: Number(inv.subtotal_amount) || 0,
          discountAmount: Number(inv.discount_amount) || 0,
          taxableAmount: Number(inv.taxable_amount) || 0,
          taxAmount: Number(inv.tax_amount) || 0,
          deliveryFee: Number(inv.delivery_fee) || 0,
          otherCharges: Number(inv.other_charges) || 0,
          totalAmount: Number(inv.total_amount) || 0,
          amountPaid: Number(inv.amount_paid) || 0,
          amountDue: Number(inv.amount_due) || 0,
          paymentStatus: inv.payment_status || "pending",
          paymentMethod: inv.payment_method || "pay_at_store",
          status: inv.status || "ISSUED",
          signatureUrl: inv.signature_url || undefined,
          cancelledAt: inv.cancelled_at || undefined,
          cancelledBy: inv.cancelled_by || undefined,
          cancellationReason: inv.cancellation_reason || undefined,
          createdBy: inv.created_by || undefined,
          notes: inv.notes,
          syncStatus: "SYNCED",
          isTemporary: false,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        };
        PalakInvoiceStore.saveInvoiceToLocal(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Cloud invoice regeneration notice:", err);
    }
  }

  // Fallback to local regeneration engine
  if (localOrder) {
    const res = await PalakInvoiceStore.generateInvoiceForOrder(localOrder, {
      forceRegenerate: true,
      performedBy,
      reason,
    });
    return res.invoice || null;
  }

  return null;
}

// ==============================================================================
// 7. AUDIT LOGGING ENGINE
// ==============================================================================

export interface AdminAuditPayload {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  actionType: string;
  entityType: 'product' | 'service' | 'category' | 'pricing' | 'content' | 'photo' | 'quick_service' | 'settings' | 'order' | string;
  entityId?: string;
  details?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
}

function sanitizeAuditPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeAuditPayload);
  
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'secret', 'token', 'apikey', 'api_key', 'auth_token', 'private_key', 'access_token'];
  
  for (const [k, v] of Object.entries(data)) {
    if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizeAuditPayload(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export async function logAdminAudit(payload: AdminAuditPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const validActorId = isValidSupabaseUUID(payload.actorId) ? payload.actorId : null;
    const enrichedDetails = sanitizeAuditPayload({
      ...(payload.details || {}),
      performed_by: payload.actorName || "Admin Staff",
      role: payload.actorRole || "STAFF",
      previous_value: payload.previousValue !== undefined ? payload.previousValue : undefined,
      new_value: payload.newValue !== undefined ? payload.newValue : undefined,
      timestamp: new Date().toISOString(),
    });

    await supabase.from("audit_logs").insert({
      actor_id: validActorId,
      action_type: payload.actionType,
      entity_type: payload.entityType,
      entity_id: payload.entityId || null,
      details: enrichedDetails,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[Palak Audit Engine] Failed to record audit log:", err);
  }
}

// ==============================================================================
// 8. PRINT JOB ORCHESTRATION & ADMIN PRINT CENTER
// ==============================================================================

const PRINT_JOBS_LOCAL_KEY = "palak_print_jobs_v1";

function getLocalPrintJobs(): PrintJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRINT_JOBS_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPrintJobs(jobs: PrintJob[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRINT_JOBS_LOCAL_KEY, JSON.stringify(jobs));
  } catch (e) {
    console.warn("Local print jobs cache note:", e);
  }
}

export async function getPrintJobs(): Promise<PrintJob[]> {
  const localList = getLocalPrintJobs();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from("print_jobs")
      .select("id, order_id, order_code, customer_name, customer_phone, status, items, overrides, audit_logs, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getPrintJobs error, returning local cache:", error.message);
      return localList;
    }

    const mapped: PrintJob[] = (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      orderCode: row.order_code,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      status: row.status,
      items: Array.isArray(row.items) ? row.items : [],
      overrides: Array.isArray(row.overrides) ? row.overrides : [],
      auditLogs: Array.isArray(row.audit_logs) ? row.audit_logs : [],
      createdByName: row.created_by_name,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    saveLocalPrintJobs(mapped);
    return mapped;
  } catch (err) {
    console.warn("getPrintJobs exception, returning local cache:", err);
    return localList;
  }
}

export async function getPrintJobByOrderCode(orderCode: string): Promise<PrintJob | null> {
  const clean = orderCode.trim().toUpperCase();
  const allJobs = await getPrintJobs();
  const found = allJobs.find((j) => j.orderCode.toUpperCase() === clean);
  return found || null;
}

export async function createOrUpdatePrintJob(
  jobData: Partial<PrintJob> & { orderId: string; orderCode: string; customerName: string; customerPhone: string }
): Promise<PrintJob | null> {
  const localJobs = getLocalPrintJobs();
  const existingIdx = localJobs.findIndex((j) => j.orderCode.toUpperCase() === jobData.orderCode.toUpperCase());

  const newJob: PrintJob = {
    id: jobData.id || (existingIdx !== -1 ? localJobs[existingIdx].id : `pj_${Date.now()}`),
    orderId: jobData.orderId,
    orderCode: jobData.orderCode,
    customerName: jobData.customerName,
    customerPhone: jobData.customerPhone,
    status: jobData.status || (existingIdx !== -1 ? localJobs[existingIdx].status : "PENDING"),
    items: jobData.items || (existingIdx !== -1 ? localJobs[existingIdx].items : []),
    overrides: jobData.overrides || (existingIdx !== -1 ? localJobs[existingIdx].overrides : []),
    auditLogs: jobData.auditLogs || (existingIdx !== -1 ? localJobs[existingIdx].auditLogs : []),
    createdByName: jobData.createdByName || "Admin Staff",
    startedAt: jobData.startedAt,
    completedAt: jobData.completedAt,
    createdAt: existingIdx !== -1 ? localJobs[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    localJobs[existingIdx] = newJob;
  } else {
    localJobs.unshift(newJob);
  }
  saveLocalPrintJobs(localJobs);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("print_jobs")
        .upsert(
          {
            order_id: jobData.orderId,
            order_code: jobData.orderCode,
            customer_name: jobData.customerName,
            customer_phone: jobData.customerPhone,
            status: newJob.status,
            items: newJob.items as any,
            overrides: newJob.overrides as any,
            audit_logs: newJob.auditLogs as any,
            created_by_name: newJob.createdByName,
            started_at: newJob.startedAt,
            completed_at: newJob.completedAt,
            updated_at: newJob.updatedAt,
          },
          { onConflict: "order_id" }
        )
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          orderId: data.order_id,
          orderCode: data.order_code,
          customerName: data.customer_name,
          customerPhone: data.customer_phone,
          status: data.status,
          items: data.items || [],
          overrides: data.overrides || [],
          auditLogs: data.audit_logs || [],
          createdByName: data.created_by_name,
          startedAt: data.started_at,
          completedAt: data.completed_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn("createOrUpdatePrintJob cloud sync notice:", err);
    }
  }

  return newJob;
}

export const VALID_PRINT_JOB_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  PENDING: ["READY_TO_PRINT", "CANCELLED"],
  READY_TO_PRINT: ["PRINTING", "PENDING", "CANCELLED"],
  PRINTING: ["PRINTED", "FAILED", "READY_TO_PRINT", "CANCELLED"],
  PRINTED: ["QUALITY_CHECK", "PRINTING", "FAILED", "CANCELLED"],
  QUALITY_CHECK: ["READY", "PRINTING", "FAILED", "CANCELLED"],
  READY: ["COMPLETED", "QUALITY_CHECK", "CANCELLED"],
  FAILED: ["READY_TO_PRINT", "PRINTING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updatePrintJobStatus(
  orderCode: string,
  newStatus: PrintJobStatus,
  performedBy: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const jobs = getLocalPrintJobs();
  const idx = jobs.findIndex((j) => j.orderCode.toUpperCase() === orderCode.trim().toUpperCase());
  const currentStatus: PrintJobStatus = idx !== -1 ? jobs[idx].status : "PENDING";
  const now = new Date().toISOString();

  // Validate state transition
  if (currentStatus !== newStatus) {
    const allowed = VALID_PRINT_JOB_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      const msg = `Invalid print job status transition from ${currentStatus} to ${newStatus}.`;
      console.warn(`[updatePrintJobStatus] ${msg}`);
      return { success: false, error: msg };
    }
  }

  const auditEntry: PrintAuditLog = {
    id: `log_${Date.now()}`,
    jobId: idx !== -1 ? jobs[idx].id : `pj_${Date.now()}`,
    orderCode,
    action: `STATUS_CHANGED_${newStatus}`,
    performedBy: performedBy || "Admin Staff",
    timestamp: now,
    notes: notes || `Print job status transitioned from ${currentStatus} to ${newStatus}`,
  };

  if (idx !== -1) {
    jobs[idx].status = newStatus;
    jobs[idx].updatedAt = now;
    if (newStatus === "PRINTING" && !jobs[idx].startedAt) {
      jobs[idx].startedAt = now;
    }
    if ((newStatus === "COMPLETED" || newStatus === "PRINTED") && !jobs[idx].completedAt) {
      jobs[idx].completedAt = now;
    }
    jobs[idx].auditLogs = [auditEntry, ...(jobs[idx].auditLogs || [])];
    saveLocalPrintJobs(jobs);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: currentJob } = await supabase
        .from("print_jobs")
        .select("id, status, audit_logs")
        .eq("order_code", orderCode.trim().toUpperCase())
        .maybeSingle();

      if (currentJob?.id) {
        const dbStatus = (currentJob.status as PrintJobStatus) || "PENDING";
        if (dbStatus !== newStatus && !VALID_PRINT_JOB_TRANSITIONS[dbStatus]?.includes(newStatus)) {
          return { success: false, error: `Database rejected transition from ${dbStatus} to ${newStatus}` };
        }

        const existingLogs = Array.isArray(currentJob.audit_logs) ? currentJob.audit_logs : [];
        const updatePayload: Record<string, any> = {
          status: newStatus,
          audit_logs: [auditEntry, ...existingLogs],
          updated_at: now,
        };
        if (newStatus === "PRINTING") updatePayload.started_at = now;
        if (newStatus === "COMPLETED" || newStatus === "PRINTED") updatePayload.completed_at = now;

        await supabase
          .from("print_jobs")
          .update(updatePayload)
          .eq("id", currentJob.id);
      }
    } catch (err: any) {
      console.warn("updatePrintJobStatus notice:", err);
    }
  }

  return { success: true };
}

export async function addPrintJobOverride(
  orderCode: string,
  override: AdminPrintOverride,
  performedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!override.reason || !override.reason.trim()) {
    return { success: false, error: "Override reason is strictly required." };
  }

  const jobs = getLocalPrintJobs();
  const idx = jobs.findIndex((j) => j.orderCode.toUpperCase() === orderCode.trim().toUpperCase());
  const now = new Date().toISOString();

  const auditEntry: PrintAuditLog = {
    id: `log_${Date.now()}`,
    jobId: idx !== -1 ? jobs[idx].id : `pj_${Date.now()}`,
    orderCode,
    action: "ADMIN_OVERRIDE",
    performedBy: performedBy || "Admin Staff",
    timestamp: now,
    notes: `Changed ${override.field} for ${override.fileName} from "${String(override.requestedValue)}" to "${String(override.actualValue)}". Reason: ${override.reason.trim()}`,
    details: { override },
  };

  if (idx !== -1) {
    jobs[idx].overrides = [override, ...(jobs[idx].overrides || [])];
    jobs[idx].auditLogs = [auditEntry, ...(jobs[idx].auditLogs || [])];
    jobs[idx].updatedAt = now;
    saveLocalPrintJobs(jobs);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: currentJob } = await supabase
        .from("print_jobs")
        .select("id, overrides, audit_logs")
        .eq("order_code", orderCode.trim().toUpperCase())
        .maybeSingle();

      if (currentJob?.id) {
        const existingOverrides = Array.isArray(currentJob.overrides) ? currentJob.overrides : [];
        const existingLogs = Array.isArray(currentJob.audit_logs) ? currentJob.audit_logs : [];

        await supabase
          .from("print_jobs")
          .update({
            overrides: [override, ...existingOverrides],
            audit_logs: [auditEntry, ...existingLogs],
            updated_at: now,
          })
          .eq("id", currentJob.id);
      }
    } catch (err: any) {
      console.warn("addPrintJobOverride notice:", err);
    }
  }

  return { success: true };
}