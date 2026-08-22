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

/** Returns true only for valid UUID strings that can be stored in Supabase user_id columns */
function isValidSupabaseUUID(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface PrintOrderPayload {
  serviceId: "document-printing" | "passport-photo" | "visiting-cards" | "id-cards" | "poster-banner" | "custom-print" | "invitation-cards" | string;
  serviceName: string;
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
      .select("*")
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
      .select("*")
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
    .select("*")
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
    .select("*")
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
      .select("*")
      .eq("entity_code", orderCode)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getUserOrders(userId?: string, phone?: string): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    let query = supabase.from("orders").select("*");
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (phone) {
      query = query.eq("customer_phone", phone.trim());
    } else {
      return [];
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error || !data) return [];

    return data.map((o) => ({
      id: o.id,
      orderCode: o.order_code,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerEmail: o.customer_email,
      fulfillmentType: o.fulfillment_type,
      deliveryAddress: o.delivery_address,
      orderNotes: o.order_notes,
      subtotalAmount: Number(o.subtotal_amount) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      totalAmount: Number(o.total_amount) || 0,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      orderStatus: o.order_status,
      items: o.items || [],
      staffNotes: o.staff_notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
  } catch {
    return [];
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

export async function uploadOrderFile(
  file: File,
  orderCode: string
): Promise<{ url: string; storagePath: string } | null> {
  if (!file) return null;

  // 1. Attempt upload to Supabase Storage if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split(".").pop() || "dat";
      const filePath = `orders/${orderCode}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from("customer-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error) {
        // Fast-path: Synchronously resolve public/storage URL (signed URLs are resolved on-demand when viewed in Admin)
        const { data: publicUrlData } = supabase.storage
          .from("customer-documents")
          .getPublicUrl(filePath);

        return {
          url: publicUrlData?.publicUrl || filePath,
          storagePath: filePath,
        };
      } else {
        console.warn("Storage upload error, generating offline/local data fallback:", error);
      }
    } catch (err) {
      console.error("Storage upload exception, generating offline/local data fallback:", err);
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
      return {
        url: dataUrl,
        storagePath: `local/${file.name}`,
      };
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

// In-flight idempotency mutex map to eliminate duplicate submissions from rapid clicks or concurrent attempts
const inFlightPrintSubmissions = new Map<string, Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }>>();

export async function submitPrintOrder(
  payload: PrintOrderPayload
): Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }> {
  const markStart = `print_order_submit_start_${Date.now()}`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(markStart);
  }

  // Generate idempotency signature based on customer, service, total and timestamp window
  const subKey = `${payload.customerPhone.trim()}_${payload.serviceId}_${payload.pricingSnapshot.totalAmount}_${payload.instructions || ""}`;
  if (inFlightPrintSubmissions.has(subKey)) {
    console.warn("[submitPrintOrder] Deduplicating in-flight order submission:", subKey);
    return inFlightPrintSubmissions.get(subKey)!;
  }

  const executionPromise = (async () => {
    const orderCode = generatePrintOrderCode();

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
      quantity: Number(payload.options.copies) || Number(payload.options.quantity) || 1,
      unitPrice: payload.pricingSnapshot.unitPrice,
      totalPrice: payload.pricingSnapshot.totalAmount,
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

    // 1. Save to localStorage for instant local durability
    try {
      PalakDataStore.saveOrderToLocal({
        orderCode,
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
        staffNotes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
        queueType: queueMeta.queueType,
        queuePriority: queueMeta.queuePriority,
        submittedAt: queueMeta.submittedAt,
        priorityAt: queueMeta.priorityAt,
      });
    } catch (e) {
      console.warn("Local store fallback sync notice:", e);
    }

    // 2. Persist to Supabase Database (Authoritative Source of Truth: 1 Atomic RPC Round-Trip)
    let orderId: string | undefined = undefined;

    if (isSupabaseConfigured && supabase) {
      try {
        const validUserId = isValidSupabaseUUID(payload.userId) ? payload.userId : null;

        // Primary Path: Atomic SECURITY DEFINER RPC (1 single round-trip)
        const { data: rpcData, error: rpcErr } = await supabase.rpc("create_online_print_order", {
          p_order_code: orderCode,
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
          p_staff_notes: `Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
          p_items: [orderItem] as any,
          p_files: allFiles.map((f) => ({
            name: f.name,
            path: f.storagePath || f.url || "",
            url: f.url || "",
            type: f.mimeType || "application/pdf",
            size: f.size || 0,
          })) as any,
        });

        if (!rpcErr && rpcData && rpcData.orderId) {
          orderId = rpcData.orderId;
        } else if (rpcErr) {
          console.warn("create_online_print_order RPC notice, attempting fallback insert:", rpcErr);

          // Fallback: direct table insert
          const insertPayload: any = {
            order_code: orderCode,
            customer_name: payload.customerName,
            customer_phone: payload.customerPhone,
            customer_email: payload.customerEmail || null,
            fulfillment_type: "pickup",
            order_notes: payload.instructions || null,
            subtotal_amount: payload.pricingSnapshot.subtotal,
            total_amount: payload.pricingSnapshot.totalAmount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            order_status: "NEW",
            items: [orderItem],
            staff_notes: `Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
          };
          if (validUserId) insertPayload.user_id = validUserId;

          await supabase.from("orders").insert(insertPayload);
        }
      } catch (dbErr) {
        console.error("Supabase insert exception:", dbErr);
      }
    }

    if (typeof performance !== "undefined" && performance.mark && performance.measure) {
      const markEnd = `print_order_submit_end_${Date.now()}`;
      performance.mark(markEnd);
      try {
        performance.measure("print_order_submission_duration", markStart, markEnd);
        const entries = performance.getEntriesByName("print_order_submission_duration");
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          console.log(`⚡ [Performance] Print order ${orderCode} submission completed in ${Math.round(lastEntry.duration)}ms`);
        }
      } catch {}
    }

    return { success: true, orderCode, orderId };
  })();

  inFlightPrintSubmissions.set(subKey, executionPromise);
  setTimeout(() => {
    inFlightPrintSubmissions.delete(subKey);
  }, 4000);

  try {
    return await executionPromise;
  } finally {
    inFlightPrintSubmissions.delete(subKey);
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
      .select("*")
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