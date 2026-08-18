import { supabase, isSupabaseConfigured } from "../supabase/client";
import { PRODUCTS, DIGITAL_SERVICES, CATEGORIES, type LocalProduct, type LocalService, type LocalCategory } from "./catalogData";

export interface OrderItemPayload {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions: Record<string, any>;
  selectedOptionsLabels?: Record<string, string>;
  uploadedFileName?: string;
  uploadedFileUrl?: string;
  designAssistanceRequested?: boolean;
  designNotes?: string;
}

export interface StoredOrder {
  id: string;
  orderCode: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentType: "pickup" | "delivery";
  deliveryAddress?: {
    street: string;
    landmark?: string;
    city: string;
    pincode: string;
  };
  orderNotes?: string;
  subtotalAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: "pay_online" | "pay_at_shop" | "pay_at_store" | "pay_after_confirmation" | "upi_online";
  paymentStatus: "pending" | "confirmed" | "paid" | "pay_at_shop" | "failed" | "refunded" | "partially_paid";
  orderStatus:
    | "NEW"
    | "PENDING"
    | "UNDER_REVIEW"
    | "PAYMENT_PENDING"
    | "CONFIRMED"
    | "DESIGN_REVIEW"
    | "IN_PRODUCTION"
    | "PROCESSING"
    | "READY_FOR_PICKUP"
    | "OUT_FOR_DELIVERY"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED";
  items: OrderItemPayload[];
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredServiceRequest {
  id: string;
  requestCode: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preferredContact: "whatsapp" | "phone" | "email";
  applicantDetails?: Record<string, string>;
  uploadedDocumentUrls?: string[];
  uploadedDocumentNames?: string[];
  additionalNotes?: string;
  estimatedFee: number;
  requestStatus:
    | "NEW"
    | "DOCUMENTS_VERIFIED"
    | "IN_PROCESSING"
    | "ACTION_REQUIRED"
    | "SUBMITTED_TO_PORTAL"
    | "COMPLETED"
    | "REJECTED";
  acknowledgementNumber?: string;
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredQuoteRequest {
  id: string;
  quoteCode: string;
  serviceOrProductType: string;
  quantity: string;
  sizeSpecifications?: string;
  materialPreferences?: string;
  requiredByDate?: string;
  designStatus: "have_design" | "need_design" | "rough_idea";
  referenceFileUrls?: string[];
  referenceFileNames?: string[];
  additionalDetails?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  businessName?: string;
  quotedAmount?: number;
  quoteStatus: "NEW" | "ESTIMATE_PREPARED" | "QUOTE_SENT" | "ACCEPTED" | "DECLINED" | "CONVERTED_TO_ORDER";
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDesignRequest {
  id: string;
  designCode: string;
  designCategory: string;
  titleOrEvent: string;
  contentText: string;
  colorPreferences?: string;
  referenceFileUrls?: string[];
  referenceFileNames?: string[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  designStatus: "NEW" | "IN_DESIGN" | "PROOF_SENT" | "REVISION_REQUESTED" | "APPROVED" | "SENT_TO_PRINT";
  proofFileUrl?: string;
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryLog {
  id: string;
  entityType: "order" | "service_request" | "quote_request" | "design_request";
  entityCode: string;
  previousStatus?: string;
  newStatus: string;
  messageEn: string;
  messageHi: string;
  performedBy: string;
  createdAt: string;
}

// Storage keys
const ORDERS_KEY = "palak_orders_v1";
const SERVICE_REQUESTS_KEY = "palak_service_requests_v1";
const QUOTE_REQUESTS_KEY = "palak_quote_requests_v1";
const DESIGN_REQUESTS_KEY = "palak_design_requests_v1";
const STATUS_HISTORY_KEY = "palak_status_history_v1";

// Helper to safely access localStorage
function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// Generate code format: PE-O-2026-1042
function generateCode(prefix: string): string {
  const year = 2026;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PE-${prefix}-${year}-${rand}`;
}

/** Returns true only for valid UUID strings that can be stored in Supabase user_id columns */
function isValidSupabaseUUID(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export class PalakDataStore {
  // --- Catalog access ---
  static getCategories(): LocalCategory[] {
    return CATEGORIES;
  }

  static getProducts(): LocalProduct[] {
    return PRODUCTS;
  }

  static getProductBySlug(slug: string): LocalProduct | undefined {
    return PRODUCTS.find((p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase()));
  }

  static getWeddingCards(filter?: {
    searchQuery?: string;
    occasion?: string;
    style?: string;
    cardType?: string;
    religion?: string;
    priceRange?: string;
    sortBy?: string;
  }): LocalProduct[] {
    let cards = PRODUCTS.filter(
      (p) => p.categoryType === "wedding" || p.categoryId === "wedding-events"
    );

    if (!filter) return cards;

    const { searchQuery, occasion, style, cardType, religion, priceRange, sortBy } = filter;

    // Search query matching: name, sku, shortDesc, tags, occasion, style, cardType
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      cards = cards.filter((c) => {
        const nameEn = c.name.en.toLowerCase();
        const nameHi = c.name.hi.toLowerCase();
        const sku = (c.sku || "").toLowerCase();
        const descEn = c.shortDesc.en.toLowerCase();
        const descHi = c.shortDesc.hi.toLowerCase();
        const occasionVal = (c.occasion || "").toLowerCase();
        const styleVal = (c.style || "").toLowerCase();
        const typeVal = (c.cardType || "").toLowerCase();
        const tagMatch = c.tags.some((t) => t.toLowerCase().includes(q));

        return (
          nameEn.includes(q) ||
          nameHi.includes(q) ||
          sku.includes(q) ||
          descEn.includes(q) ||
          descHi.includes(q) ||
          occasionVal.includes(q) ||
          styleVal.includes(q) ||
          typeVal.includes(q) ||
          tagMatch
        );
      });
    }

    // Filter by Occasion
    if (occasion && occasion !== "all") {
      cards = cards.filter((c) => c.occasion === occasion);
    }

    // Filter by Style
    if (style && style !== "all") {
      cards = cards.filter((c) => c.style === style);
    }

    // Filter by Card Type
    if (cardType && cardType !== "all") {
      cards = cards.filter((c) => c.cardType === cardType);
    }

    // Filter by Religion
    if (religion && religion !== "all") {
      cards = cards.filter((c) => c.religion === religion || c.religion === "interfaith");
    }

    // Filter by Price Range
    if (priceRange && priceRange !== "all") {
      cards = cards.filter((c) => {
        const p = c.pricePerCard || (c.startingPrice > 500 ? c.startingPrice / 100 : c.startingPrice);
        switch (priceRange) {
          case "under-20":
            return p < 20;
          case "20-30":
            return p >= 20 && p <= 30;
          case "30-50":
            return p >= 30 && p <= 50;
          case "50-100":
            return p >= 50 && p <= 100;
          case "100-plus":
            return p > 100;
          default:
            return true;
        }
      });
    }

    // Sorting
    if (sortBy) {
      cards = [...cards].sort((a, b) => {
        const priceA = a.pricePerCard || (a.startingPrice > 500 ? a.startingPrice / 100 : a.startingPrice);
        const priceB = b.pricePerCard || (b.startingPrice > 500 ? b.startingPrice / 100 : b.startingPrice);

        switch (sortBy) {
          case "price-asc":
            return priceA - priceB;
          case "price-desc":
            return priceB - priceA;
          case "popular":
            return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
          case "newest":
            return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
          case "name-asc":
            return a.name.en.localeCompare(b.name.en);
          case "featured":
          default:
            return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }
      });
    }

    return cards;
  }

  static getWeddingCardBySlug(slugOrSku: string): LocalProduct | undefined {
    const clean = slugOrSku.trim().toLowerCase();
    const cards = this.getWeddingCards();
    return cards.find(
      (c) =>
        c.slug.toLowerCase() === clean ||
        c.id.toLowerCase() === clean ||
        (c.sku && c.sku.toLowerCase() === clean)
    );
  }

  static getDigitalServices(): LocalService[] {
    return DIGITAL_SERVICES;
  }

  static getServiceBySlug(slug: string): LocalService | undefined {
    return DIGITAL_SERVICES.find((s) => s.slug === slug || s.id === slug);
  }

  // --- Orders ---

  /**
   * Save an order to localStorage only (no Supabase sync).
   * Used by submitPrintOrder which manages its own authoritative Supabase insert.
   */
  static saveOrderToLocal(data: {
    orderCode: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    fulfillmentType: "pickup" | "delivery";
    deliveryAddress?: { street: string; landmark?: string; city: string; pincode: string };
    orderNotes?: string;
    subtotalAmount: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    userId?: string;
    staffNotes?: string;
    items: OrderItemPayload[];
  }): StoredOrder {
    const now = new Date().toISOString();
    const newOrder: StoredOrder = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      orderCode: data.orderCode,
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      fulfillmentType: data.fulfillmentType,
      deliveryAddress: data.deliveryAddress,
      orderNotes: data.orderNotes,
      subtotalAmount: data.subtotalAmount,
      deliveryFee: data.deliveryFee,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod as any,
      paymentStatus: (data.paymentStatus as any) || "pending",
      orderStatus: (data.orderStatus as any) || "NEW",
      items: data.items,
      staffNotes: data.staffNotes,
      createdAt: now,
      updatedAt: now,
    };

    const list = getLocal<StoredOrder[]>(ORDERS_KEY, []);
    list.unshift(newOrder);
    setLocal(ORDERS_KEY, list);

    this.addStatusHistory({
      entityType: "order",
      entityCode: data.orderCode,
      newStatus: "NEW",
      messageEn: "Order placed successfully. Palak team is reviewing specifications.",
      messageHi: "ऑर्डर सफलतापूर्वक दर्ज हुआ। पालक टीम विवरण की समीक्षा कर रही है।",
      performedBy: "Customer",
    });

    return newOrder;
  }
  static async createOrder(data: {
    orderCode?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    fulfillmentType: "pickup" | "delivery";
    deliveryAddress?: {
      street: string;
      landmark?: string;
      city: string;
      pincode: string;
    };
    orderNotes?: string;
    subtotalAmount: number;
    deliveryFee: number;
    totalAmount: number;
    paymentMethod: "pay_at_store" | "pay_after_confirmation" | "upi_online" | "pay_at_shop" | "pay_online";
    paymentStatus?: "pending" | "confirmed" | "paid" | "partial" | "refunded";
    orderStatus?: StoredOrder["orderStatus"];
    userId?: string;
    staffNotes?: string;
    items: OrderItemPayload[];
  }): Promise<StoredOrder> {
    const orderCode = data.orderCode || generateCode("O");
    const now = new Date().toISOString();
    const newOrder: StoredOrder = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      orderCode,
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      fulfillmentType: data.fulfillmentType,
      deliveryAddress: data.deliveryAddress,
      orderNotes: data.orderNotes,
      subtotalAmount: data.subtotalAmount,
      deliveryFee: data.deliveryFee,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: (data.paymentStatus as any) || "pending",
      orderStatus: data.orderStatus || "NEW",
      items: data.items,
      staffNotes: data.staffNotes,
      createdAt: now,
      updatedAt: now,
    };

    const list = getLocal<StoredOrder[]>(ORDERS_KEY, []);
    list.unshift(newOrder);
    setLocal(ORDERS_KEY, list);

    this.addStatusHistory({
      entityType: "order",
      entityCode: orderCode,
      newStatus: "NEW",
      messageEn: "Order placed successfully. Palak team is reviewing specifications.",
      messageHi: "ऑर्डर सफलतापूर्वक दर्ज हुआ। पालक टीम विवरण की समीक्षा कर रही है।",
      performedBy: "Customer",
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const normalizedPaymentMethod =
          data.paymentMethod === "upi_online" || data.paymentMethod === "pay_online"
            ? "upi_online"
            : data.paymentMethod === "pay_after_confirmation"
            ? "pay_after_confirmation"
            : "pay_at_store";

        const currentPaymentStatus = String(data.paymentStatus || "").toLowerCase();
        const normalizedPaymentStatus =
          currentPaymentStatus === "confirmed" || currentPaymentStatus === "paid"
            ? "confirmed"
            : currentPaymentStatus === "refunded"
            ? "refunded"
            : currentPaymentStatus === "failed"
            ? "failed"
            : "pending";

        const orderInsertPayload: any = {
          order_code: orderCode,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_email: data.customerEmail || null,
          fulfillment_type: data.fulfillmentType || "pickup",
          delivery_address: data.deliveryAddress || null,
          order_notes: data.orderNotes || null,
          subtotal_amount: data.subtotalAmount || 0,
          delivery_fee: data.deliveryFee || 0,
          total_amount: data.totalAmount || 0,
          payment_method: normalizedPaymentMethod,
          payment_status: normalizedPaymentStatus,
          order_status: data.orderStatus || "NEW",
          items: data.items || [],
          staff_notes: data.staffNotes || null,
        };

        // Only set user_id if it's a valid Supabase UUID (not a guest ID like cust_xxx)
        if (isValidSupabaseUUID(data.userId)) {
          orderInsertPayload.user_id = data.userId;
        }

        const { data: insertedOrder, error: orderErr } = await supabase
          .from("orders")
          .insert(orderInsertPayload)
          .select("id")
          .single();

        if (orderErr) {
          console.warn("[Palak Cloud] Order insert error:", orderErr.message || orderErr);
        } else if (insertedOrder?.id && data.items.length > 0) {
          const itemRows = data.items.map((item) => ({
            order_id: insertedOrder.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            selected_options: item.selectedOptions || {},
            selected_options_labels: item.selectedOptionsLabels || {},
            uploaded_file_url: item.uploadedFileUrl,
            uploaded_file_name: item.uploadedFileName,
            design_assistance_requested: Boolean(item.designAssistanceRequested),
            design_notes: item.designNotes,
          }));

          await supabase.from("order_items").insert(itemRows);

          // If file uploaded, record in order_files table
          for (const item of data.items) {
            if (item.uploadedFileUrl || item.uploadedFileName || item.selectedOptions?.storagePath) {
              const storagePath = item.selectedOptions?.storagePath || item.uploadedFileUrl || "";
              await supabase.from("order_files").insert({
                order_id: insertedOrder.id,
                file_name: item.uploadedFileName || "Document",
                file_path: storagePath,
                file_url: item.uploadedFileUrl || "",
                file_type: (item.selectedOptions as any)?.mimeType || "document",
                uploaded_by: data.customerName,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Supabase order cloud sync notice:", err);
      }
    }

    return newOrder;
  }

  static getOrders(): StoredOrder[] {
    return getLocal<StoredOrder[]>(ORDERS_KEY, []);
  }

  static getOrderByCode(code: string): StoredOrder | undefined {
    const clean = code.trim().toUpperCase();
    const list = this.getOrders();
    return list.find((o) => o.orderCode.toUpperCase() === clean);
  }

  static getOrdersByPhone(phone: string): StoredOrder[] {
    const clean = phone.replace(/\D/g, "");
    return this.getOrders().filter((o) => o.customerPhone.replace(/\D/g, "").includes(clean));
  }

  static updateOrderStatus(
    orderCode: string,
    newStatus: StoredOrder["orderStatus"],
    staffNotes?: string
  ): StoredOrder | null {
    const list = this.getOrders();
    const idx = list.findIndex((o) => o.orderCode === orderCode);
    if (idx === -1) return null;

    const prev = list[idx].orderStatus;
    list[idx].orderStatus = newStatus;
    list[idx].updatedAt = new Date().toISOString();
    if (staffNotes !== undefined) list[idx].staffNotes = staffNotes;
    setLocal(ORDERS_KEY, list);

    const statusMessages: Record<string, { en: string; hi: string }> = {
      NEW: { en: "Order placed and waiting for review.", hi: "ऑर्डर प्राप्त हुआ, समीक्षा प्रतीक्षा में।" },
      UNDER_REVIEW: { en: "Files and specifications checked by printing staff.", hi: "फाइल और डिजाइन की जांच की जा रही है।" },
      PAYMENT_PENDING: { en: "Estimate approved, waiting for payment confirmation.", hi: "भुगतान की प्रतीक्षा है।" },
      CONFIRMED: { en: "Order confirmed and queued for printing.", hi: "ऑर्डर कन्फर्म, प्रिंटिंग कतार में।" },
      DESIGN_REVIEW: { en: "Design proof sent for customer approval.", hi: "डिजाइन प्रूफ़ तैयार किया गया।" },
      IN_PRODUCTION: { en: "Your order is actively printing on the machine.", hi: "ऑर्डर मशीन पर प्रिंट हो रहा है।" },
      READY_FOR_PICKUP: { en: "Ready! You can collect from our Chakia store.", hi: "तैयार है! आप चकिया दुकान से प्राप्त कर सकते हैं।" },
      OUT_FOR_DELIVERY: { en: "Handed over to local delivery partner.", hi: "डिलीवरी के लिए भेज दिया गया है।" },
      COMPLETED: { en: "Order fulfilled and delivered. Thank you!", hi: "ऑर्डर पूर्ण व डिलीवर हो गया। धन्यवाद!" },
      CANCELLED: { en: "Order has been cancelled.", hi: "ऑर्डर रद्द कर दिया गया।" },
    };

    const msg = statusMessages[newStatus] || { en: `Status updated to ${newStatus}`, hi: `स्थिति ${newStatus} में अपडेट हुई` };

    this.addStatusHistory({
      entityType: "order",
      entityCode: orderCode,
      previousStatus: prev,
      newStatus,
      messageEn: msg.en,
      messageHi: msg.hi,
      performedBy: "Palak Staff",
    });

    return list[idx];
  }

  static updateOrderPaymentStatus(
    orderCode: string,
    paymentStatus: StoredOrder["paymentStatus"]
  ): StoredOrder | null {
    const list = this.getOrders();
    const idx = list.findIndex((o) => o.orderCode === orderCode);
    if (idx === -1) return null;

    list[idx].paymentStatus = paymentStatus;
    list[idx].updatedAt = new Date().toISOString();
    setLocal(ORDERS_KEY, list);

    this.addStatusHistory({
      entityType: "order",
      entityCode: orderCode,
      newStatus: list[idx].orderStatus,
      messageEn: `Payment status updated to ${paymentStatus}.`,
      messageHi: `भुगतान स्थिति ${paymentStatus} में अपडेट की गई।`,
      performedBy: "Palak Staff",
    });

    return list[idx];
  }

  static addStaffOrderNote(
    orderCode: string,
    note: string
  ): StoredOrder | null {
    const list = this.getOrders();
    const idx = list.findIndex((o) => o.orderCode === orderCode);
    if (idx === -1) return null;

    const existingNotes = list[idx].staffNotes || "";
    list[idx].staffNotes = existingNotes ? `${existingNotes} | ${note}` : note;
    list[idx].updatedAt = new Date().toISOString();
    setLocal(ORDERS_KEY, list);

    this.addStatusHistory({
      entityType: "order",
      entityCode: orderCode,
      newStatus: list[idx].orderStatus,
      messageEn: `Staff note added: "${note}".`,
      messageHi: `स्टाफ नोट जोड़ा गया: "${note}"।`,
      performedBy: "Palak Staff",
    });

    return list[idx];
  }

  // --- Digital Service Requests ---
  static async createServiceRequest(data: {
    requestCode?: string;
    serviceId: string;
    serviceName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    preferredContact: "whatsapp" | "phone" | "email";
    applicantDetails?: Record<string, string>;
    uploadedDocumentUrls?: string[];
    uploadedDocumentNames?: string[];
    additionalNotes?: string;
    estimatedFee?: number;
    requestStatus?: StoredServiceRequest["requestStatus"];
  }): Promise<StoredServiceRequest> {
    const requestCode = data.requestCode || generateCode("S");
    const now = new Date().toISOString();
    const newReq: StoredServiceRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      requestCode,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      preferredContact: data.preferredContact,
      applicantDetails: data.applicantDetails,
      uploadedDocumentUrls: data.uploadedDocumentUrls || [],
      uploadedDocumentNames: data.uploadedDocumentNames || [],
      additionalNotes: data.additionalNotes,
      estimatedFee: data.estimatedFee || 0,
      requestStatus: data.requestStatus || "NEW",
      createdAt: now,
      updatedAt: now,
    };

    const list = getLocal<StoredServiceRequest[]>(SERVICE_REQUESTS_KEY, []);
    list.unshift(newReq);
    setLocal(SERVICE_REQUESTS_KEY, list);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("service_requests").insert({
          request_code: requestCode,
          service_id: data.serviceId,
          service_name: data.serviceName,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_email: data.customerEmail,
          preferred_contact: data.preferredContact,
          applicant_details: data.applicantDetails,
          uploaded_document_urls: data.uploadedDocumentUrls || [],
          uploaded_document_names: data.uploadedDocumentNames || [],
          additional_notes: data.additionalNotes,
          estimated_fee: data.estimatedFee,
          request_status: "NEW",
        });
      } catch (err) {
        console.warn("Supabase service_requests sync notice:", err);
      }
    }

    this.addStatusHistory({
      entityType: "service_request",
      entityCode: requestCode,
      newStatus: "NEW",
      messageEn: "Service request received. Palak CSC operator will verify documents.",
      messageHi: "सेवा अनुरोध प्राप्त हुआ। पालक सीएससी ऑपरेटर दस्तावेजों की जांच करेंगे।",
      performedBy: "Customer",
    });

    return newReq;
  }

  static getServiceRequests(): StoredServiceRequest[] {
    return getLocal<StoredServiceRequest[]>(SERVICE_REQUESTS_KEY, []);
  }

  static getServiceRequestByCode(code: string): StoredServiceRequest | undefined {
    const clean = code.trim().toUpperCase();
    return this.getServiceRequests().find((r) => r.requestCode.toUpperCase() === clean);
  }

  static updateServiceRequestStatus(
    requestCode: string,
    newStatus: StoredServiceRequest["requestStatus"],
    staffNotes?: string,
    ackNumber?: string
  ): StoredServiceRequest | null {
    const list = this.getServiceRequests();
    const idx = list.findIndex((r) => r.requestCode === requestCode);
    if (idx === -1) return null;

    const prev = list[idx].requestStatus;
    list[idx].requestStatus = newStatus;
    list[idx].updatedAt = new Date().toISOString();
    if (staffNotes !== undefined) list[idx].staffNotes = staffNotes;
    if (ackNumber !== undefined) list[idx].acknowledgementNumber = ackNumber;
    setLocal(SERVICE_REQUESTS_KEY, list);

    const msgs: Record<string, { en: string; hi: string }> = {
      NEW: { en: "Application registered.", hi: "आवेदन दर्ज किया गया।" },
      DOCUMENTS_VERIFIED: { en: "Documents verified by operator.", hi: "दस्तावेजों का सत्यापन पूर्ण हुआ।" },
      IN_PROCESSING: { en: "Application is being drafted on the official portal.", hi: "आधिकारिक पोर्टल पर आवेदन भरा जा रहा है।" },
      ACTION_REQUIRED: { en: "Additional information or OTP needed from applicant.", hi: "आवेदक से ओटीपी या अतिरिक्त जानकारी की आवश्यकता है।" },
      SUBMITTED_TO_PORTAL: { en: "Successfully submitted to official portal. Application reference generated.", hi: "सरकारी पोर्टल पर आवेदन सफलतापूर्वक सबमिट हुआ।" },
      COMPLETED: { en: "Service completed & document ready for download/collection.", hi: "सेवा पूर्ण हुई एवं दस्तावेज डाउनलोड/प्राप्ति हेतु तैयार है।" },
      REJECTED: { en: "Request could not be processed due to document discrepancy.", hi: "दस्तावेज त्रुटि के कारण आवेदन आगे नहीं बढ़ सका।" },
    };

    const m = msgs[newStatus] || { en: `Status updated to ${newStatus}`, hi: `स्थिति अपडेट हुई` };

    this.addStatusHistory({
      entityType: "service_request",
      entityCode: requestCode,
      previousStatus: prev,
      newStatus,
      messageEn: m.en,
      messageHi: m.hi,
      performedBy: "Palak Operator",
    });

    return list[idx];
  }

  // --- Quote Requests ---
  static async createQuoteRequest(data: {
    serviceOrProductType: string;
    quantity: string;
    sizeSpecifications?: string;
    materialPreferences?: string;
    requiredByDate?: string;
    designStatus: "have_design" | "need_design" | "rough_idea";
    referenceFileUrls?: string[];
    referenceFileNames?: string[];
    additionalDetails?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    businessName?: string;
  }): Promise<StoredQuoteRequest> {
    const quoteCode = generateCode("Q");
    const now = new Date().toISOString();
    const newQuote: StoredQuoteRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      quoteCode,
      serviceOrProductType: data.serviceOrProductType,
      quantity: data.quantity,
      sizeSpecifications: data.sizeSpecifications,
      materialPreferences: data.materialPreferences,
      requiredByDate: data.requiredByDate,
      designStatus: data.designStatus,
      referenceFileUrls: data.referenceFileUrls || [],
      referenceFileNames: data.referenceFileNames || [],
      additionalDetails: data.additionalDetails,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      businessName: data.businessName,
      quoteStatus: "NEW",
      createdAt: now,
      updatedAt: now,
    };

    const list = getLocal<StoredQuoteRequest[]>(QUOTE_REQUESTS_KEY, []);
    list.unshift(newQuote);
    setLocal(QUOTE_REQUESTS_KEY, list);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("quote_requests").insert({
          quote_code: quoteCode,
          service_or_product_type: data.serviceOrProductType,
          quantity: data.quantity,
          size_specifications: data.sizeSpecifications,
          material_preferences: data.materialPreferences,
          required_by_date: data.requiredByDate,
          design_status: data.designStatus,
          reference_file_urls: data.referenceFileUrls || [],
          reference_file_names: data.referenceFileNames || [],
          additional_details: data.additionalDetails,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_email: data.customerEmail,
          business_name: data.businessName,
          quote_status: "NEW",
        });
      } catch (err) {
        console.warn("Supabase quote_requests sync notice:", err);
      }
    }

    this.addStatusHistory({
      entityType: "quote_request",
      entityCode: quoteCode,
      newStatus: "NEW",
      messageEn: "Quote request received. Our estimator is preparing best rate.",
      messageHi: "कोटेशन अनुरोध प्राप्त हुआ। हम सर्वोत्तम मूल्य तैयार कर रहे हैं।",
      performedBy: "Customer",
    });

    return newQuote;
  }

  static getQuoteRequests(): StoredQuoteRequest[] {
    return getLocal<StoredQuoteRequest[]>(QUOTE_REQUESTS_KEY, []);
  }

  static getQuoteRequestByCode(code: string): StoredQuoteRequest | undefined {
    const clean = code.trim().toUpperCase();
    return this.getQuoteRequests().find((q) => q.quoteCode.toUpperCase() === clean);
  }

  static updateQuoteStatus(
    quoteCode: string,
    newStatus: StoredQuoteRequest["quoteStatus"],
    quotedAmount?: number,
    staffNotes?: string
  ): StoredQuoteRequest | null {
    const list = this.getQuoteRequests();
    const idx = list.findIndex((q) => q.quoteCode === quoteCode);
    if (idx === -1) return null;

    list[idx].quoteStatus = newStatus;
    list[idx].updatedAt = new Date().toISOString();
    if (quotedAmount !== undefined) list[idx].quotedAmount = quotedAmount;
    if (staffNotes !== undefined) list[idx].staffNotes = staffNotes;
    setLocal(QUOTE_REQUESTS_KEY, list);

    this.addStatusHistory({
      entityType: "quote_request",
      entityCode: quoteCode,
      newStatus,
      messageEn: `Quote status updated to ${newStatus}${quotedAmount ? ` (Quoted: ₹${quotedAmount})` : ""}`,
      messageHi: `कोटेशन स्थिति अपडेट हुई${quotedAmount ? ` (अनुमानित मूल्य: ₹${quotedAmount})` : ""}`,
      performedBy: "Palak Estimator",
    });

    return list[idx];
  }

  // --- Design Requests ---
  static async createDesignRequest(data: {
    designCategory: string;
    titleOrEvent: string;
    contentText: string;
    colorPreferences?: string;
    referenceFileUrls?: string[];
    referenceFileNames?: string[];
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  }): Promise<StoredDesignRequest> {
    const designCode = generateCode("D");
    const now = new Date().toISOString();
    const newDesign: StoredDesignRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      designCode,
      designCategory: data.designCategory,
      titleOrEvent: data.titleOrEvent,
      contentText: data.contentText,
      colorPreferences: data.colorPreferences,
      referenceFileUrls: data.referenceFileUrls || [],
      referenceFileNames: data.referenceFileNames || [],
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      designStatus: "NEW",
      createdAt: now,
      updatedAt: now,
    };

    const list = getLocal<StoredDesignRequest[]>(DESIGN_REQUESTS_KEY, []);
    list.unshift(newDesign);
    setLocal(DESIGN_REQUESTS_KEY, list);

    this.addStatusHistory({
      entityType: "design_request",
      entityCode: designCode,
      newStatus: "NEW",
      messageEn: "Design job queued with Palak creative graphic studio.",
      messageHi: "डिजाइन कार्य पालक ग्राफिक स्टूडियो कतार में जोड़ा गया।",
      performedBy: "Customer",
    });

    return newDesign;
  }

  static getDesignRequests(): StoredDesignRequest[] {
    return getLocal<StoredDesignRequest[]>(DESIGN_REQUESTS_KEY, []);
  }

  static getDesignRequestByCode(code: string): StoredDesignRequest | undefined {
    const clean = code.trim().toUpperCase();
    return this.getDesignRequests().find((d) => d.designCode.toUpperCase() === clean);
  }

  static updateDesignStatus(
    designCode: string,
    newStatus: StoredDesignRequest["designStatus"],
    proofUrl?: string,
    staffNotes?: string
  ): StoredDesignRequest | null {
    const list = this.getDesignRequests();
    const idx = list.findIndex((d) => d.designCode === designCode);
    if (idx === -1) return null;

    list[idx].designStatus = newStatus;
    list[idx].updatedAt = new Date().toISOString();
    if (proofUrl) list[idx].proofFileUrl = proofUrl;
    if (staffNotes !== undefined) list[idx].staffNotes = staffNotes;
    setLocal(DESIGN_REQUESTS_KEY, list);

    this.addStatusHistory({
      entityType: "design_request",
      entityCode: designCode,
      newStatus,
      messageEn: `Design status updated to ${newStatus}`,
      messageHi: `ग्राफिक डिजाइन स्थिति अपडेट हुई`,
      performedBy: "Palak Designer",
    });

    return list[idx];
  }

  // --- Universal Status History ---
  static addStatusHistory(entry: {
    entityType: StatusHistoryLog["entityType"];
    entityCode: string;
    previousStatus?: string;
    newStatus: string;
    messageEn: string;
    messageHi: string;
    performedBy?: string;
  }): void {
    const log: StatusHistoryLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      entityType: entry.entityType,
      entityCode: entry.entityCode,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      messageEn: entry.messageEn,
      messageHi: entry.messageHi,
      performedBy: entry.performedBy || "System",
      createdAt: new Date().toISOString(),
    };

    const logs = getLocal<StatusHistoryLog[]>(STATUS_HISTORY_KEY, []);
    logs.unshift(log);
    setLocal(STATUS_HISTORY_KEY, logs);

    if (isSupabaseConfigured && supabase) {
      Promise.resolve(
        supabase.from("status_history").insert({
          entity_type: entry.entityType,
          entity_code: entry.entityCode,
          previous_status: entry.previousStatus,
          new_status: entry.newStatus,
          message_en: entry.messageEn,
          message_hi: entry.messageHi,
          performed_by: entry.performedBy || "System",
        })
      ).catch(() => {});
    }
  }

  static getStatusHistory(entityCode: string): StatusHistoryLog[] {
    const clean = entityCode.trim().toUpperCase();
    const logs = getLocal<StatusHistoryLog[]>(STATUS_HISTORY_KEY, []);
    return logs.filter((l) => l.entityCode.toUpperCase() === clean);
  }

  // --- Universal Lookup for Track Order Page ---
  static lookupAny(trackingCodeOrPhone: string): {
    orders: StoredOrder[];
    services: StoredServiceRequest[];
    quotes: StoredQuoteRequest[];
    designs: StoredDesignRequest[];
  } {
    const q = trackingCodeOrPhone.trim().toUpperCase();
    const numericQ = q.replace(/\D/g, "");

    const orders = this.getOrders().filter((o) => {
      if (o.orderCode.toUpperCase() === q) return true;
      if (numericQ.length >= 6 && o.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const services = this.getServiceRequests().filter((s) => {
      if (s.requestCode.toUpperCase() === q) return true;
      if (numericQ.length >= 6 && s.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const quotes = this.getQuoteRequests().filter((quote) => {
      if (quote.quoteCode.toUpperCase() === q) return true;
      if (numericQ.length >= 6 && quote.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const designs = this.getDesignRequests().filter((d) => {
      if (d.designCode.toUpperCase() === q) return true;
      if (numericQ.length >= 6 && d.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    return { orders, services, quotes, designs };
  }
}
