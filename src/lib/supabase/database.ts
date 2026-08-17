import { supabase, isSupabaseConfigured } from "./client";
import {
  CATEGORIES as LOCAL_CATEGORIES,
  PRODUCTS as LOCAL_PRODUCTS,
  DIGITAL_SERVICES as LOCAL_SERVICES,
  type LocalProduct,
  type LocalService,
  type LocalCategory,
} from "../storage/catalogData";
import type { StoredOrder, StoredServiceRequest, StoredQuoteRequest } from "../storage/store";

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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((o) => ({
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
  const { error } = await supabase
    .from("orders")
    .update({
      order_status: newStatus,
      staff_notes: staffNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode);

  if (error) throw error;

  // Insert status history entry
  await supabase.from("status_history").insert({
    entity_type: "order",
    entity_code: orderCode,
    new_status: newStatus,
    message_en: `Order status updated to ${newStatus}`,
    message_hi: `ऑर्डर स्थिति ${newStatus} में अपडेट हुई`,
    performed_by: "Palak Staff ERP",
  });
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