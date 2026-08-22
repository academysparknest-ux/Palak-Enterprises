import { supabase, isSupabaseConfigured } from "../supabase/client";
import { business, businessConfig } from "../../config/business";
import type { StoredOrder, OrderItemPayload } from "../storage/store";
import type {
  StoredInvoice,
  InvoiceItem,
  InvoiceBusinessSnapshot,
  InvoiceStats,
  AdminBillPayload,
} from "./types";

const INVOICES_STORAGE_KEY = "palak_invoices_v1";
let memoryInvoices: StoredInvoice[] | null = null;

// Safe local storage helpers
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
    console.error("Local invoice storage error:", e);
  }
}

/**
 * Computes Indian Financial Year (1 April – 31 March).
 * e.g. August 2026 -> FY 2026-27 (startYear = 2026, formattedFY = "2026-27")
 * e.g. February 2027 -> FY 2026-27 (startYear = 2026, formattedFY = "2026-27")
 */
export function getIndianFinancialYear(date: Date = new Date()): {
  startYear: number;
  endYear: number;
  formattedFY: string;
} {
  const month = date.getMonth(); // 0 is Jan, 3 is April
  const fullYear = date.getFullYear();
  const startYear = month < 3 ? fullYear - 1 : fullYear;
  const endYear = startYear + 1;
  const shortEnd = String((endYear % 100)).padStart(2, "0");
  return {
    startYear,
    endYear,
    formattedFY: `${startYear}-${shortEnd}`,
  };
}

export function normalizeInvoicePaymentStatus(st?: string): StoredInvoice["paymentStatus"] {
  if (st === "confirmed" || st === "paid") return "paid";
  if (st === "partially_paid") return "partially_paid";
  if (st === "failed") return "failed";
  if (st === "refunded") return "refunded";
  return "pending";
}

export function normalizeInvoicePaymentMethod(m?: string): StoredInvoice["paymentMethod"] {
  if (!m) return "pay_at_store";
  const clean = m.toLowerCase().replace(/\s+/g, "_");
  if (clean === "pay_online" || clean === "upi_online" || clean === "online") return "pay_online";
  if (clean === "cash") return "cash";
  if (clean === "upi") return "upi";
  if (clean === "card") return "card";
  if (clean === "bank_transfer" || clean === "bank") return "bank_transfer";
  if (clean === "pay_after_confirmation") return "pay_after_confirmation";
  return "pay_at_store";
}

/** Converts numeric amount to Indian Currency words (e.g. 847 -> "Eight Hundred Forty Seven Rupees Only") */
export function numberToIndianRupeesWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return "Zero Rupees Only";

  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    let str = "";
    if (n >= 100) {
      str += singleDigits[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    } else if (n >= 10) {
      str += teens[n - 10] + " ";
      n = 0;
    }
    if (n > 0) {
      str += singleDigits[n] + " ";
    }
    return str.trim();
  }

  const intPart = Math.floor(amount);
  const paisePart = Math.round((amount - intPart) * 100);

  let num = intPart;
  let words = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) words += convertGroup(crore) + " Crore ";
  if (lakh > 0) words += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) words += convertGroup(thousand) + " Thousand ";
  if (remainder > 0) words += convertGroup(remainder) + " ";

  words = words.trim() + " Rupees";

  if (paisePart > 0) {
    words += " and " + convertGroup(paisePart) + " Paise";
  }

  return words.trim() + " Only";
}

/** Safe monetary rounding to 2 decimals */
export function roundCurrency(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/** Generates authoritative business snapshot from configuration */
export function getBusinessSnapshot(): InvoiceBusinessSnapshot {
  return {
    nameEn: business.name.en || "Palak Enterprises",
    nameHi: business.name.hi || "पालक इंटरप्राइजेज",
    unitEn: "Palak Printing Press & Digital CSC Hub",
    unitHi: "पालक प्रिंटिंग प्रेस एवं डिजिटल सेवा केंद्र",
    taglineEn: business.tagline.en || "Printing & Digital Services, All in One Place",
    taglineHi: business.tagline.hi || "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
    ownerName: business.owner.en || businessConfig.owner.name.en || "Kumar Pankaj",
    ownerTitle: "Proprietor",
    primaryPhone: business.primaryPhone ? `+91 ${business.primaryPhone}` : "+91 99052 38015",
    secondaryPhone: business.phones[1] ? `+91 ${business.phones[1]}` : "+91 73249 64770",
    email: "support@palakenterprises.in",
    addressLine: business.address.line1.en || "Ward No. 7, Saniganj Mohalla, Near Block Gate",
    landmark: "Near Block Gate",
    city: "Chakia",
    district: "East Champaran",
    state: "Bihar",
    pincode: "845412",
    fullAddressEn: businessConfig.address.fullAddress.en || "Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar - 845412",
    fullAddressHi: businessConfig.address.fullAddress.hi || "वार्ड नं. 7, सनिगंज मोहल्ला, ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412",
    cscId: business.registrations.cscId || "634165120013",
    udyamNo: business.registrations.udyamNo || "UDYAM-BR-11-0061705",
    gstin: "10BRKPK1234F1Z5",
    logoUrl: "/logo.webp",
    upiId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_BUSINESS_UPI_ID) || business.upiId || businessConfig.upiId || "9905238015@okbizaxis",
    terms: [
      "1. This is a computer generated invoice and does not require physical signature.",
      "2. Goods/prints once inspected and delivered will not be returned.",
      "3. Online services fees are non-refundable once portal filing is initiated.",
      "4. Jurisdiction for all matters & disputes: Chakia / Motihari, East Champaran, Bihar.",
    ],
  };
}

/**
 * Helper to check if an invoice number is a valid permanent number (or valid staff draft)
 * and definitely not a temporary/fallback artifact.
 */
export function isPermanentInvoiceNumber(invoiceNum?: string): boolean {
  if (!invoiceNum || typeof invoiceNum !== "string") return false;
  const clean = invoiceNum.trim().toUpperCase();
  if (clean.startsWith("TEMP-") || clean.startsWith("TEST-") || clean.startsWith("PREVIEW-")) {
    return false;
  }
  return true;
}

/** Builds invoice line items from order items snapshot */
export function buildInvoiceItems(items: OrderItemPayload[], fallbackTotal: number = 0): InvoiceItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    const validTotal = Math.max(0, Number(fallbackTotal) || 0);
    return [
      {
        productName: "Printing & Documentation Service",
        description: "Custom Service Execution",
        quantity: 1,
        unit: "Pcs",
        unitPrice: validTotal,
        discount: 0,
        tax: 0,
        taxRate: 0,
        totalPrice: validTotal,
      },
    ];
  }

  return items.map((item, idx) => {
    const descParts: string[] = [];
    if (item.selectedOptions) {
      if (item.selectedOptions.paperSize) descParts.push(`Paper: ${String(item.selectedOptions.paperSize).toUpperCase()}`);
      if (item.selectedOptions.colorMode) descParts.push(`Color: ${String(item.selectedOptions.colorMode).toUpperCase()}`);
      if (item.selectedOptions.printSide) descParts.push(`Print: ${String(item.selectedOptions.printSide).toUpperCase()}`);
      if (item.selectedOptions.paperGsm) descParts.push(`GSM: ${item.selectedOptions.paperGsm}`);
      if (item.selectedOptions.finishing) {
        const f = item.selectedOptions.finishing;
        const activeFinishing: string[] = [];
        if (f.spiralBinding) activeFinishing.push("Spiral Binding");
        if (f.combBinding) activeFinishing.push("Comb Binding");
        if (f.lamination) activeFinishing.push("Lamination");
        if (f.stapling) activeFinishing.push("Stapling");
        if (activeFinishing.length > 0) descParts.push(`Finishing: ${activeFinishing.join(", ")}`);
      }
      if (item.selectedOptions.documentType) descParts.push(`Type: ${item.selectedOptions.documentType}`);
    }

    if (item.uploadedFileName) {
      descParts.push(`File: ${item.uploadedFileName}`);
    }

    const description = descParts.length > 0 ? descParts.join(" | ") : "Standard specifications";
    const qty = Math.max(1, Number(item.quantity) || 1);
    const total = Math.max(0, Number(item.totalPrice) || 0);
    const unitPrice = roundCurrency(Number(item.unitPrice) || (total / qty));

    return {
      id: `item_${idx + 1}`,
      productId: item.productId,
      productName: item.productName || "Print Item",
      description,
      quantity: qty,
      unit: (item as any).unit || "Pcs",
      unitPrice,
      discount: (item as any).discount || 0,
      tax: (item as any).tax || 0,
      taxRate: (item as any).taxRate || 0,
      totalPrice: total,
      selectedOptions: item.selectedOptions,
      selectedOptionsLabels: item.selectedOptionsLabels,
      uploadedFileName: item.uploadedFileName,
    };
  });
}

/** Strict financial calculation helper using order snapshot */
export function calculateFinancials(params: {
  subtotal: number;
  discount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  platformFee?: number;
  deliveryFee?: number;
  otherCharges?: number;
  paymentStatus?: string;
  totalOverride?: number;
}) {
  const subtotal = Math.max(0, roundCurrency(params.subtotal || 0));
  const discount = Math.max(0, roundCurrency(params.discount || 0));
  const platformFee = Math.max(0, roundCurrency(params.platformFee || 0));
  const delivery = Math.max(0, roundCurrency(params.deliveryFee || 0));
  const other = Math.max(0, roundCurrency(params.otherCharges || 0));
  const taxable = params.taxableAmount !== undefined 
    ? Math.max(0, roundCurrency(params.taxableAmount))
    : Math.max(0, roundCurrency(subtotal - discount));
  const tax = params.taxAmount !== undefined 
    ? Math.max(0, roundCurrency(params.taxAmount))
    : 0;

  const grandTotal = params.totalOverride !== undefined && params.totalOverride > 0
    ? roundCurrency(params.totalOverride)
    : roundCurrency(subtotal - discount + platformFee + delivery + other + tax);

  const isPaid = params.paymentStatus === "confirmed" || params.paymentStatus === "paid";
  const isPartiallyPaid = params.paymentStatus === "partially_paid";
  
  let amountPaid = 0;
  let amountDue = grandTotal;

  if (isPaid) {
    amountPaid = grandTotal;
    amountDue = 0;
  } else if (isPartiallyPaid) {
    amountPaid = roundCurrency(grandTotal / 2);
    amountDue = roundCurrency(grandTotal - amountPaid);
  }

  return {
    subtotalAmount: subtotal,
    discountAmount: discount,
    taxableAmount: taxable,
    taxAmount: tax,
    taxRate: params.taxRate || 0,
    cgstAmount: params.cgstAmount,
    sgstAmount: params.sgstAmount,
    igstAmount: params.igstAmount,
    platformFee,
    deliveryFee: delivery,
    otherCharges: other,
    totalAmount: grandTotal,
    amountPaid,
    amountDue,
  };
}

export class PalakInvoiceStore {
  /** Fetch all permanent invoices from in-memory cache or localStorage (automatically cleansing legacy temporary entries) */
  static getAllLocalInvoices(): StoredInvoice[] {
    if (memoryInvoices === null) {
      const list = getLocal<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
      const valid = list.filter(
        (inv) => inv && inv.invoiceNumber && isPermanentInvoiceNumber(inv.invoiceNumber)
      );
      if (valid.length !== list.length) {
        setLocal(INVOICES_STORAGE_KEY, valid);
      }
      memoryInvoices = valid;
    }
    return memoryInvoices;
  }

  /** Clear all invoices from local storage and memory cache */
  static clearAllInvoices(): void {
    memoryInvoices = [];
    setLocal(INVOICES_STORAGE_KEY, []);
  }

  /** Reset in-memory cache reference */
  static resetMemoryCaches(): void {
    memoryInvoices = null;
  }

  /** Sync authoritative cloud invoices to local storage and memory cache */
  static syncInvoicesFromCloud(cloudInvoices: StoredInvoice[]): void {
    if (Array.isArray(cloudInvoices)) {
      const existing = this.getAllLocalInvoices();
      const map = new Map<string, StoredInvoice>();
      existing.forEach((i) => {
        if (i && i.invoiceNumber && isPermanentInvoiceNumber(i.invoiceNumber)) {
          map.set(i.invoiceNumber.toUpperCase(), i);
        }
      });
      cloudInvoices.forEach((i) => {
        if (i && i.invoiceNumber && isPermanentInvoiceNumber(i.invoiceNumber)) {
          map.set(i.invoiceNumber.toUpperCase(), i);
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.invoiceDate || b.createdAt).getTime() - new Date(a.invoiceDate || a.createdAt).getTime()
      );
      memoryInvoices = merged;
      setLocal(INVOICES_STORAGE_KEY, merged);
    }
  }

  /** Prune invoices whose order codes no longer exist in the authoritative orders list */
  static pruneOrphanedInvoices(validOrderCodes: Set<string>): StoredInvoice[] {
    const list = this.getAllLocalInvoices();
    if (!validOrderCodes || validOrderCodes.size === 0) {
      return list;
    }
    // Only prune online invoices whose order codes disappeared; keep admin bills (where orderId is null/undefined)
    const filtered = list.filter((inv) => {
      if (inv.source === "ADMIN" || !inv.orderCode) return true;
      return validOrderCodes.has(inv.orderCode.trim().toUpperCase());
    });
    memoryInvoices = filtered;
    setLocal(INVOICES_STORAGE_KEY, filtered);
    return filtered;
  }

  /** Fetch single invoice by order code from local store */
  static getLocalInvoiceByOrderCode(orderCode: string): StoredInvoice | undefined {
    const clean = orderCode.trim().toUpperCase();
    const list = this.getAllLocalInvoices();
    return list.find(
      (inv) =>
        inv.orderCode &&
        inv.orderCode.toUpperCase() === clean &&
        inv.status === "ISSUED" &&
        isPermanentInvoiceNumber(inv.invoiceNumber)
    );
  }

  /** Fetch single invoice by invoice number from local store */
  static getLocalInvoiceByNumber(invoiceNumber: string): StoredInvoice | undefined {
    const clean = invoiceNumber.trim().toUpperCase();
    if (!isPermanentInvoiceNumber(clean)) return undefined;
    const list = this.getAllLocalInvoices();
    return list.find((inv) => inv.invoiceNumber.toUpperCase() === clean);
  }

  /** Save or update invoice in local storage and memory cache */
  static saveInvoiceToLocal(invoice: StoredInvoice): void {
    if (!invoice || !invoice.invoiceNumber || !isPermanentInvoiceNumber(invoice.invoiceNumber)) {
      return;
    }
    const list = [...this.getAllLocalInvoices()];
    const idx = list.findIndex(
      (inv) =>
        inv.invoiceNumber.toUpperCase() === invoice.invoiceNumber.toUpperCase() ||
        (inv.id && inv.id === invoice.id)
    );
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    memoryInvoices = list;
    setLocal(INVOICES_STORAGE_KEY, list);
  }

  /**
   * Primary generator for completed online orders.
   * - Supabase is Authoritative Source (RPC: create_or_regenerate_invoice).
   * - Uses atomic financial-year sequential numbering (PE-YYYY-XXXXXX).
   * - Never creates temporary numbers.
   */
  static async generateInvoiceForOrder(
    order: StoredOrder,
    options?: {
      forceRegenerate?: boolean;
      performedBy?: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; invoice?: StoredInvoice; error?: string; isNew: boolean }> {
    if (!order || !order.orderCode) {
      return { success: false, error: "Invalid order provided", isNew: false };
    }

    const orderCode = order.orderCode.trim().toUpperCase();
    const now = new Date().toISOString();
    const performedBy = options?.performedBy || "System";
    const forceRegenerate = Boolean(options?.forceRegenerate);
    const reason = options?.reason;

    // 1. Check local cache first if existing is already SYNCED and permanent and not forced
    const existingLocal = this.getLocalInvoiceByOrderCode(orderCode);
    if (
      existingLocal &&
      isPermanentInvoiceNumber(existingLocal.invoiceNumber) &&
      existingLocal.syncStatus === "SYNCED" &&
      !forceRegenerate
    ) {
      return { success: true, invoice: existingLocal, isNew: false };
    }

    const fyInfo = getIndianFinancialYear();

    // 2. Cloud Supabase RPC generation (Atomic Authoritative Generator)
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: "Database service unavailable. Cloud connection is required for permanent invoice generation.",
        isNew: false,
      };
    }

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_or_regenerate_invoice", {
        p_order_code: orderCode,
        p_force_regenerate: forceRegenerate,
        p_performed_by: performedBy,
        p_reason: reason || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.invoice) {
        const invData = rpcRes.invoice;
        const mappedInvoice: StoredInvoice = {
          id: invData.id,
          invoiceNumber: invData.invoice_number,
          source: invData.source || "ONLINE",
          documentType: invData.document_type || "TAX_INVOICE",
          financialYear: invData.financial_year || fyInfo.formattedFY,
          orderId: invData.order_id,
          orderCode: invData.order_code,
          userId: invData.user_id,
          invoiceDate: invData.invoice_date || now,
          completionDate: invData.completion_date || now,
          customerSnapshot: invData.customer_snapshot || {},
          businessSnapshot: invData.business_snapshot || getBusinessSnapshot(),
          items: Array.isArray(invData.items)
            ? invData.items
            : buildInvoiceItems(order.items, Number(invData.total_amount) || order.totalAmount || 0),
          subtotalAmount: Number(invData.subtotal_amount) || order.subtotalAmount || 0,
          discountAmount: Number(invData.discount_amount) || 0,
          taxableAmount: Number(invData.taxable_amount) || order.subtotalAmount || 0,
          taxAmount: Number(invData.tax_amount) || 0,
          deliveryFee: Number(invData.delivery_fee) || order.deliveryFee || 0,
          otherCharges: Number(invData.other_charges) || 0,
          totalAmount: Number(invData.total_amount) || order.totalAmount || 0,
          amountPaid:
            Number(invData.amount_paid) ||
            (order.paymentStatus === "confirmed" || order.paymentStatus === "paid"
              ? order.totalAmount
              : 0),
          amountDue:
            Number(invData.amount_due) ||
            (order.paymentStatus === "confirmed" || order.paymentStatus === "paid"
              ? 0
              : order.totalAmount),
          paymentStatus: normalizeInvoicePaymentStatus(order.paymentStatus),
          paymentMethod: normalizeInvoicePaymentMethod(order.paymentMethod),
          status: invData.status || "ISSUED",
          signatureUrl: invData.signature_url,
          createdBy: invData.created_by || performedBy,
          notes: invData.notes,
          syncStatus: "SYNCED",
          isTemporary: false,
          createdAt: invData.created_at || now,
          updatedAt: invData.updated_at || now,
        };

        this.saveInvoiceToLocal(mappedInvoice);
        return { success: true, invoice: mappedInvoice, isNew: Boolean(rpcRes.isNew) };
      } else {
        const errorMsg =
          rpcErr?.message || rpcRes?.error || "Failed to generate permanent invoice in database.";
        console.error("create_or_regenerate_invoice error:", errorMsg);
        return { success: false, error: errorMsg, isNew: false };
      }
    } catch (cloudErr: any) {
      console.error("Invoice cloud RPC exception:", cloudErr);
      return { success: false, error: cloudErr?.message || "Failed to generate invoice", isNew: false };
    }
  }

  /**
   * Admin Create Bill API:
   * Supports 'DRAFT' (does NOT consume sequential numbers) or 'ISSUE' (allocates official sequential number).
   */
  static async createAdminBill(
    payload: AdminBillPayload
  ): Promise<{ success: boolean; invoice?: StoredInvoice; error?: string }> {
    const now = new Date().toISOString();
    const fyInfo = getIndianFinancialYear();
    const performedBy = payload.performedBy || "Admin Staff";

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: "Database service unavailable. Cloud connection is required for permanent invoice generation.",
      };
    }

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_admin_bill", {
        p_action: payload.action,
        p_document_type: payload.documentType,
        p_customer: payload.customer,
        p_items: payload.items,
        p_financials: payload.financials,
        p_payment_mode: payload.paymentMode,
        p_payment_status: payload.paymentStatus,
        p_amount_paid: payload.amountPaid !== undefined ? payload.amountPaid : null,
        p_notes: payload.notes || null,
        p_performed_by: performedBy,
        p_draft_id: payload.draftId || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.invoice) {
        const invData = rpcRes.invoice;
        const mappedInvoice: StoredInvoice = {
          id: invData.id,
          invoiceNumber: invData.invoice_number,
          source: "ADMIN",
          documentType: invData.document_type || payload.documentType,
          financialYear: invData.financial_year || fyInfo.formattedFY,
          orderId: undefined,
          orderCode: invData.order_code || undefined,
          userId: invData.user_id,
          invoiceDate: invData.invoice_date || now,
          completionDate: invData.completion_date || now,
          customerSnapshot: invData.customer_snapshot || payload.customer,
          businessSnapshot: invData.business_snapshot || getBusinessSnapshot(),
          items: invData.items || payload.items,
          subtotalAmount: Number(invData.subtotal_amount) || payload.financials.subtotal,
          discountAmount: Number(invData.discount_amount) || payload.financials.discount,
          taxableAmount: Number(invData.taxable_amount) || payload.financials.taxableAmount,
          taxAmount: Number(invData.tax_amount) || payload.financials.taxAmount,
          taxRate: payload.financials.taxRate || 0,
          deliveryFee: Number(invData.delivery_fee) || 0,
          otherCharges: Number(invData.other_charges) || 0,
          totalAmount: Number(invData.total_amount) || payload.financials.grandTotal,
          amountPaid:
            Number(invData.amount_paid) ||
            (payload.amountPaid ?? payload.financials.grandTotal),
          amountDue: Number(invData.amount_due) || 0,
          paymentStatus: invData.payment_status || payload.paymentStatus,
          paymentMethod: invData.payment_method || payload.paymentMode,
          status: invData.status || (payload.action === "DRAFT" ? "DRAFT" : "ISSUED"),
          signatureUrl: invData.signature_url,
          createdBy: invData.created_by || performedBy,
          notes: invData.notes || payload.notes,
          syncStatus: "SYNCED",
          isTemporary: false,
          createdAt: invData.created_at || now,
          updatedAt: invData.updated_at || now,
        };

        this.saveInvoiceToLocal(mappedInvoice);
        return { success: true, invoice: mappedInvoice };
      } else {
        const errorMsg =
          rpcErr?.message || rpcRes?.error || "Failed to persist bill in database.";
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.warn("Admin bill cloud exception:", err);
      return { success: false, error: err?.message || "An unexpected error occurred creating bill" };
    }
  }

  /**
   * Cancels an issued invoice atomically.
   * Number is marked CANCELLED and never deleted or reused.
   */
  static async cancelInvoice(
    invoiceNumber: string,
    cancelledBy: string,
    reason: string
  ): Promise<{ success: boolean; invoice?: StoredInvoice; error?: string }> {
    const cleanNum = invoiceNumber.trim().toUpperCase();
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("cancel_invoice", {
          p_invoice_number: cleanNum,
          p_cancelled_by: cancelledBy,
          p_reason: reason,
        });

        if (!rpcErr && rpcRes && rpcRes.success && rpcRes.invoice) {
          const invData = rpcRes.invoice;
          const existing = this.getLocalInvoiceByNumber(cleanNum);
          const updated: StoredInvoice = {
            ...(existing || (invData as any)),
            status: "CANCELLED",
            cancelledAt: invData.cancelled_at || now,
            cancelledBy: invData.cancelled_by || cancelledBy,
            cancellationReason: invData.cancellation_reason || reason,
            updatedAt: invData.updated_at || now,
          };
          this.saveInvoiceToLocal(updated);
          return { success: true, invoice: updated };
        }
      } catch (err: any) {
        console.warn("Cloud cancel invoice error:", err);
      }
    }

    // Local fallback for already synced invoice
    const existing = this.getLocalInvoiceByNumber(cleanNum);
    if (existing) {
      existing.status = "CANCELLED";
      existing.cancelledAt = now;
      existing.cancelledBy = cancelledBy;
      existing.cancellationReason = reason;
      existing.updatedAt = now;
      this.saveInvoiceToLocal(existing);
      return { success: true, invoice: existing };
    }

    return { success: false, error: "Invoice not found to cancel" };
  }

  /** Compute stats for Admin Dashboard */
  static calculateInvoiceStats(invoices: StoredInvoice[], completedOrdersCount: number): InvoiceStats {
    const list = Array.isArray(invoices) ? invoices : [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let todayCount = 0;
    let monthCount = 0;
    let pendingCount = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalDue = 0;

    list.forEach((inv) => {
      if (inv.status === "VOID" || inv.status === "CANCELLED" || inv.status === "DRAFT") return;
      if (!isPermanentInvoiceNumber(inv.invoiceNumber)) return;

      const invDate = new Date(inv.invoiceDate || inv.createdAt);
      if (!isNaN(invDate.getTime())) {
        if (invDate.toISOString().slice(0, 10) === todayStr) {
          todayCount++;
        }
        if (invDate.getMonth() === curMonth && invDate.getFullYear() === curYear) {
          monthCount++;
        }
      }

      const tot = Number(inv.totalAmount) || 0;
      const isPaid = inv.paymentStatus === "confirmed" || inv.paymentStatus === "paid";
      const isPartiallyPaid = inv.paymentStatus === "partially_paid";

      let paid = 0;
      let due = tot;

      if (isPaid) {
        paid = tot;
        due = 0;
      } else if (isPartiallyPaid) {
        paid = Number(inv.amountPaid) || roundCurrency(tot / 2);
        due = Math.max(0, tot - paid);
      } else {
        paid = Number(inv.amountPaid) || 0;
        due = Math.max(0, tot - paid);
      }

      if (due > 0) {
        pendingCount++;
      }

      totalInvoiced += tot;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalInvoices: Math.max(
        list.filter((i) => i.status === "ISSUED" && isPermanentInvoiceNumber(i.invoiceNumber)).length,
        completedOrdersCount
      ),
      todayInvoices: todayCount,
      monthInvoices: monthCount,
      pendingInvoices: pendingCount,
      totalInvoicedAmount: roundCurrency(totalInvoiced),
      totalPaidAmount: roundCurrency(totalPaid),
      totalDueAmount: roundCurrency(totalDue),
      pendingReconciliationCount: 0,
    };
  }
}
