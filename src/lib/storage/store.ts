import { supabase, isSupabaseConfigured } from "../supabase/client";
import { PRODUCTS, DIGITAL_SERVICES, CATEGORIES, type LocalProduct, type LocalService, type LocalCategory } from "./catalogData";
import { getQueueClassification, type QueueType, type QueuePriority } from "../queue";
import { PalakInvoiceStore } from "../invoice/invoiceStore";
import type { StoredInvoice } from "../invoice/types";
import { dispatchNewOrderLocally, dispatchOrderUpdatedLocally, dispatchOrderDeletedLocally } from "../realtime/adminOrderEvents";
import type { OrderChargesBreakdown } from "../charges/types";
import { calculateOrderCharges } from "../charges/pricingEngine";

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
  discountAmount?: number;
  deliveryFee: number;
  platformFee?: number;
  serviceCharge?: number;
  otherCharges?: number;
  taxAmount?: number;
  taxRate?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  chargesSnapshot?: OrderChargesBreakdown;
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
  // Explicit Queue fields
  queueType?: QueueType;
  queuePriority?: QueuePriority;
  queuePosition?: number;
  submittedAt?: string;
  priorityAt?: string;
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
const PRODUCTS_CATALOG_KEY = "palak_products_catalog_v2";
const SERVICES_CATALOG_KEY = "palak_services_catalog_v2";
const CATEGORIES_CATALOG_KEY = "palak_categories_catalog_v2";

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

// Helper to load stored products merging with base PRODUCTS catalog
function loadStoredProducts(): LocalProduct[] {
  if (typeof window === "undefined") return PRODUCTS;
  try {
    const raw = localStorage.getItem(PRODUCTS_CATALOG_KEY);
    if (!raw) return PRODUCTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const storedMap = new Map<string, LocalProduct>();
      parsed.forEach((p: LocalProduct) => {
        if (p.id) storedMap.set(p.id, p);
        if (p.slug) storedMap.set(p.slug, p);
      });
      const merged = PRODUCTS.map((base) => {
        const custom = storedMap.get(base.id) || storedMap.get(base.slug);
        return custom ? { ...base, ...custom } : base;
      });
      // Append any custom products added that aren't in base catalog
      parsed.forEach((p: LocalProduct) => {
        if (!merged.some((m) => m.id === p.id || m.slug === p.slug)) {
          merged.push(p);
        }
      });
      return merged;
    }
    return PRODUCTS;
  } catch {
    return PRODUCTS;
  }
}

function loadStoredServices(): LocalService[] {
  if (typeof window === "undefined") return DIGITAL_SERVICES;
  try {
    const raw = localStorage.getItem(SERVICES_CATALOG_KEY);
    if (!raw) return DIGITAL_SERVICES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const storedMap = new Map<string, LocalService>();
      parsed.forEach((s: LocalService) => {
        if (s.id) storedMap.set(s.id, s);
        if (s.slug) storedMap.set(s.slug, s);
      });
      const merged = DIGITAL_SERVICES.map((base) => {
        const custom = storedMap.get(base.id) || storedMap.get(base.slug);
        return custom ? { ...base, ...custom } : base;
      });
      parsed.forEach((s: LocalService) => {
        if (!merged.some((m) => m.id === s.id || m.slug === s.slug)) {
          merged.push(s);
        }
      });
      return merged;
    }
    return DIGITAL_SERVICES;
  } catch {
    return DIGITAL_SERVICES;
  }
}

function loadStoredCategories(): LocalCategory[] {
  if (typeof window === "undefined") return CATEGORIES;
  try {
    const raw = localStorage.getItem(CATEGORIES_CATALOG_KEY);
    if (!raw) return CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CATEGORIES;
  } catch {
    return CATEGORIES;
  }
}

// In-flight mutex to eliminate duplicate submissions from concurrent clicks / rapid retries
const inFlightOrderSubmissions = new Map<string, Promise<StoredOrder>>();
const recentOrderSubmissionKeys = new Set<string>();

// Generate code format: PE-O-20260822-1042
function generateCode(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PE-${prefix}-${year}${month}${day}-${rand}`;
}

/** Returns true only for valid UUID strings that can be stored in Supabase user_id columns */
function isValidSupabaseUUID(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// In-memory synchronized catalog cache
let cachedDbProducts: LocalProduct[] | null = null;
let cachedDbServices: LocalService[] | null = null;
let cachedDbCategories: LocalCategory[] | null = null;

export function normalizeOrder(raw: any): StoredOrder {
  if (!raw) {
    throw new Error("Cannot normalize null/undefined order");
  }

  const orderCode = String(raw.order_code || raw.orderCode || raw.order_id || raw.id || "ORD-NEW").trim().toUpperCase();
  const id = String(raw.id || orderCode);
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt;

  let itemsList: OrderItemPayload[] = [];
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    itemsList = raw.items;
  } else if (typeof raw.items === "string") {
    try {
      const parsed = JSON.parse(raw.items);
      if (Array.isArray(parsed)) itemsList = parsed;
    } catch {}
  }

  if (itemsList.length === 0 && Array.isArray(raw.order_items) && raw.order_items.length > 0) {
    itemsList = raw.order_items.map((it: any) => ({
      productId: it.product_id || it.productId || "service",
      productName: it.product_name || it.productName || "Print Service",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price || it.unitPrice) || 0,
      totalPrice: Number(it.total_price || it.totalPrice) || 0,
      selectedOptions: it.selected_options || it.selectedOptions || {},
      selectedOptionsLabels: it.selected_options_labels || it.selectedOptionsLabels || {},
      uploadedFileName: it.uploaded_file_name || it.uploadedFileName,
      uploadedFileUrl: it.uploaded_file_url || it.uploadedFileUrl,
      designAssistanceRequested: Boolean(it.design_assistance_requested || it.designAssistanceRequested),
      designNotes: it.design_notes || it.designNotes,
    }));
  }

  const normalizedItems: OrderItemPayload[] = itemsList.map((it: any) => ({
    productId: it.productId || it.product_id || "print-service",
    productName: it.productName || it.product_name || "Print Order",
    quantity: Math.max(1, Number(it.quantity) || 1),
    unitPrice: Math.max(0, Number(it.unitPrice || it.unit_price) || 0),
    totalPrice: Math.max(0, Number(it.totalPrice || it.total_price) || 0),
    selectedOptions: it.selectedOptions || it.selected_options || {},
    selectedOptionsLabels: it.selectedOptionsLabels || it.selected_options_labels || {},
    uploadedFileName: it.uploadedFileName || it.uploaded_file_name,
    uploadedFileUrl: it.uploadedFileUrl || it.uploaded_file_url,
    designAssistanceRequested: Boolean(it.designAssistanceRequested || it.design_assistance_requested),
    designNotes: it.designNotes || it.design_notes,
  }));

  let payStatus = String(raw.payment_status || raw.paymentStatus || "pending").toLowerCase();
  if (payStatus === "success" || payStatus === "completed" || payStatus === "captured") payStatus = "paid";
  if (payStatus === "pay_at_shop" || payStatus === "pay_at_counter" || payStatus === "cash") payStatus = "pending";

  let ordStatus = String(raw.order_status || raw.orderStatus || "NEW").toUpperCase();
  if (ordStatus === "PENDING" || ordStatus === "SUBMITTED" || ordStatus === "RECEIVED") ordStatus = "NEW";
  if (ordStatus === "PRINTING") ordStatus = "IN_PRODUCTION";
  if (ordStatus === "READY" || ordStatus === "PRINTED") ordStatus = "READY_FOR_PICKUP";
  if (ordStatus === "DELIVERED" || ordStatus === "FULFILLED") ordStatus = "COMPLETED";

  const totalAmount = Math.max(0, Number(raw.total_amount ?? raw.totalAmount ?? 0));
  const subtotalAmount = Math.max(0, Number(raw.subtotal_amount ?? raw.subtotalAmount ?? totalAmount));
  const deliveryFee = Math.max(0, Number(raw.delivery_fee ?? raw.deliveryFee ?? 0));
  const discountAmount = Math.max(0, Number(raw.discount_amount ?? raw.discountAmount ?? 0));

  const custPhone = String(raw.customer_phone || raw.customerPhone || "").trim();
  const custName = String(
    raw.customer_name ||
    raw.customerName ||
    (custPhone ? `Customer (${custPhone})` : "Guest Customer")
  ).trim();

  const qMeta = getQueueClassification({
    queueType: raw.queue_type || raw.queueType,
    queuePriority: raw.queue_priority || raw.queuePriority,
    submittedAt: raw.submitted_at || raw.submittedAt || createdAt,
    priorityAt: raw.priority_at || raw.priorityAt,
    paymentMethod: raw.payment_method || raw.paymentMethod || "pay_at_store",
    paymentStatus: payStatus as StoredOrder["paymentStatus"],
    orderNotes: raw.order_notes || raw.orderNotes,
    createdAt: createdAt,
  });

  return {
    id,
    orderCode,
    userId: raw.user_id || raw.userId || undefined,
    customerName: custName,
    customerPhone: custPhone,
    customerEmail: raw.customer_email || raw.customerEmail || undefined,
    fulfillmentType: (raw.fulfillment_type || raw.fulfillmentType || "pickup") as "pickup" | "delivery",
    deliveryAddress: raw.delivery_address || raw.deliveryAddress || undefined,
    orderNotes: raw.order_notes || raw.orderNotes || undefined,
    subtotalAmount,
    discountAmount,
    deliveryFee,
    platformFee: raw.platform_fee || raw.platformFee,
    serviceCharge: raw.service_charge || raw.serviceCharge,
    otherCharges: raw.other_charges || raw.otherCharges,
    taxAmount: raw.tax_amount || raw.taxAmount,
    taxRate: raw.tax_rate || raw.taxRate,
    taxableAmount: raw.taxable_amount || raw.taxableAmount,
    cgstAmount: raw.cgst_amount || raw.cgstAmount,
    sgstAmount: raw.sgst_amount || raw.sgstAmount,
    igstAmount: raw.igst_amount || raw.igstAmount,
    chargesSnapshot: raw.charges_snapshot || raw.chargesSnapshot,
    totalAmount,
    paymentMethod: (raw.payment_method || raw.paymentMethod || "pay_at_store") as any,
    paymentStatus: payStatus as any,
    orderStatus: ordStatus as any,
    items: normalizedItems,
    staffNotes: raw.staff_notes || raw.staffNotes || undefined,
    createdAt,
    updatedAt,
    queueType: qMeta.queueType,
    queuePriority: qMeta.queuePriority,
    submittedAt: qMeta.submittedAt,
    priorityAt: qMeta.priorityAt,
  };
}

export class PalakDataStore {
  // --- Dynamic Synchronization Setters ---
  static setProducts(list: LocalProduct[]): void {
    if (Array.isArray(list) && list.length > 0) {
      cachedDbProducts = list;
      setLocal(PRODUCTS_CATALOG_KEY, list);
      this.notifyCatalogChange();
    }
  }

  static setDigitalServices(list: LocalService[]): void {
    if (Array.isArray(list) && list.length > 0) {
      cachedDbServices = list;
      setLocal(SERVICES_CATALOG_KEY, list);
      this.notifyCatalogChange();
    }
  }

  static setCategories(list: LocalCategory[]): void {
    if (Array.isArray(list) && list.length > 0) {
      cachedDbCategories = list;
      setLocal(CATEGORIES_CATALOG_KEY, list);
      this.notifyCatalogChange();
    }
  }

  static notifyCatalogChange(): void {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("palak_catalog_updated"));
      } catch {}
    }
  }

  // --- Catalog updates & mutations ---
  static updateProductPrice(idOrSlug: string, startingPrice: number): boolean {
    const current = this.getProducts();
    const index = current.findIndex(
      (p) => p.id === idOrSlug || p.slug === idOrSlug || (p.sku && p.sku.toLowerCase() === idOrSlug.toLowerCase())
    );
    if (index === -1) {
      const base = PRODUCTS.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
      if (base) {
        const updated = [...current, { ...base, startingPrice, ...(base.pricePerCard !== undefined ? { pricePerCard: startingPrice } : {}) }];
        this.setProducts(updated);
        return true;
      }
      return false;
    }
    const updatedItem = {
      ...current[index],
      startingPrice,
      ...(current[index].pricePerCard !== undefined ? { pricePerCard: startingPrice } : {}),
    };
    const updatedList = [...current];
    updatedList[index] = updatedItem;
    this.setProducts(updatedList);
    return true;
  }

  static updateProduct(idOrSlug: string, updates: Partial<LocalProduct>): boolean {
    const current = this.getProducts();
    const index = current.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (index === -1) {
      const newProd = updates as LocalProduct;
      if (newProd.id && newProd.name) {
        this.setProducts([...current, newProd]);
        return true;
      }
      return false;
    }
    const updatedList = [...current];
    updatedList[index] = { ...updatedList[index], ...updates };
    this.setProducts(updatedList);
    return true;
  }

  static deleteProduct(idOrSlug: string): boolean {
    const current = this.getProducts();
    const filtered = current.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
    this.setProducts(filtered);
    return true;
  }

  static updateServiceFee(idOrSlug: string, estimatedFee: number): boolean {
    const current = this.getDigitalServices();
    const index = current.findIndex((s) => s.id === idOrSlug || s.slug === idOrSlug);
    if (index === -1) return false;
    const updatedList = [...current];
    updatedList[index] = { ...updatedList[index], estimatedFee };
    this.setDigitalServices(updatedList);
    return true;
  }

  static updateService(idOrSlug: string, updates: Partial<LocalService>): boolean {
    const current = this.getDigitalServices();
    const index = current.findIndex((s) => s.id === idOrSlug || s.slug === idOrSlug);
    if (index === -1) {
      const newServ = updates as LocalService;
      if (newServ.id && newServ.name) {
        this.setDigitalServices([...current, newServ]);
        return true;
      }
      return false;
    }
    const updatedList = [...current];
    updatedList[index] = { ...updatedList[index], ...updates };
    this.setDigitalServices(updatedList);
    return true;
  }

  static deleteService(idOrSlug: string): boolean {
    const current = this.getDigitalServices();
    const filtered = current.filter((s) => s.id !== idOrSlug && s.slug !== idOrSlug);
    this.setDigitalServices(filtered);
    return true;
  }

  // --- Catalog access ---
  static getCategories(): LocalCategory[] {
    if (cachedDbCategories && cachedDbCategories.length > 0) return cachedDbCategories;
    cachedDbCategories = loadStoredCategories();
    return cachedDbCategories;
  }

  static getProducts(): LocalProduct[] {
    if (cachedDbProducts && cachedDbProducts.length > 0) return cachedDbProducts;
    cachedDbProducts = loadStoredProducts();
    return cachedDbProducts;
  }

  static getProductBySlug(slug: string): LocalProduct | undefined {
    const list = this.getProducts();
    return list.find((p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase()));
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
    const list = (cachedDbProducts && cachedDbProducts.length > 0) ? cachedDbProducts : PRODUCTS;
    let cards = list.filter(
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
    if (cachedDbServices && cachedDbServices.length > 0) return cachedDbServices;
    cachedDbServices = loadStoredServices();
    return cachedDbServices;
  }

  static getServiceBySlug(slug: string): LocalService | undefined {
    const list = this.getDigitalServices();
    return list.find((s) => s.slug === slug || s.id === slug);
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
    discountAmount?: number;
    deliveryFee: number;
    platformFee?: number;
    serviceCharge?: number;
    otherCharges?: number;
    taxAmount?: number;
    taxRate?: number;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    chargesSnapshot?: OrderChargesBreakdown;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    userId?: string;
    staffNotes?: string;
    items: OrderItemPayload[];
    queueType?: QueueType;
    queuePriority?: QueuePriority;
    submittedAt?: string;
    priorityAt?: string;
  }): StoredOrder {
    const now = new Date().toISOString();
    const queueMeta = getQueueClassification({
      queueType: data.queueType,
      queuePriority: data.queuePriority,
      submittedAt: data.submittedAt || now,
      priorityAt: data.priorityAt,
      paymentMethod: data.paymentMethod as any,
      paymentStatus: data.paymentStatus as any,
      orderNotes: data.orderNotes,
      createdAt: now,
    });

    const snapshot = data.chargesSnapshot || calculateOrderCharges({
      subtotal: data.subtotalAmount,
      quantity: data.items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0),
      discount: data.discountAmount || 0,
      fulfillmentType: data.fulfillmentType,
      customDeliveryFee: data.deliveryFee,
    });

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
      subtotalAmount: snapshot.subtotal,
      discountAmount: snapshot.discount,
      deliveryFee: snapshot.deliveryFee,
      platformFee: snapshot.platformFee,
      serviceCharge: snapshot.serviceCharge,
      otherCharges: snapshot.otherCharges,
      taxAmount: snapshot.taxAmount,
      taxRate: snapshot.taxRate,
      taxableAmount: snapshot.taxableAmount,
      cgstAmount: snapshot.cgstAmount,
      sgstAmount: snapshot.sgstAmount,
      igstAmount: snapshot.igstAmount,
      chargesSnapshot: snapshot,
      totalAmount: snapshot.grandTotal > 0 ? snapshot.grandTotal : data.totalAmount,
      paymentMethod: data.paymentMethod as any,
      paymentStatus: (data.paymentStatus as any) || "pending",
      orderStatus: (data.orderStatus as any) || "NEW",
      items: data.items,
      staffNotes: data.staffNotes,
      createdAt: now,
      updatedAt: now,
      queueType: queueMeta.queueType,
      queuePriority: queueMeta.queuePriority,
      submittedAt: queueMeta.submittedAt,
      priorityAt: queueMeta.priorityAt,
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
    discountAmount?: number;
    deliveryFee: number;
    platformFee?: number;
    serviceCharge?: number;
    otherCharges?: number;
    taxAmount?: number;
    taxRate?: number;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    chargesSnapshot?: OrderChargesBreakdown;
    totalAmount: number;
    paymentMethod: "pay_at_store" | "pay_after_confirmation" | "upi_online" | "pay_at_shop" | "pay_online";
    paymentStatus?: "pending" | "confirmed" | "paid" | "partial" | "refunded";
    orderStatus?: StoredOrder["orderStatus"];
    userId?: string;
    staffNotes?: string;
    items: OrderItemPayload[];
    queueType?: QueueType;
    queuePriority?: QueuePriority;
    submittedAt?: string;
    priorityAt?: string;
  }): Promise<StoredOrder> {
    const markStart = `order_submit_start_${Date.now()}`;
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(markStart);
    }

    // 1. Idempotency Lock: Build unique signature to deduplicate rapid duplicate clicks
    const sanitizedPhone = data.customerPhone.trim();
    const itemsSig = (data.items || []).map((i) => `${i.productId}_${i.quantity}_${i.totalPrice}`).join("|");
    const idempotencyKey = `${sanitizedPhone}_${itemsSig}_${data.totalAmount}_${data.paymentMethod}`;

    if (inFlightOrderSubmissions.has(idempotencyKey)) {
      console.warn("[PalakDataStore] In-flight order deduplication triggered for key:", idempotencyKey);
      return inFlightOrderSubmissions.get(idempotencyKey)!;
    }

    const orderExecutionPromise = (async () => {
      const orderCode = data.orderCode || generateCode("O");
      const now = new Date().toISOString();

      const sanitizedItems = (data.items || []).map((item) => ({
        ...item,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        totalPrice: Math.max(0, Number(item.totalPrice) || 0),
      }));

      const totalQty = sanitizedItems.reduce((acc, i) => acc + i.quantity, 0);

      // Compute or use authoritative charges snapshot
      const snapshot = data.chargesSnapshot || calculateOrderCharges({
        subtotal: data.subtotalAmount,
        quantity: totalQty,
        discount: data.discountAmount || 0,
        fulfillmentType: data.fulfillmentType,
        customDeliveryFee: data.deliveryFee,
      });

      const queueMeta = getQueueClassification({
        queueType: data.queueType,
        queuePriority: data.queuePriority,
        submittedAt: data.submittedAt || now,
        priorityAt: data.priorityAt,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus as any,
        orderNotes: data.orderNotes,
        createdAt: now,
      });

      const finalTotalAmount = snapshot.grandTotal > 0 ? snapshot.grandTotal : data.totalAmount;

      const newOrder: StoredOrder = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        orderCode,
        userId: data.userId,
        customerName: data.customerName.trim(),
        customerPhone: sanitizedPhone,
        customerEmail: data.customerEmail?.trim() || undefined,
        fulfillmentType: data.fulfillmentType,
        deliveryAddress: data.deliveryAddress,
        orderNotes: data.orderNotes?.trim() || undefined,
        subtotalAmount: snapshot.subtotal,
        discountAmount: snapshot.discount,
        deliveryFee: snapshot.deliveryFee,
        platformFee: snapshot.platformFee,
        serviceCharge: snapshot.serviceCharge,
        otherCharges: snapshot.otherCharges,
        taxAmount: snapshot.taxAmount,
        taxRate: snapshot.taxRate,
        taxableAmount: snapshot.taxableAmount,
        cgstAmount: snapshot.cgstAmount,
        sgstAmount: snapshot.sgstAmount,
        igstAmount: snapshot.igstAmount,
        chargesSnapshot: snapshot,
        totalAmount: finalTotalAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: (data.paymentStatus as any) || "pending",
        orderStatus: data.orderStatus || "NEW",
        items: sanitizedItems,
        staffNotes: data.staffNotes,
        createdAt: now,
        updatedAt: now,
        queueType: queueMeta.queueType,
        queuePriority: queueMeta.queuePriority,
        submittedAt: queueMeta.submittedAt,
        priorityAt: queueMeta.priorityAt,
      };

      // 2. Persist locally first for offline-first instant durability
      const list = getLocal<StoredOrder[]>(ORDERS_KEY, []);
      list.unshift(newOrder);
      setLocal(ORDERS_KEY, list);

      // Local status history entry
      this.addStatusHistory({
        entityType: "order",
        entityCode: orderCode,
        newStatus: "NEW",
        messageEn: "Order placed successfully. Palak team is reviewing specifications.",
        messageHi: "ऑर्डर सफलतापूर्वक दर्ज हुआ। पालक टीम विवरण की समीक्षा कर रही है।",
        performedBy: "Customer",
      });

      // 3. Dispatch realtime event locally (non-blocking for UI)
      try {
        const firstItem = sanitizedItems.length > 0 ? sanitizedItems[0] : null;
        let serviceTitle = firstItem ? firstItem.productName : "Print Order";
        if (sanitizedItems.length > 1) {
          serviceTitle += ` + ${sanitizedItems.length - 1} more`;
        }

        dispatchNewOrderLocally({
          id: newOrder.id,
          orderCode: newOrder.orderCode,
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone,
          totalAmount: newOrder.totalAmount,
          orderStatus: newOrder.orderStatus,
          paymentStatus: newOrder.paymentStatus,
          paymentMethod: newOrder.paymentMethod,
          serviceName: serviceTitle,
          items: sanitizedItems,
          createdAt: newOrder.createdAt,
          source: "local_store",
        });
      } catch (e) {
        console.debug("[Realtime Bus] Local dispatch notice:", e);
      }

      // 4. Critical Database Persistence (Fast-path: Single Atomic Supabase RPC Round-Trip)
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

          const validUserId = isValidSupabaseUUID(data.userId) ? data.userId : null;

          // Prepare extracted file objects across all items for atomic insertion
          const extractedFiles: any[] = [];
          sanitizedItems.forEach((item) => {
            if (item.uploadedFileUrl || item.uploadedFileName || item.selectedOptions?.storagePath) {
              const storagePath = item.selectedOptions?.storagePath || item.uploadedFileUrl || "";
              extractedFiles.push({
                name: item.uploadedFileName || "Document",
                path: storagePath,
                url: item.uploadedFileUrl || "",
                type: (item.selectedOptions as any)?.mimeType || "application/pdf",
                size: (item.selectedOptions as any)?.fileSize || 0,
              });
            }
          });

          // Primary Path: Use atomic SECURITY DEFINER PostgreSQL RPC (1 single network roundtrip)
          const { data: _rpcData, error: rpcErr } = await supabase.rpc("create_online_print_order", {
            p_order_code: orderCode,
            p_customer_name: data.customerName.trim(),
            p_customer_phone: sanitizedPhone,
            p_customer_email: data.customerEmail?.trim() || null,
            p_fulfillment_type: data.fulfillmentType || "pickup",
            p_delivery_address: data.deliveryAddress ? (data.deliveryAddress as any) : null,
            p_order_notes: data.orderNotes?.trim() || null,
            p_subtotal_amount: snapshot.subtotal,
            p_delivery_fee: snapshot.deliveryFee,
            p_total_amount: finalTotalAmount,
            p_payment_method: normalizedPaymentMethod,
            p_payment_status: normalizedPaymentStatus,
            p_user_id: validUserId,
            p_staff_notes: data.staffNotes || null,
            p_items: sanitizedItems as any,
            p_files: extractedFiles as any,
          });

          if (rpcErr) {
            console.warn("[Palak Cloud] RPC notice, utilizing parallel batch fallback:", rpcErr.message || rpcErr);

            // Resilient Fallback: Direct table batch insertion with parallel item/file execution
            const orderInsertPayload: any = {
              order_code: orderCode,
              customer_name: data.customerName.trim(),
              customer_phone: sanitizedPhone,
              customer_email: data.customerEmail?.trim() || null,
              fulfillment_type: data.fulfillmentType || "pickup",
              delivery_address: data.deliveryAddress || null,
              order_notes: data.orderNotes?.trim() || null,
              subtotal_amount: snapshot.subtotal,
              discount_amount: snapshot.discount,
              delivery_fee: snapshot.deliveryFee,
              total_amount: finalTotalAmount,
              payment_method: normalizedPaymentMethod,
              payment_status: normalizedPaymentStatus,
              order_status: data.orderStatus || "NEW",
              items: sanitizedItems,
              staff_notes: data.staffNotes || null,
            };
            if (validUserId) orderInsertPayload.user_id = validUserId;

            const { data: insertedOrder, error: orderErr } = await supabase
              .from("orders")
              .insert(orderInsertPayload)
              .select("id")
              .single();

            if (!orderErr && insertedOrder?.id && sanitizedItems.length > 0) {
              const itemRows = sanitizedItems.map((item) => ({
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

              const fileRows = extractedFiles.map((f) => ({
                order_id: insertedOrder.id,
                file_name: f.name,
                file_path: f.path,
                file_url: f.url,
                file_type: f.type,
                file_size: f.size,
                uploaded_by: data.customerName.trim(),
              }));

              // Execute item and file batch insertions in parallel (Promise.all)
              await Promise.all([
                supabase.from("order_items").insert(itemRows),
                fileRows.length > 0 ? supabase.from("order_files").insert(fileRows) : Promise.resolve(),
              ]);
            }
          }
        } catch (err) {
          console.warn("[Palak Cloud] Order sync notice (safely stored locally):", err);
        }
      }

      if (typeof performance !== "undefined" && performance.mark && performance.measure) {
        const markEnd = `order_submit_end_${Date.now()}`;
        performance.mark(markEnd);
        try {
          performance.measure("order_submission_duration", markStart, markEnd);
          const entries = performance.getEntriesByName("order_submission_duration");
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            console.log(`⚡ [Performance] Order ${orderCode} submission completed in ${Math.round(lastEntry.duration)}ms`);
          }
        } catch {}
      }

      return newOrder;
    })();

    // Store in active mutex map
    inFlightOrderSubmissions.set(idempotencyKey, orderExecutionPromise);
    recentOrderSubmissionKeys.add(idempotencyKey);
    setTimeout(() => {
      recentOrderSubmissionKeys.delete(idempotencyKey);
    }, 5000);

    try {
      return await orderExecutionPromise;
    } finally {
      inFlightOrderSubmissions.delete(idempotencyKey);
    }
  }

  static getOrders(): StoredOrder[] {
    const raw = getLocal<StoredOrder[]>(ORDERS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((o) => {
      try {
        return normalizeOrder(o);
      } catch {
        return o;
      }
    });
  }

  static clearAllOrders(): void {
    setLocal(ORDERS_KEY, []);
    // Also clear status history for orders
    const logs = getLocal<StatusHistoryLog[]>(STATUS_HISTORY_KEY, []);
    setLocal(STATUS_HISTORY_KEY, logs.filter((l) => l.entityType !== "order"));
    // Prune all orphaned invoices
    PalakInvoiceStore.pruneOrphanedInvoices(new Set());
    try {
      dispatchOrderDeletedLocally({ orderCode: "", id: "" });
    } catch {}
  }

  static syncOrdersFromCloud(cloudOrders: StoredOrder[]): void {
    if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
      const existing = this.getOrders();
      const mergedMap = new Map<string, StoredOrder>();

      // 1. Existing local records
      existing.forEach((o) => {
        if (o && o.orderCode) {
          try {
            mergedMap.set(o.orderCode.trim().toUpperCase(), normalizeOrder(o));
          } catch {}
        }
      });

      // 2. Cloud records take precedence
      cloudOrders.forEach((o) => {
        if (o && o.orderCode) {
          const key = o.orderCode.trim().toUpperCase();
          const prev = mergedMap.get(key);
          try {
            const normalized = normalizeOrder({ ...prev, ...o });
            mergedMap.set(key, normalized);
          } catch {}
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setLocal(ORDERS_KEY, mergedList);

      const validCodes = new Set(mergedList.map((o) => o.orderCode.trim().toUpperCase()));
      const logs = getLocal<StatusHistoryLog[]>(STATUS_HISTORY_KEY, []);
      setLocal(STATUS_HISTORY_KEY, logs.filter((l) => l.entityType !== "order" || validCodes.has(l.entityCode.toUpperCase())));
      PalakInvoiceStore.pruneOrphanedInvoices(validCodes);
    }
  }

  static deleteOrder(orderCode: string): boolean {
    const list = this.getOrders();
    const clean = orderCode.trim().toUpperCase();
    const target = list.find((o) => o.orderCode.toUpperCase() === clean);
    if (!target) return false;

    const filtered = list.filter((o) => o.orderCode.toUpperCase() !== clean);
    setLocal(ORDERS_KEY, filtered);

    const validCodes = new Set(filtered.map((o) => o.orderCode.toUpperCase()));
    const logs = getLocal<StatusHistoryLog[]>(STATUS_HISTORY_KEY, []);
    setLocal(STATUS_HISTORY_KEY, logs.filter((l) => l.entityType !== "order" || validCodes.has(l.entityCode.toUpperCase())));
    PalakInvoiceStore.pruneOrphanedInvoices(validCodes);

    try {
      dispatchOrderDeletedLocally({ orderCode: target.orderCode, id: target.id });
    } catch {}

    return true;
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

    // Auto-generate invoice when order reaches COMPLETED state
    if (newStatus === "COMPLETED") {
      PalakInvoiceStore.generateInvoiceForOrder(list[idx], {
        performedBy: "Palak Staff",
      }).catch((invErr) => {
        console.warn("[Palak Invoices] Auto-generation notice:", invErr);
      });
    }

    try {
      dispatchOrderUpdatedLocally({
        id: list[idx].id,
        orderCode: list[idx].orderCode,
        customerName: list[idx].customerName,
        customerPhone: list[idx].customerPhone,
        totalAmount: list[idx].totalAmount,
        orderStatus: list[idx].orderStatus,
        paymentStatus: list[idx].paymentStatus,
        paymentMethod: list[idx].paymentMethod,
        serviceName: list[idx].items?.[0]?.productName || "Print Order",
        items: list[idx].items,
        createdAt: list[idx].createdAt,
        source: "local_store",
      });
    } catch {}

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

    try {
      dispatchOrderUpdatedLocally({
        id: list[idx].id,
        orderCode: list[idx].orderCode,
        customerName: list[idx].customerName,
        customerPhone: list[idx].customerPhone,
        totalAmount: list[idx].totalAmount,
        orderStatus: list[idx].orderStatus,
        paymentStatus: list[idx].paymentStatus,
        paymentMethod: list[idx].paymentMethod,
        serviceName: list[idx].items?.[0]?.productName || "Print Order",
        items: list[idx].items,
        createdAt: list[idx].createdAt,
        source: "local_store",
      });
    } catch {}

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
      const code = o.orderCode.toUpperCase();
      if (code === q || (q.length >= 3 && code.includes(q))) return true;
      if (numericQ.length >= 6 && o.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const services = this.getServiceRequests().filter((s) => {
      const code = s.requestCode.toUpperCase();
      if (code === q || (q.length >= 3 && code.includes(q))) return true;
      if (numericQ.length >= 6 && s.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const quotes = this.getQuoteRequests().filter((quote) => {
      const code = quote.quoteCode.toUpperCase();
      if (code === q || (q.length >= 3 && code.includes(q))) return true;
      if (numericQ.length >= 6 && quote.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    const designs = this.getDesignRequests().filter((d) => {
      const code = d.designCode.toUpperCase();
      if (code === q || (q.length >= 3 && code.includes(q))) return true;
      if (numericQ.length >= 6 && d.customerPhone.replace(/\D/g, "").includes(numericQ)) return true;
      return false;
    });

    return { orders, services, quotes, designs };
  }

  // --- Invoices & Billing Operations ---
  static getInvoiceForOrder(orderCode: string): StoredInvoice | undefined {
    return PalakInvoiceStore.getLocalInvoiceByOrderCode(orderCode);
  }

  static getInvoiceByNumber(invoiceNumber: string): StoredInvoice | undefined {
    return PalakInvoiceStore.getLocalInvoiceByNumber(invoiceNumber);
  }

  static getAllInvoices(): StoredInvoice[] {
    return PalakInvoiceStore.getAllLocalInvoices();
  }

  static async generateInvoiceForOrder(
    order: StoredOrder,
    forceRegenerate?: boolean,
    performedBy?: string,
    reason?: string
  ): Promise<{ success: boolean; invoice?: StoredInvoice; error?: string; isNew: boolean }> {
    return PalakInvoiceStore.generateInvoiceForOrder(order, {
      forceRegenerate,
      performedBy: performedBy || "Palak Staff",
      reason,
    });
  }
}
