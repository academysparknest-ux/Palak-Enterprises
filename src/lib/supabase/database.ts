import { supabase, isSupabaseConfigured } from "./client";
import { executeWithAuthRetry } from "./authSession";
import {
  PRODUCTS as LOCAL_PRODUCTS,
  DIGITAL_SERVICES as LOCAL_SERVICES,
  type LocalProduct,
  type LocalService,
  type LocalCategory,
} from "../storage/catalogData";
import { PalakDataStore, normalizeOrder, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest } from "../storage/store";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import { calculateDocumentPrintPriceComplete } from "../pricing/printPricingEngine";
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
import { dispatchNewOrderLocally } from "../realtime/adminOrderEvents";
import {
  validateQuickServiceFileSize,
  QUICK_SERVICE_MAX_FILE_SIZE_MB,
} from "../../config/quickServiceConfig";

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
  console.debug("[API] categories:start");
  const localList = PalakDataStore.getCategories();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
        .from("categories")
        .select("id, name_en, name_hi, description_en, description_hi, icon_name, category_type, badge_en, badge_hi, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    }, 1, "get_categories");

    if (!data || data.length === 0) {
      return localList;
    }

    const dbCategories = data.map((c: any) => ({
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
  console.debug("[API] products:start");
  const localList = PalakDataStore.getProducts();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
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

      if (error) throw error;
      return data;
    }, 1, "get_products");

    if (!data || data.length === 0) {
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
  console.debug("[API] services:start");
  const localList = PalakDataStore.getDigitalServices();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
        .from("services")
        .select("id, slug, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, estimated_fee, processing_time_en, processing_time_hi, required_documents_en, required_documents_hi, who_needs_it_en, who_needs_it_hi, important_instructions_en, important_instructions_hi, official_portal_name, disclaimer_en, disclaimer_hi, icon_name, is_featured, is_popular, tags, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    }, 1, "get_services");

    if (!data || data.length === 0) {
      return localList;
    }

    const dbServices: LocalService[] = (data as any[]).map((s) => {
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
  console.debug("[API] orders:start");
  if (!isSupabaseConfigured || !supabase) {
    return PalakDataStore.getOrders();
  }

  try {
    const data = await executeWithAuthRetry(async (client) => {
      let query = client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit > 0) {
        query = query.limit(limit);
      }

      const timeoutPromise = new Promise<{ data: any[]; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: [], error: null }), 3000)
      );

      const res = await Promise.race([query, timeoutPromise]);
      if (res.error) throw res.error;
      return res.data || [];
    });

    const normalizedList: StoredOrder[] = [];
    (data || []).forEach((row: any) => {
      try {
        normalizedList.push(normalizeOrder(row));
      } catch (e) {
        console.warn("Row normalization notice for order:", row?.id || row?.order_code, e);
      }
    });

    // Cloud database is authoritative for staff orders
    PalakDataStore.syncOrdersFromCloud(normalizedList);
    return normalizedList;
  } catch (queryError: any) {
    console.warn("getStaffOrders database notice:", queryError?.message || queryError);
    return PalakDataStore.getOrders();
  }
}

export async function getStaffOrderByCodeOrId(codeOrId: string): Promise<StoredOrder | null> {
  if (!codeOrId) return null;

  const normalizedCode = codeOrId.trim().toUpperCase();
  const localMatch =
    PalakDataStore.getOrderByCode(codeOrId) ||
    PalakDataStore.getOrders().find(
      (o) => o.id === codeOrId || o.orderCode?.trim().toUpperCase() === normalizedCode
    ) ||
    null;

  if (!isSupabaseConfigured || !supabase) {
    return localMatch;
  }

  try {
    const cloudOrder = await executeWithAuthRetry(async (client) => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(codeOrId);
      let query = client.from("orders").select("*");
      if (isUUID) {
        query = query.eq("id", codeOrId);
      } else {
        query = query.eq("order_code", normalizedCode);
      }

      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: null }), 3000)
      );
      const { data, error } = await Promise.race([query.maybeSingle(), timeoutPromise]);
      if (error || !data) return null;
      return mapOrderRowToStoredOrder(data);
    });

    if (cloudOrder) {
      PalakDataStore.syncOrdersFromCloud([cloudOrder]);
      return cloudOrder;
    }
    return localMatch;
  } catch (err) {
    console.warn("getStaffOrderByCodeOrId query notice:", err);
    return localMatch;
  }
}

export async function getStaffServiceRequests(limit: number = 200): Promise<StoredServiceRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
        .from("service_requests")
        .select("id, request_code, service_id, service_name, customer_name, customer_phone, customer_email, preferred_contact, applicant_details, uploaded_document_urls, uploaded_document_names, additional_notes, estimated_fee, request_status, acknowledgement_number, staff_notes, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });

    return (data || []).map((s: any) => ({
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
  } catch (err) {
    console.warn("getStaffServiceRequests notice:", err);
    return [];
  }
}

export async function getStaffQuoteRequests(limit: number = 200): Promise<StoredQuoteRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
        .from("quote_requests")
        .select("id, quote_code, service_or_product_type, quantity, size_specifications, material_preferences, sample_image_urls, special_instructions, required_by_date, design_status, reference_file_urls, reference_file_names, additional_details, customer_name, customer_phone, customer_email, preferred_contact, business_name, timeline_requirement, estimated_budget, quoted_amount, quote_status, staff_notes, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    });

    return (data || []).map((q: any) => ({
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
  } catch (err) {
    console.warn("getStaffQuoteRequests notice:", err);
    return [];
  }
}

// ─── Focused Dashboard Queries ────────────────────────────────────────────────

export interface DashboardRecentOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone?: string;
  service_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardOrderMetrics {
  totalOrders: number;
  newOrders: number;
  inProduction: number;
  readyForPickup: number;
  totalRevenue: number;
  todaysOrders: number;
}

/**
 * High-performance focused query for Dashboard Recent Orders.
 * Fetches only the latest N orders (default 6) and only the 8 columns required for display.
 */
export async function getDashboardRecentOrders(limit: number = 6): Promise<DashboardRecentOrder[]> {
  const mapRowToRecent = (row: any): DashboardRecentOrder => {
    let serviceName = "Print Order";
    try {
      const itemsArr = Array.isArray(row.items) ? row.items : [];
      if (itemsArr.length > 0) {
        const first = itemsArr[0];
        const rawName = first?.productName || first?.name || "Print Service";
        const qty = Number(first?.quantity) || 1;
        serviceName = qty > 1 ? `${rawName} (${qty}x)` : rawName;
        if (itemsArr.length > 1) {
          serviceName += ` + ${itemsArr.length - 1} more`;
        }
      }
    } catch {}

    return {
      id: String(row.id || row.order_code || row.orderCode),
      order_code: row.order_code || row.orderCode || "ORD-NEW",
      customer_name: row.customer_name || row.customerName || (row.customer_phone || row.customerPhone ? `Customer (${row.customer_phone || row.customerPhone})` : "Guest Customer"),
      customer_phone: row.customer_phone || row.customerPhone,
      service_name: serviceName,
      total_amount: Math.max(0, Number(row.total_amount ?? row.totalAmount) || 0),
      status: row.order_status || row.orderStatus || "NEW",
      created_at: row.created_at || row.createdAt || new Date().toISOString(),
    };
  };

  if (!isSupabaseConfigured || !supabase) {
    const localOrders = PalakDataStore.getOrders();
    return localOrders.slice(0, limit).map(mapRowToRecent);
  }

  try {
    const data = await executeWithAuthRetry(async (client) => {
      const { data, error } = await client
        .from("orders")
        .select("id, order_code, customer_name, customer_phone, items, total_amount, order_status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    });

    return (data || []).map(mapRowToRecent);
  } catch (err) {
    console.warn("getDashboardRecentOrders notice, using local fallback:", err);
    const localOrders = PalakDataStore.getOrders();
    return localOrders.slice(0, limit).map(mapRowToRecent);
  }
}

/**
 * High-performance focused query for Dashboard Order KPIs.
 * Queries only scalar columns (order_status, payment_status, total_amount, created_at) with exact count.
 * Completely avoids downloading heavy JSON cart items or addresses.
 */
export async function getDashboardOrderMetrics(): Promise<DashboardOrderMetrics> {
  const computeFromList = (orders: any[], exactTotal?: number | null): DashboardOrderMetrics => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endTimestamp = endOfToday.getTime();

    const totalOrders = exactTotal !== null && exactTotal !== undefined ? exactTotal : orders.length;
    let newOrders = 0;
    let inProduction = 0;
    let readyForPickup = 0;
    let totalRevenue = 0;
    let todaysOrders = 0;

    for (const o of orders) {
      const status = (o.order_status || o.orderStatus || "").toUpperCase();
      const paymentStatus = String(o.payment_status || o.paymentStatus || "").toLowerCase();
      const amt = Number(o.total_amount ?? o.totalAmount) || 0;
      const createdAt = o.created_at || o.createdAt;
      const time = createdAt ? new Date(createdAt).getTime() : 0;

      if (status === "NEW" || status === "UNDER_REVIEW") {
        newOrders++;
      } else if (
        status === "IN_PRODUCTION" ||
        status === "DESIGN_REVIEW" ||
        status === "APPROVED" ||
        status === "PROCESSING"
      ) {
        inProduction++;
      } else if (status === "READY_FOR_PICKUP" || status === "OUT_FOR_DELIVERY") {
        readyForPickup++;
      }

      if ((paymentStatus === "paid" || paymentStatus === "confirmed") && status !== "CANCELLED") {
        totalRevenue += Math.max(0, amt);
      }

      if (time >= todayTimestamp && time <= endTimestamp) {
        todaysOrders++;
      }
    }

    return {
      totalOrders,
      newOrders,
      inProduction,
      readyForPickup,
      totalRevenue,
      todaysOrders,
    };
  };

  if (!isSupabaseConfigured || !supabase) {
    return computeFromList(PalakDataStore.getOrders());
  }

  try {
    const { data, count } = await executeWithAuthRetry(async (client) => {
      const { data, count, error } = await client
        .from("orders")
        .select("order_status, payment_status, total_amount, created_at", { count: "exact" });

      if (error) throw error;
      return { data: data || [], count };
    });

    return computeFromList(data, count);
  } catch (err) {
    console.warn("getDashboardOrderMetrics notice, falling back to local store:", err);
    return computeFromList(PalakDataStore.getOrders());
  }
}

/**
 * Server-side head count query for pending service requests.
 * Zero bytes body payload transferred.
 */
export async function getPendingServiceRequestsCount(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    const local = PalakDataStore.getServiceRequests();
    return local.filter((s) => s.requestStatus !== "COMPLETED" && s.requestStatus !== "REJECTED").length;
  }

  try {
    const count = await executeWithAuthRetry(async (client) => {
      const { count, error } = await client
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .not("request_status", "in", '("COMPLETED","REJECTED")');

      if (error) throw error;
      return count || 0;
    });

    return count;
  } catch (err) {
    console.warn("getPendingServiceRequestsCount notice:", err);
    const local = PalakDataStore.getServiceRequests();
    return local.filter((s) => s.requestStatus !== "COMPLETED" && s.requestStatus !== "REJECTED").length;
  }
}

/**
 * Server-side head count query for pending custom quote inquiries.
 * Zero bytes body payload transferred.
 */
export async function getPendingQuoteRequestsCount(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    const local = PalakDataStore.getQuoteRequests();
    return local.filter(
      (q) => q.quoteStatus === "NEW" || q.quoteStatus === "ESTIMATE_PREPARED" || q.quoteStatus === "QUOTE_SENT"
    ).length;
  }

  try {
    const count = await executeWithAuthRetry(async (client) => {
      const { count, error } = await client
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .in("quote_status", ["NEW", "ESTIMATE_PREPARED", "QUOTE_SENT"]);

      if (error) throw error;
      return count || 0;
    });

    return count;
  } catch (err) {
    console.warn("getPendingQuoteRequestsCount notice:", err);
    const local = PalakDataStore.getQuoteRequests();
    return local.filter(
      (q) => q.quoteStatus === "NEW" || q.quoteStatus === "ESTIMATE_PREPARED" || q.quoteStatus === "QUOTE_SENT"
    ).length;
  }
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

  try {
    await supabase.from("status_history").insert({
      entity_type: "order",
      entity_code: orderCode,
      new_status: `PAYMENT_${paymentStatus.toUpperCase()}`,
      message_en: `Payment status marked as ${paymentStatus.toUpperCase()}`,
      message_hi: `भुगतान स्थिति ${paymentStatus} के रूप में चिह्नित की गई`,
      performed_by: "Palak Staff ERP",
    });
  } catch (historyErr) {
    console.warn("Payment status history insert notice:", historyErr);
  }
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

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode);

  if (orderUpdateError) throw orderUpdateError;

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

  try {
    await supabase.from("status_history").insert({
      entity_type: "order",
      entity_code: orderCode,
      new_status: "PAYMENT_PAID",
      message_en: `Payment of ₹${amount} received via ${paymentMethod.toUpperCase()} (${staffName})`,
      message_hi: `₹${amount} का भुगतान प्राप्त हुआ (${paymentMethod.toUpperCase()})`,
      performed_by: staffName,
    });
  } catch (historyErr) {
    console.warn("Payment received status history insert notice:", historyErr);
  }
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

      return normalizeOrder({
        ...o,
        items: joinedItems,
      });
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
  // Data URLs, Blob URLs can be returned directly
  if (storagePath.startsWith("data:") || storagePath.startsWith("blob:")) {
    return storagePath;
  }
  if (!isSupabaseConfigured || !supabase) return storagePath;
  try {
    let cleanPath = storagePath.trim();
    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      const match = cleanPath.match(/\/storage\/v1\/object\/(?:sign|public)\/customer-documents\/(.+?)(?:\?|$)/);
      if (match && match[1]) {
        cleanPath = decodeURIComponent(match[1]);
      } else {
        return storagePath;
      }
    }
    cleanPath = cleanPath.replace(/^customer-documents\//, "").replace(/^\/+/, "");

    const { data, error } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(cleanPath, expiresIn, options as any);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    if (error) {
      console.warn("[Palak Storage] createSignedUrl notice:", error.message || error);
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

  const sizeValidation = validateQuickServiceFileSize(file);
  if (!sizeValidation.isValid) {
    console.warn(`[uploadOrderFile] Rejection: ${sizeValidation.error}`);
    return null;
  }

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

export const PRINT_PRICING_STORAGE_KEY = "palak_print_pricing_config_v1";

/**
 * Sanitizes numeric price values to ensure they are valid non-negative numbers rounded to 2 decimals.
 */
export function sanitizePriceValue(val: any, fallback: number, min: number = 0): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num < min) return fallback;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Sanitizes multiplier values to ensure they are positive numbers rounded to 2 decimals.
 */
export function sanitizeMultiplierValue(val: any, fallback: number): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num <= 0) return fallback;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Deep merges and sanitizes any partial or unvalidated pricing config against authoritative schema defaults.
 */
export function sanitizeAndMergePrintPricing(
  base: PrintPricingConfig = DEFAULT_PRINT_PRICING,
  source?: any
): PrintPricingConfig {
  if (!source || typeof source !== "object") return JSON.parse(JSON.stringify(base));

  const docBase = base.documentPrinting;
  const docSrc = source.documentPrinting || {};

  return {
    documentPrinting: {
      paperSizes: {
        a4: {
          name: docSrc.paperSizes?.a4?.name || docBase.paperSizes.a4.name,
          multiplier: sanitizeMultiplierValue(docSrc.paperSizes?.a4?.multiplier, docBase.paperSizes.a4.multiplier),
          enabled: docSrc.paperSizes?.a4?.enabled !== undefined ? Boolean(docSrc.paperSizes.a4.enabled) : docBase.paperSizes.a4.enabled,
        },
        a3: {
          name: docSrc.paperSizes?.a3?.name || docBase.paperSizes.a3.name,
          multiplier: sanitizeMultiplierValue(docSrc.paperSizes?.a3?.multiplier, docBase.paperSizes.a3.multiplier),
          enabled: docSrc.paperSizes?.a3?.enabled !== undefined ? Boolean(docSrc.paperSizes.a3.enabled) : docBase.paperSizes.a3.enabled,
        },
        a5: {
          name: docSrc.paperSizes?.a5?.name || docBase.paperSizes.a5.name,
          multiplier: sanitizeMultiplierValue(docSrc.paperSizes?.a5?.multiplier, docBase.paperSizes.a5.multiplier),
          enabled: docSrc.paperSizes?.a5?.enabled !== undefined ? Boolean(docSrc.paperSizes.a5.enabled) : docBase.paperSizes.a5.enabled,
        },
      },
      baseRatePerPage: {
        bwSingle: sanitizePriceValue(docSrc.baseRatePerPage?.bwSingle, docBase.baseRatePerPage.bwSingle),
        bwDouble: sanitizePriceValue(docSrc.baseRatePerPage?.bwDouble, docBase.baseRatePerPage.bwDouble),
        colorSingle: sanitizePriceValue(docSrc.baseRatePerPage?.colorSingle, docBase.baseRatePerPage.colorSingle),
        colorDouble: sanitizePriceValue(docSrc.baseRatePerPage?.colorDouble, docBase.baseRatePerPage.colorDouble),
      },
      finishing: {
        spiralBinding: {
          id: "spiral_binding",
          name: docSrc.finishing?.spiralBinding?.name || docBase.finishing.spiralBinding.name,
          enabled: docSrc.finishing?.spiralBinding?.enabled !== undefined ? Boolean(docSrc.finishing.spiralBinding.enabled) : docBase.finishing.spiralBinding.enabled,
          price: sanitizePriceValue(docSrc.finishing?.spiralBinding?.price, docBase.finishing.spiralBinding.price),
          minPages: sanitizePriceValue(docSrc.finishing?.spiralBinding?.minPages, docBase.finishing.spiralBinding.minPages, 1),
        },
        combBinding: {
          id: "comb_binding",
          name: docSrc.finishing?.combBinding?.name || docBase.finishing.combBinding.name,
          enabled: docSrc.finishing?.combBinding?.enabled !== undefined ? Boolean(docSrc.finishing.combBinding.enabled) : docBase.finishing.combBinding.enabled,
          price: sanitizePriceValue(docSrc.finishing?.combBinding?.price, docBase.finishing.combBinding.price),
          minPages: sanitizePriceValue(docSrc.finishing?.combBinding?.minPages, docBase.finishing.combBinding.minPages, 1),
        },
        lamination: {
          id: "lamination",
          name: docSrc.finishing?.lamination?.name || docBase.finishing.lamination.name,
          enabled: docSrc.finishing?.lamination?.enabled !== undefined ? Boolean(docSrc.finishing.lamination.enabled) : docBase.finishing.lamination.enabled,
          pricePerPage: sanitizePriceValue(docSrc.finishing?.lamination?.pricePerPage, docBase.finishing.lamination.pricePerPage),
        },
        stapling: {
          id: "stapling",
          name: docSrc.finishing?.stapling?.name || docBase.finishing.stapling.name,
          enabled: docSrc.finishing?.stapling?.enabled !== undefined ? Boolean(docSrc.finishing.stapling.enabled) : docBase.finishing.stapling.enabled,
          price: sanitizePriceValue(docSrc.finishing?.stapling?.price, docBase.finishing.stapling.price),
        },
        softBinding: {
          id: "soft_binding",
          name: docSrc.finishing?.softBinding?.name || docBase.finishing.softBinding?.name || { en: "Soft Binding", hi: "सॉफ्ट बाइंडिंग" },
          enabled: docSrc.finishing?.softBinding?.enabled !== undefined ? Boolean(docSrc.finishing.softBinding.enabled) : (docBase.finishing.softBinding?.enabled ?? true),
          price: sanitizePriceValue(docSrc.finishing?.softBinding?.price, docBase.finishing.softBinding?.price || 0, 0),
        },
        hardBinding: {
          id: "hard_binding",
          name: docSrc.finishing?.hardBinding?.name || docBase.finishing.hardBinding?.name || { en: "Hard Binding", hi: "हार्ड बाइंडिंग" },
          enabled: docSrc.finishing?.hardBinding?.enabled !== undefined ? Boolean(docSrc.finishing.hardBinding.enabled) : (docBase.finishing.hardBinding?.enabled ?? true),
          price: sanitizePriceValue(docSrc.finishing?.hardBinding?.price, docBase.finishing.hardBinding?.price || 0, 0),
        },
      },
    },
    passportPhoto: {
      sheet8: sanitizePriceValue(source.passportPhoto?.sheet8, base.passportPhoto.sheet8),
      sheet16: sanitizePriceValue(source.passportPhoto?.sheet16, base.passportPhoto.sheet16),
      sheet32: sanitizePriceValue(source.passportPhoto?.sheet32, base.passportPhoto.sheet32),
      singlePrint: sanitizePriceValue(source.passportPhoto?.singlePrint, base.passportPhoto.singlePrint),
    },
    visitingCards: {
      base100Single: sanitizePriceValue(source.visitingCards?.base100Single, base.visitingCards.base100Single),
      base100Double: sanitizePriceValue(source.visitingCards?.base100Double, base.visitingCards.base100Double),
      base500Single: sanitizePriceValue(source.visitingCards?.base500Single, base.visitingCards.base500Single),
      base500Double: sanitizePriceValue(source.visitingCards?.base500Double, base.visitingCards.base500Double),
      base1000Single: sanitizePriceValue(source.visitingCards?.base1000Single, base.visitingCards.base1000Single),
      base1000Double: sanitizePriceValue(source.visitingCards?.base1000Double, base.visitingCards.base1000Double),
      matteFinishExtra: sanitizePriceValue(source.visitingCards?.matteFinishExtra, base.visitingCards.matteFinishExtra),
      glossFinishExtra: sanitizePriceValue(source.visitingCards?.glossFinishExtra, base.visitingCards.glossFinishExtra),
      velvetFinishExtra: sanitizePriceValue(source.visitingCards?.velvetFinishExtra, base.visitingCards.velvetFinishExtra),
    },
    idCards: {
      pvcSingle: sanitizePriceValue(source.idCards?.pvcSingle, base.idCards.pvcSingle),
      pvcDouble: sanitizePriceValue(source.idCards?.pvcDouble, base.idCards.pvcDouble),
      withLanyardHolder: sanitizePriceValue(source.idCards?.withLanyardHolder, base.idCards.withLanyardHolder),
    },
    posters: {
      a4Photo: sanitizePriceValue(source.posters?.a4Photo, base.posters.a4Photo),
      a3Glossy: sanitizePriceValue(source.posters?.a3Glossy, base.posters.a3Glossy),
      a2Photo: sanitizePriceValue(source.posters?.a2Photo, base.posters.a2Photo),
      vinylPerSqFt: sanitizePriceValue(source.posters?.vinylPerSqFt, base.posters.vinylPerSqFt),
      flexPerSqFt: sanitizePriceValue(source.posters?.flexPerSqFt, base.posters.flexPerSqFt),
    },
  };
}

// ─── Centralized Quick Services Pricing Realtime Multiplexer (Singleton) ──────
const printPricingSubscribers = new Set<(config: PrintPricingConfig) => void>();
let lastCachedPrintPricing: PrintPricingConfig | null = null;
let printPricingBroadcastChannel: BroadcastChannel | null = null;
let printPricingCloudSubscribed = false;

function dispatchToAllPricingSubscribers(config: PrintPricingConfig) {
  lastCachedPrintPricing = config;
  printPricingSubscribers.forEach((cb) => {
    try {
      cb(config);
    } catch (err) {
      console.warn("[PrintPricingRealtime] Subscriber callback error:", err);
    }
  });
}

// Initialize Cross-Tab BroadcastChannel
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    printPricingBroadcastChannel = new BroadcastChannel("palak_print_pricing_channel");
    printPricingBroadcastChannel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "PRINT_PRICING_CHANGED" && event.data.config) {
        const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, event.data.config);
        saveLocalPrintPricingConfig(sanitized, false);
        dispatchToAllPricingSubscribers(sanitized);
      }
    };
  } catch (e) {
    console.debug("BroadcastChannel not supported or error:", e);
  }

  // Cross-tab storage listener (fallback/redundancy across tabs)
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === PRINT_PRICING_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        const configData = parsed && parsed.__isEnvelope ? parsed.config : parsed;
        const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, configData);
        lastCachedPrintPricing = sanitized;
        dispatchToAllPricingSubscribers(sanitized);
      } catch {}
    }
  });

  // Revalidate on focus / visibility change
  window.addEventListener("focus", () => {
    getPrintPricingConfig().then((fresh) => {
      dispatchToAllPricingSubscribers(fresh);
    }).catch(() => {});
  });
}

function initPrintPricingCloudSubscription() {
  if (printPricingCloudSubscribed || !isSupabaseConfigured || !supabase) return;
  printPricingCloudSubscribed = true;
  try {
    supabase
      .channel("print_pricing_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_settings",
          filter: "key=eq.print_pricing_config",
        },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, payload.new.value);
            saveLocalPrintPricingConfig(sanitized, true);
            dispatchToAllPricingSubscribers(sanitized);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          getPrintPricingConfig().catch(() => {});
        }
      });
  } catch (e) {
    console.debug("Supabase print pricing realtime notice:", e);
  }
}

export function getLocalPrintPricingConfig(): PrintPricingConfig {
  if (lastCachedPrintPricing) return lastCachedPrintPricing;
  if (typeof window === "undefined") return DEFAULT_PRINT_PRICING;
  try {
    const raw = localStorage.getItem(PRINT_PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_PRICING;
    const parsed = JSON.parse(raw);
    const configData = parsed && parsed.__isEnvelope ? parsed.config : parsed;
    const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, configData);
    lastCachedPrintPricing = sanitized;
    return sanitized;
  } catch {
    return DEFAULT_PRINT_PRICING;
  }
}

export function saveLocalPrintPricingConfig(config: PrintPricingConfig, broadcast = true): void {
  const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, config);
  lastCachedPrintPricing = sanitized;
  if (typeof window === "undefined") return;
  try {
    const envelope = {
      __isEnvelope: true,
      version: 2,
      savedAt: new Date().toISOString(),
      config: sanitized,
    };
    localStorage.setItem(PRINT_PRICING_STORAGE_KEY, JSON.stringify(envelope));
    window.dispatchEvent(new CustomEvent("palak_print_pricing_updated", { detail: sanitized }));
    if (broadcast && printPricingBroadcastChannel) {
      printPricingBroadcastChannel.postMessage({
        type: "PRINT_PRICING_CHANGED",
        config: sanitized,
      });
    }
  } catch (e) {
    console.error("Error saving print pricing locally:", e);
  }
}

export function broadcastPrintPricingUpdate(config: PrintPricingConfig): void {
  const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, config);
  saveLocalPrintPricingConfig(sanitized, true);
  dispatchToAllPricingSubscribers(sanitized);
}

export function subscribeToPrintPricing(
  callback: (config: PrintPricingConfig) => void
): () => void {
  printPricingSubscribers.add(callback);
  initPrintPricingCloudSubscription();

  // Immediately notify with current config
  const initial = lastCachedPrintPricing || getLocalPrintPricingConfig();
  try {
    callback(initial);
  } catch {}

  const localHandler = (e: any) => {
    if (e?.detail) {
      const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, e.detail);
      lastCachedPrintPricing = sanitized;
      callback(sanitized);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("palak_print_pricing_updated", localHandler);
  }

  return () => {
    printPricingSubscribers.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("palak_print_pricing_updated", localHandler);
    }
  };
}

export async function getPrintPricingConfig(_forceRefresh = false): Promise<PrintPricingConfig> {
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
    const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, data.value);
    saveLocalPrintPricingConfig(sanitized, false);
    // Always dispatch to subscribers so UI immediately reflects server truth
    dispatchToAllPricingSubscribers(sanitized);
    return sanitized;
  } catch {
    return localConfig;
  }
}

export async function updatePrintPricingConfig(config: PrintPricingConfig): Promise<boolean> {
  const sanitized = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, config);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("business_settings")
      .upsert({
        key: "print_pricing_config",
        value: sanitized as any,
        description: "Authoritative pricing configuration for instant online printing services",
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.error("[updatePrintPricingConfig] Server update failed:", error.message);
      throw new Error(`Failed to update server pricing: ${error.message}`);
    }
  }

  // Once server write succeeds, update local storage and broadcast to all tabs
  saveLocalPrintPricingConfig(sanitized, true);
  dispatchToAllPricingSubscribers(sanitized);
  return true;
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
export const QUICK_SERVICES_BROADCAST_CHANNEL = "palak_quick_services_channel";

type QuickServiceCallback = (services: QuickServiceItem[]) => void;
const quickServiceSubscribers = new Set<QuickServiceCallback>();
let quickServicesChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
let lastCachedQuickServices: QuickServiceItem[] | null = null;
let memoryQuickServices: QuickServiceItem[] | null = null;
let heartbeatIntervalId: any = null;
let lastRevalidationTimestamp = 0;

// Multi-tab / multi-window BroadcastChannel singleton
let quickServicesBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    quickServicesBroadcastChannel = new BroadcastChannel(QUICK_SERVICES_BROADCAST_CHANNEL);
  } catch (e) {
    console.debug("[QuickServices] BroadcastChannel init notice:", e);
  }
}

export function getLocalQuickServices(): QuickServiceItem[] {
  if (typeof window === "undefined") return memoryQuickServices || DEFAULT_QUICK_SERVICES;
  try {
    const raw = localStorage.getItem(QUICK_SERVICES_LOCAL_KEY);
    if (!raw) return memoryQuickServices || DEFAULT_QUICK_SERVICES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (memoryQuickServices || DEFAULT_QUICK_SERVICES);
  } catch {
    return memoryQuickServices || DEFAULT_QUICK_SERVICES;
  }
}

export function saveLocalQuickServices(services: QuickServiceItem[], broadcastToOtherTabs = true): void {
  memoryQuickServices = services;
  lastCachedQuickServices = services;

  // Immediately notify all active subscribers in the current JS environment
  quickServiceSubscribers.forEach((cb) => {
    try {
      cb(services);
    } catch (err) {
      console.warn("[QuickServices] Subscriber callback error:", err);
    }
  });

  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUICK_SERVICES_LOCAL_KEY, JSON.stringify(services));
    // 1. Same-window instant notification
    window.dispatchEvent(new CustomEvent("palak_quick_services_updated", { detail: services }));
    // 2. Cross-tab BroadcastChannel notification
    if (broadcastToOtherTabs && quickServicesBroadcastChannel) {
      quickServicesBroadcastChannel.postMessage({
        type: "QUICK_SERVICES_AVAILABILITY_CHANGED",
        timestamp: Date.now(),
        services,
      });
    }
  } catch (e) {
    console.error("Error saving quick services locally:", e);
  }
}

/** Explicitly broadcast an availability changed event to other tabs/windows */
export function broadcastQuickServicesUpdate(services?: QuickServiceItem[]): void {
  if (typeof window === "undefined") return;
  const list = services || getLocalQuickServices();
  if (quickServicesBroadcastChannel) {
    try {
      quickServicesBroadcastChannel.postMessage({
        type: "QUICK_SERVICES_AVAILABILITY_CHANGED",
        timestamp: Date.now(),
        services: list,
      });
    } catch (e) {
      console.debug("[QuickServices] broadcast error:", e);
    }
  }
}

/** Fetches all Quick Services with real-time status from cloud or local fallback */
export async function getQuickServices(_forceServer = false): Promise<QuickServiceItem[]> {
  const localList = getLocalQuickServices();
  if (!isSupabaseConfigured || !supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase
      .from("quick_services")
      .select("id, name_en, name_hi, category, description_en, description_hi, path, icon_name, is_active, stop_reason, stop_reason_hi, sort_order, updated_by, created_at, updated_at")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const merged: QuickServiceItem[] = data.map((item: any) => ({
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

    // Save to local cache without rebroadcasting to avoid loop
    saveLocalQuickServices(merged, false);
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
  const nowIso = new Date().toISOString();
  // Update local cache optimistically and broadcast immediately
  const currentList = getLocalQuickServices();
  const updatedList = currentList.map((s) =>
    s.id === serviceId
      ? {
          ...s,
          is_active: isActive,
          stop_reason: isActive ? null : stopReason?.trim() || "Temporarily unavailable",
          updated_by: performedBy,
          updated_at: nowIso,
        }
      : s
  );
  saveLocalQuickServices(updatedList, true);

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
      const fresh = await getQuickServices(true);
      const s = fresh.find((x) => x.id === serviceId);
      // Broadcast verified canonical state across tabs
      broadcastQuickServicesUpdate(fresh);
      return { success: true, service: s };
    }

    // 2. Direct table update fallback
    const { error } = await supabase
      .from("quick_services")
      .update({
        is_active: isActive,
        stop_reason: isActive ? null : stopReason?.trim() || "Temporarily unavailable",
        updated_by: performedBy,
        updated_at: nowIso,
      })
      .eq("id", serviceId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Direct quick_services update error:", error);
      return { success: false, error: error.message };
    }

    const fresh = await getQuickServices(true);
    broadcastQuickServicesUpdate(fresh);
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
  // Update local cache immediately and broadcast
  const localList = getLocalQuickServices();
  const nowIso = new Date().toISOString();
  const updatedList = localList.map((s) => ({
    ...s,
    is_active: isActive,
    stop_reason: isActive ? null : stopReason?.trim() || "All quick services temporarily paused",
    updated_by: performedBy,
    updated_at: nowIso,
  }));
  saveLocalQuickServices(updatedList, true);

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
      const fresh = await getQuickServices(true);
      broadcastQuickServicesUpdate(fresh);
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

    const fresh = await getQuickServices(true);
    broadcastQuickServicesUpdate(fresh);
    return { success: true, services: fresh };
  } catch (err: any) {
    console.error("toggleAllQuickServicesAvailability exception:", err);
    return { success: false, error: err?.message || "Failed to update all services availability" };
  }
}

// ─── Centralized Quick Services Realtime Multiplexer (Singleton) ─────────────
function dispatchToAllSubscribers(services: QuickServiceItem[]) {
  lastCachedQuickServices = services;
  quickServiceSubscribers.forEach((cb) => {
    try {
      cb(services);
    } catch (err) {
      console.warn("[QuickServicesRealtime] Subscriber callback error:", err);
    }
  });
}

async function notifyQuickServiceSubscribers(forceFetch = false) {
  try {
    const fresh = await getQuickServices(forceFetch);
    dispatchToAllSubscribers(fresh);
  } catch (e) {
    console.warn("Quick services realtime fetch notice:", e);
  }
}

// Global cross-tab broadcast handler
if (quickServicesBroadcastChannel) {
  quickServicesBroadcastChannel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "QUICK_SERVICES_AVAILABILITY_CHANGED") {
      if (Array.isArray(event.data.services) && event.data.services.length > 0) {
        // Immediately sync local cache without looping broadcast
        saveLocalQuickServices(event.data.services, false);
        dispatchToAllSubscribers(event.data.services);
      }
      // Revalidate from backend asynchronously to guarantee consistency
      notifyQuickServiceSubscribers(true);
    }
  };
}

// Global storage event listener (cross-tab fallback when BroadcastChannel is not active or as redundancy)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === QUICK_SERVICES_LOCAL_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatchToAllSubscribers(parsed);
        }
      } catch {}
      notifyQuickServiceSubscribers(true);
    }
  });
}

/** Subscribe to live real-time changes on quick services via a shared singleton channel */
export function subscribeToQuickServices(
  callback: QuickServiceCallback
): () => void {
  quickServiceSubscribers.add(callback);

  // Deliver cached services immediately if available
  const initial = lastCachedQuickServices || getLocalQuickServices();
  if (initial && initial.length > 0) {
    try {
      callback(initial);
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

  // Focus & Visibility Revalidation Handler (Throttled to max once per 5 seconds)
  const handleWindowFocusOrVisible = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const now = Date.now();
    if (now - lastRevalidationTimestamp > 5000) {
      lastRevalidationTimestamp = now;
      notifyQuickServiceSubscribers(true);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleWindowFocusOrVisible);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleWindowFocusOrVisible);
  }

  // Setup periodic background heartbeat (every 25 seconds if active)
  if (!heartbeatIntervalId && typeof window !== "undefined") {
    heartbeatIntervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      notifyQuickServiceSubscribers(false);
    }, 25000);
  }

  // Supabase Realtime Channel
  if (isSupabaseConfigured && supabase && !quickServicesChannel) {
    quickServicesChannel = supabase
      .channel("quick-services-realtime-singleton")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "quick_services" },
        () => {
          notifyQuickServiceSubscribers(true);
        }
      )
      .subscribe();
  }

  return () => {
    quickServiceSubscribers.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("palak_quick_services_updated", localHandler);
      window.removeEventListener("focus", handleWindowFocusOrVisible);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleWindowFocusOrVisible);
    }
    if (quickServiceSubscribers.size === 0) {
      if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
      }
      if (quickServicesChannel && supabase) {
        try {
          supabase.removeChannel(quickServicesChannel);
        } catch {}
        quickServicesChannel = null;
      }
    }
  };
}

// In-flight idempotency mutex map to eliminate duplicate submissions from rapid clicks or concurrent attempts
const inFlightPrintSubmissions = new Map<string, Promise<{ success: boolean; orderCode: string; orderId?: string; error?: string }>>();

export async function submitPrintOrder(
  payload: PrintOrderPayload
): Promise<{ success: boolean; orderCode: string; orderId?: string; totalAmount?: number; error?: string }> {
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
    // 0. Pre-validate Service Availability authoritatively against server/database
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: svcRecord, error: svcErr } = await supabase
          .from("quick_services")
          .select("id, is_active, stop_reason, name_en")
          .eq("id", payload.serviceId)
          .maybeSingle();

        if (!svcErr && svcRecord) {
          if (svcRecord.is_active === false) {
            const stopReasonMsg = svcRecord.stop_reason ? ` (${svcRecord.stop_reason})` : "";
            return {
              success: false,
              orderCode: "",
              error: `This service is currently unavailable. Please try again later.${stopReasonMsg}`,
            };
          }
        }
      }

      // Offline / Local Fallback availability validation
      const activeServices = getLocalQuickServices();
      const matchedService = activeServices.find((s) => s.id === payload.serviceId);
      if (matchedService && matchedService.is_active === false) {
        const stopReasonMsg = matchedService.stop_reason
          ? ` (${matchedService.stop_reason})`
          : "";
        return {
          success: false,
          orderCode: "",
          error: `This service is currently unavailable. Please try again later.${stopReasonMsg}`,
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

    // Enforce independent order-submission file size protection
    for (const f of allFiles) {
      const sizeVal = validateQuickServiceFileSize(f);
      if (!sizeVal.isValid) {
        return {
          success: false,
          orderCode: "",
          error: sizeVal.error || `File "${f.name}" exceeds the maximum allowed file size of ${QUICK_SERVICE_MAX_FILE_SIZE_MB} MB. Order submission blocked.`,
        };
      }
    }

    const primaryFile = allFiles[0] || payload.file;
    const doc0 = payload.printSnapshot?.documents?.[0];

    // ── Server-Side Authoritative Price Validation & Recalculation ────────────
    const authoritativeConfig = getLocalPrintPricingConfig();
    let recomputedUnitPrice: number | null = null;
    let recomputedTotal: number | null = null;
    const copiesOrQty = Math.max(1, Number(payload.options.copies) || Number(payload.options.quantity) || 1);

    if (payload.serviceId === "document-printing") {
      if (payload.printSnapshot?.documents && payload.printSnapshot.documents.length > 0) {
        let docsSum = 0;
        for (const doc of payload.printSnapshot.documents) {
          const res = calculateDocumentPrintPriceComplete(doc, authoritativeConfig);
          docsSum += res.totalPrice;
        }
        recomputedTotal = Math.round(docsSum * 100) / 100;
        recomputedUnitPrice = Math.round((recomputedTotal / copiesOrQty) * 100) / 100;
      } else if (payload.options) {
        const res = calculateDocumentPrintPriceComplete(payload.options, authoritativeConfig);
        recomputedTotal = res.totalPrice;
        recomputedUnitPrice = res.itemPrice;
      }
    } else if (payload.serviceId === "passport-photo") {
      const layoutId = payload.options.layout || payload.options.layoutId || "sheet8";
      const keyMap: Record<string, keyof typeof authoritativeConfig.passportPhoto> = {
        sheet8: "sheet8",
        sheet16: "sheet16",
        sheet32: "sheet32",
        single: "singlePrint",
        singlePrint: "singlePrint",
      };
      const photoKey = keyMap[layoutId] || "sheet8";
      recomputedUnitPrice = authoritativeConfig.passportPhoto[photoKey] || 50;
      recomputedTotal = recomputedUnitPrice * copiesOrQty;
    } else if (payload.serviceId === "visiting-cards") {
      const qty = Number(payload.options.quantity) || 100;
      const isSingle = payload.options.sides !== "double";
      let baseRate = 250;
      if (qty <= 100) baseRate = isSingle ? authoritativeConfig.visitingCards.base100Single : authoritativeConfig.visitingCards.base100Double;
      else if (qty <= 500) baseRate = isSingle ? authoritativeConfig.visitingCards.base500Single : authoritativeConfig.visitingCards.base500Double;
      else if (qty <= 1000) baseRate = isSingle ? authoritativeConfig.visitingCards.base1000Single : authoritativeConfig.visitingCards.base1000Double;
      else {
        baseRate = Math.round((qty / 100) * (isSingle ? authoritativeConfig.visitingCards.base100Single : authoritativeConfig.visitingCards.base100Double) * 0.85);
      }
      let finishExtra = 0;
      if (payload.options.finish === "velvet") finishExtra = authoritativeConfig.visitingCards.velvetFinishExtra;
      else if (payload.options.finish === "matte") finishExtra = authoritativeConfig.visitingCards.matteFinishExtra;
      else if (payload.options.finish === "gloss") finishExtra = authoritativeConfig.visitingCards.glossFinishExtra;
      recomputedUnitPrice = baseRate + finishExtra;
      recomputedTotal = recomputedUnitPrice * Math.max(1, Number(payload.options.sets) || 1);
    } else if (payload.serviceId === "id-cards") {
      const isSingle = payload.options.cardSides !== "double";
      const baseCardRate = isSingle ? authoritativeConfig.idCards.pvcSingle : authoritativeConfig.idCards.pvcDouble;
      const lanyardRate = payload.options.includeLanyard ? authoritativeConfig.idCards.withLanyardHolder : 0;
      recomputedUnitPrice = baseCardRate + lanyardRate;
      recomputedTotal = recomputedUnitPrice * copiesOrQty;
    } else if (payload.serviceId === "poster-banner") {
      const sz = payload.options.size;
      let rate = 0;
      if (sz === "a4") rate = authoritativeConfig.posters.a4Photo;
      else if (sz === "a3") rate = authoritativeConfig.posters.a3Glossy;
      else if (sz === "a2") rate = authoritativeConfig.posters.a2Photo;
      else if (sz === "vinyl") rate = authoritativeConfig.posters.vinylPerSqFt;
      else if (sz === "flex") rate = authoritativeConfig.posters.flexPerSqFt;
      if (payload.options.finish === "laminated" && (sz === "a4" || sz === "a3" || sz === "a2")) {
        rate += authoritativeConfig.documentPrinting.finishing.lamination.pricePerPage;
      }
      if (rate > 0) {
        recomputedUnitPrice = rate;
        recomputedTotal = rate * copiesOrQty;
      }
    }

    if (recomputedTotal !== null && recomputedTotal > 0) {
      const clientTotal = Number(payload.pricingSnapshot?.totalAmount) || 0;
      if (Math.abs(clientTotal - recomputedTotal) > 0.5) {
        console.warn(`[submitPrintOrder] Price revalidation: Overriding client price ₹${clientTotal} with authoritative price ₹${recomputedTotal}`);
        payload.pricingSnapshot.unitPrice = recomputedUnitPrice!;
        payload.pricingSnapshot.subtotal = recomputedTotal;
        payload.pricingSnapshot.totalAmount = recomputedTotal;
      }
    }

    const orderItem = {
      productId: payload.serviceId,
      productName: payload.serviceName,
      quantity: Math.max(1, Number(payload.options.copies) || Number(payload.options.quantity) || 1),
      unitPrice: Math.max(0, payload.pricingSnapshot.unitPrice || 0),
      totalPrice: Math.max(0, payload.pricingSnapshot.totalAmount || 0),
      selectedOptions: {
        ...payload.options,
        ...(payload.printSnapshot ? { printSnapshot: payload.printSnapshot } : {}),
        ...(doc0
          ? {
              gsm: payload.options.gsm ?? doc0.gsm,
              binding: payload.options.binding ?? doc0.binding,
              frontCover: payload.options.frontCover ?? doc0.frontCover,
              backCover: payload.options.backCover ?? doc0.backCover,
              finishing: { ...(payload.options.finishing || {}), ...(doc0.finishing || {}), ...(payload.finishingOptions || {}) },
              paperSize: payload.options.paperSize ?? doc0.paperSize,
              colorMode: payload.options.colorMode ?? doc0.colorMode,
              sides: payload.options.sides ?? doc0.sides,
              orientation: payload.options.orientation ?? doc0.orientation,
              totalPages: payload.options.totalPages ?? doc0.totalPages,
              totalPhysicalSheets: payload.options.totalPhysicalSheets ?? doc0.totalPhysicalSheets,
              priceBreakdown: payload.options.priceBreakdown ?? doc0.priceBreakdown,
            }
          : {
              finishing: payload.finishingOptions || {},
            }),
        documentType: payload.documentType || "General Document",
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

    // Check local store first for fast idempotency recovery
    const localExisting = PalakDataStore.getOrderBySubmissionId(clientSubmissionId);
    if (localExisting?.orderCode) {
      finalOrderCode = localExisting.orderCode;
      finalOrderId = localExisting.id;
    }

    // 1. Authoritative Persistence (Direct PostgreSQL insertion with RPC & Offline fallback)
    if (isSupabaseConfigured && supabase) {
      const validUserId = isValidSupabaseUUID(payload.userId) ? payload.userId : null;
      const client = supabase;
      let persistenceSucceeded = false;

      // Tier 1: Fast Direct PostgreSQL Table Insertion with Idempotency Guard
      try {
        // Fast Idempotency Check: if already committed under this clientSubmissionId
        const checkTimeout = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "Idempotency check timeout exceeded" } }), 2000)
        );
        const { data: existingOrder } = await Promise.race([
          client
            .from("orders")
            .select("id, order_code, total_amount, subtotal_amount, print_snapshot")
            .eq("client_submission_id", clientSubmissionId)
            .maybeSingle(),
          checkTimeout,
        ]);

        if (existingOrder?.order_code) {
          finalOrderCode = existingOrder.order_code;
          finalOrderId = existingOrder.id;
          if (existingOrder.total_amount !== undefined && existingOrder.total_amount !== null) {
            payload.pricingSnapshot.totalAmount = Number(existingOrder.total_amount);
          }
          if (existingOrder.subtotal_amount !== undefined && existingOrder.subtotal_amount !== null) {
            payload.pricingSnapshot.subtotal = Number(existingOrder.subtotal_amount);
          }
          if (existingOrder.print_snapshot) {
            payload.printSnapshot = existingOrder.print_snapshot;
          }

          // If incoming payload has confirmed payment or Razorpay ID, update the cloud record
          const isPaidOnline = paymentStatus === "confirmed" || payload.paymentStatus === "confirmed" || payload.paymentStatus === "paid";
          if (isPaidOnline) {
            try {
              await client
                .from("orders")
                .update({
                  payment_status: "confirmed",
                  payment_method: paymentMethod,
                  order_notes: payload.instructions?.trim() || null,
                  queue_type: "priority",
                  queue_priority: 1,
                  priority_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingOrder.id);
            } catch (updErr) {
              console.warn("Idempotency cloud update notice:", updErr);
            }
          }
          persistenceSucceeded = true;
        } else {
          const orderInsertData: any = {
            order_code: finalOrderCode,
            customer_name: payload.customerName.trim(),
            customer_phone: payload.customerPhone.trim(),
            customer_email: payload.customerEmail?.trim() || null,
            fulfillment_type: "pickup",
            order_notes: payload.instructions?.trim() || null,
            subtotal_amount: payload.pricingSnapshot.subtotal || 0,
            delivery_fee: 0,
            total_amount: payload.pricingSnapshot.totalAmount || 0,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            order_status: "NEW",
            user_id: validUserId,
            staff_notes: `Online Service: ${payload.serviceName} | Doc: ${payload.documentType || "N/A"}`,
            items: [orderItem],
            client_submission_id: clientSubmissionId,
            print_snapshot: payload.printSnapshot || null,
            queue_type: queueMeta.queueType,
            queue_priority: queueMeta.queuePriority,
            submitted_at: queueMeta.submittedAt,
            priority_at: queueMeta.priorityAt || null,
          };

          const insertTimeout = new Promise<{ data: any; error: any }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: "Insert timeout exceeded" } }), 3000)
          );

          let { data: insertedOrder, error: insertErr } = await Promise.race([
            client
              .from("orders")
              .insert(orderInsertData)
              .select("id, order_code")
              .maybeSingle(),
            insertTimeout,
          ]);

          // Column compatibility retry if database schema is missing newer columns
          if (insertErr && (insertErr.message?.includes("column") || insertErr.code === "42703")) {
            delete orderInsertData.client_submission_id;
            delete orderInsertData.print_snapshot;
            delete orderInsertData.queue_type;
            delete orderInsertData.queue_priority;
            delete orderInsertData.submitted_at;
            delete orderInsertData.priority_at;
            const retryTimeout = new Promise<{ data: any; error: any }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: { message: "Retry timeout exceeded" } }), 3000)
            );
            const retryRes = await Promise.race([
              client
                .from("orders")
                .insert(orderInsertData)
                .select("id, order_code")
                .maybeSingle(),
              retryTimeout,
            ]);
            insertedOrder = retryRes.data;
            insertErr = retryRes.error;
          }

          // Handle duplicate key on client_submission_id or order_code
          if (insertErr && (insertErr.code === "23505" || insertErr.message?.includes("duplicate key"))) {
            if (insertErr.message?.includes("client_submission_id") || insertErr.message?.includes("idx_orders_client_submission_id")) {
              const { data: existing } = await client
                .from("orders")
                .select("id, order_code")
                .eq("client_submission_id", clientSubmissionId)
                .maybeSingle();
              if (existing) {
                insertedOrder = existing;
                insertErr = null;
              }
            } else {
              finalOrderCode = generatePrintOrderCode();
              orderInsertData.order_code = finalOrderCode;
              const codeRetry = await client
                .from("orders")
                .insert(orderInsertData)
                .select("id, order_code")
                .maybeSingle();
              insertedOrder = codeRetry.data;
              insertErr = codeRetry.error;
            }
          }

          if (insertedOrder || !insertErr) {
            finalOrderId = insertedOrder?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}`);
            finalOrderCode = insertedOrder?.order_code || finalOrderCode;
            persistenceSucceeded = true;
          }
        }
      } catch (directErr) {
        console.warn("[submitPrintOrder] Direct table insertion failed, trying RPC:", directErr);
      }

      // Tier 2: Atomic Order RPC Fallback
      if (!persistenceSucceeded) {
        try {
          const rpcPromise = supabase.rpc("create_online_print_order", {
            p_order_code: finalOrderCode,
            p_customer_name: payload.customerName.trim(),
            p_customer_phone: payload.customerPhone.trim(),
            p_customer_email: payload.customerEmail?.trim() || null,
            p_fulfillment_type: "pickup",
            p_delivery_address: null,
            p_order_notes: payload.instructions?.trim() || null,
            p_subtotal_amount: payload.pricingSnapshot.subtotal || 0,
            p_delivery_fee: 0,
            p_total_amount: payload.pricingSnapshot.totalAmount || 0,
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

          const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: "RPC timeout (2s exceeded)" } }), 2000)
          );

          const { data: rpcData, error: rpcErr } = await Promise.race([rpcPromise, timeoutPromise]);
          if (!rpcErr && rpcData) {
            persistenceSucceeded = true;
            if (rpcData.orderCode) finalOrderCode = rpcData.orderCode;
            if (rpcData.orderId) finalOrderId = rpcData.orderId;
          }
        } catch (rpcErr) {
          console.warn("[submitPrintOrder] RPC fallback note:", rpcErr);
        }
      }

      if (persistenceSucceeded) {

              // Concurrently insert child entities (order_items, order_files, print_jobs)
              const childInsertions: Promise<any>[] = [
                Promise.resolve(
                  client.from("order_items").insert({
                    order_id: finalOrderId,
                    product_id: (payload.serviceId && isValidSupabaseUUID(payload.serviceId)) ? payload.serviceId : null,
                    product_name: payload.serviceName || "Document Printing",
                    quantity: Math.max(1, Number(payload.options.copies) || Number(payload.options.quantity) || 1),
                    unit_price: Math.max(0, payload.pricingSnapshot.unitPrice || 0),
                    total_price: Math.max(0, payload.pricingSnapshot.totalAmount || 0),
                    selected_options: orderItem.selectedOptions,
                    selected_options_labels: orderItem.selectedOptionsLabels,
                    uploaded_file_url: primaryFile?.url || null,
                    uploaded_file_name: primaryFile?.name || null,
                    design_notes: payload.instructions || null,
                  })
                ),
                Promise.resolve(
                  client.from("print_jobs").insert({
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
                  })
                ),
              ];

              if (allFiles.length > 0) {
                const fileRows = allFiles.map((f) => ({
                  order_id: finalOrderId,
                  file_name: f.name,
                  file_path: f.storagePath || f.url || "",
                  file_url: f.url || "",
                  file_type: f.mimeType || "application/pdf",
                  file_size: f.size || 0,
                }));
                childInsertions.push(Promise.resolve(client.from("order_files").insert(fileRows)));
              }

              await Promise.allSettled(childInsertions);
            }
          }

    // 2. Construct canonical StoredOrder object
    const createdStoredOrder: StoredOrder = {
      id: finalOrderId || finalOrderCode || "order-" + Date.now(),
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
      createdAt: now,
      updatedAt: now,
    };

    // 3. Save to local storage for offline durability & instant cache
    try {
      PalakDataStore.saveOrderToLocal(createdStoredOrder);
    } catch (e) {
      console.warn("Local store fallback sync notice:", e);
    }

    // 4. Dispatch new order event locally & cross-tab so open Admin sessions immediately receive the order
    try {
      dispatchNewOrderLocally({
        id: finalOrderId || finalOrderCode,
        orderCode: finalOrderCode,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        totalAmount: payload.pricingSnapshot.totalAmount,
        orderStatus: "NEW",
        paymentStatus,
        paymentMethod,
        serviceName: payload.serviceName,
        items: [orderItem],
        createdAt: now,
        source: "local_store",
      });
    } catch (dispatchErr) {
      console.warn("[submitPrintOrder] Local event dispatch notice:", dispatchErr);
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

    return {
      success: true,
      orderCode: finalOrderCode,
      orderId: finalOrderId || createdStoredOrder.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}`),
      totalAmount: payload.pricingSnapshot?.totalAmount,
    };
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