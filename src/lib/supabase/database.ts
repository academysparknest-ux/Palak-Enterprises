import { supabase, isSupabaseConfigured } from "./client";
import {
  CATEGORIES as LOCAL_CATEGORIES,
  PRODUCTS as LOCAL_PRODUCTS,
  DIGITAL_SERVICES as LOCAL_SERVICES,
  type LocalProduct,
  type LocalService,
  type LocalCategory,
} from "../storage/catalogData";
import { PalakDataStore, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest, type OrderItemPayload } from "../storage/store";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";

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
}

// ==============================================================================
// 1. PUBLIC CATALOG DATA FETCHERS (Database-Driven with Safe Local Fallback)
// ==============================================================================

export async function getCategories(): Promise<LocalCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return LOCAL_CATEGORIES;
  }
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return LOCAL_CATEGORIES;
    }

    return data.map((c) => ({
      id: c.id,
      name: { en: c.name_en, hi: c.name_hi },
      description: { en: c.description_en || "", hi: c.description_hi || "" },
      iconName: c.icon_name || "Printer",
      categoryType: c.category_type,
      badge: c.badge_en ? { en: c.badge_en, hi: c.badge_hi || c.badge_en } : undefined,
      count: 0,
    }));
  } catch {
    return LOCAL_CATEGORIES;
  }
}

export async function getProducts(): Promise<LocalProduct[]> {
  if (!isSupabaseConfigured || !supabase) {
    return LOCAL_PRODUCTS;
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
      return LOCAL_PRODUCTS;
    }

    return data.map((p) => {
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
      const localMatch = LOCAL_PRODUCTS.find((lp) => lp.id === p.id || lp.slug === p.slug);

      return {
        id: p.id,
        slug: p.slug,
        categoryId: p.category_id,
        categoryType: p.category_type || "printing",
        name: { en: p.name_en, hi: p.name_hi },
        shortDesc: { en: p.short_desc_en || "", hi: p.short_desc_hi || "" },
        description: { en: p.description_en, hi: p.description_hi },
        startingPrice: Number(p.starting_price) || 0,
        baseQuantity: p.base_quantity || 1,
        unit: p.unit || "Pcs",
        imageUrl: p.image_url || localMatch?.imageUrl || "/images/gallery/visiting-cards-sample.svg",
        galleryUrls: p.gallery_urls && p.gallery_urls.length > 0 ? p.gallery_urls : localMatch?.galleryUrls || [],
        isFeatured: Boolean(p.is_featured),
        isPopular: Boolean(p.is_popular),
        isNew: Boolean(p.is_new),
        turnaroundTime: { en: p.turnaround_time_en || "24-48 Hours", hi: p.turnaround_time_hi || "24-48 घंटे" },
        tags: p.tags || [],
        options: options.length > 0 ? options : localMatch?.options || [],
        specifications: p.specifications || localMatch?.specifications || {},
      };
    });
  } catch {
    return LOCAL_PRODUCTS;
  }
}

export async function getServices(): Promise<LocalService[]> {
  if (!isSupabaseConfigured || !supabase) {
    return LOCAL_SERVICES;
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return LOCAL_SERVICES;
    }

    return data.map((s) => {
      const localMatch = LOCAL_SERVICES.find((ls) => ls.id === s.id || ls.slug === s.slug);
      return {
        id: s.id,
        slug: s.slug,
        categoryId: s.category_id,
        name: { en: s.name_en, hi: s.name_hi },
        shortDesc: { en: s.short_desc_en || "", hi: s.short_desc_hi || "" },
        description: { en: s.description_en, hi: s.description_hi },
        estimatedFee: Number(s.estimated_fee) || 0,
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
  } catch {
    return LOCAL_SERVICES;
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

export async function getStaffOrders(): Promise<StoredOrder[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("getStaffOrders query notice:", error.message || error);
    throw error;
  }

  return (data || []).map((o: any) => {
    let orderItems: OrderItemPayload[] = [];
    if (Array.isArray(o.items) && o.items.length > 0) {
      orderItems = o.items;
    } else if (Array.isArray(o.order_items) && o.order_items.length > 0) {
      orderItems = o.order_items.map((it: any) => ({
        productId: it.product_id || "service",
        productName: it.product_name,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || 0,
        totalPrice: Number(it.total_price) || 0,
        selectedOptions: it.selected_options || {},
        selectedOptionsLabels: it.selected_options_labels || {},
        uploadedFileName: it.uploaded_file_name,
        uploadedFileUrl: it.uploaded_file_url,
        designAssistanceRequested: Boolean(it.design_assistance_requested),
        designNotes: it.design_notes,
      }));
    }

    return {
      id: o.id,
      orderCode: o.order_code,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerEmail: o.customer_email,
      fulfillmentType: o.fulfillment_type || "pickup",
      deliveryAddress: o.delivery_address,
      orderNotes: o.order_notes,
      subtotalAmount: Number(o.subtotal_amount) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      totalAmount: Number(o.total_amount) || 0,
      paymentMethod: o.payment_method || "pay_at_store",
      paymentStatus: o.payment_status || "pending",
      orderStatus: o.order_status || "NEW",
      items: orderItems,
      staffNotes: o.staff_notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    };
  });
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
  expiresIn = 60 * 60 * 24 * 7,
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
    const { data } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(cleanPath, expiresIn, options as any);

    if (data?.signedUrl) {
      return data.signedUrl;
    }

    // Fallback to public URL if available
    const { data: publicData } = supabase.storage
      .from("customer-documents")
      .getPublicUrl(cleanPath);

    if (publicData?.publicUrl) {
      return publicData.publicUrl;
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
        // Generate signed URL valid for 7 days
        const { data: signedData } = await supabase.storage
          .from("customer-documents")
          .createSignedUrl(filePath, 60 * 60 * 24 * 7);

        const { data: publicData } = supabase.storage
          .from("customer-documents")
          .getPublicUrl(filePath);

        return {
          url: signedData?.signedUrl || publicData?.publicUrl || filePath,
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

export async function getPrintPricingConfig(): Promise<PrintPricingConfig> {
  if (!isSupabaseConfigured || !supabase) {
    return DEFAULT_PRINT_PRICING;
  }
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("value")
      .eq("key", "print_pricing_config")
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_PRINT_PRICING;
    }
    return { ...DEFAULT_PRINT_PRICING, ...data.value };
  } catch {
    return DEFAULT_PRINT_PRICING;
  }
}

export async function updatePrintPricingConfig(config: PrintPricingConfig): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from("business_settings")
      .upsert({
        key: "print_pricing_config",
        value: config as any,
        description: "Authoritative pricing configuration for instant online printing services",
        updated_at: new Date().toISOString(),
      });
    return !error;
  } catch {
    return false;
  }
}

export async function submitPrintOrder(
  payload: PrintOrderPayload
): Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }> {
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
      storagePath: payload.file?.storagePath,
    },
    selectedOptionsLabels: payload.optionsLabels || {},
    uploadedFileName: payload.file?.name,
    uploadedFileUrl: payload.file?.url,
    designNotes: payload.instructions,
  };

  // 1. Sync with local store for resilience
  try {
    PalakDataStore.createOrder({
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
    });
  } catch (e) {
    console.warn("Local store fallback sync notice:", e);
  }

  // 2. Persist to Supabase Database (Authoritative Source of Truth)
  let orderId: string | undefined = undefined;

  if (isSupabaseConfigured && supabase) {
    try {
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

      if (payload.userId) {
        insertPayload.user_id = payload.userId;
      }

      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select()
        .single();

      if (orderErr) {
        console.warn("Supabase order insert error:", orderErr);
      } else if (orderData) {
        orderId = orderData.id;

        // Insert into order_items table
        const { data: itemData } = await supabase.from("order_items").insert({
          order_id: orderData.id,
          product_name: payload.serviceName,
          quantity: Number(payload.options.copies) || Number(payload.options.quantity) || 1,
          unit_price: payload.pricingSnapshot.unitPrice,
          total_price: payload.pricingSnapshot.totalAmount,
          selected_options: orderItem.selectedOptions,
          selected_options_labels: orderItem.selectedOptionsLabels,
          uploaded_file_name: payload.file?.name,
          uploaded_file_url: payload.file?.url,
        }).select("id").maybeSingle();

        // Insert into order_files table if file exists
        if (payload.file?.url || payload.file?.storagePath || payload.file?.name) {
          try {
            await supabase.from("order_files").insert({
              order_id: orderData.id,
              order_item_id: itemData?.id || null,
              file_name: payload.file.name || "Customer Upload",
              file_path: payload.file.storagePath || payload.file.url || "",
              file_url: payload.file.url || "",
              file_type: "document",
              uploaded_by: payload.customerName,
            });
          } catch (fileErr) {
            console.warn("order_files insert notice:", fileErr);
          }
        }

        // Insert status history entry
        await supabase.from("status_history").insert({
          entity_type: "order",
          entity_code: orderCode,
          new_status: "NEW",
          message_en: `Print order received online for ${payload.serviceName}.`,
          message_hi: `${payload.serviceName} के लिए ऑनलाइन प्रिंट ऑर्डर प्राप्त हुआ।`,
          performed_by: "Online Customer",
        });
      }
    } catch (dbErr) {
      console.error("Supabase insert exception:", dbErr);
    }
  }

  return { success: true, orderCode, orderId };
}