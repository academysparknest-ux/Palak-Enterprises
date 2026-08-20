import { supabase, isSupabaseConfigured } from "../supabase/client";
import { business, businessConfig } from "../../config/business";
import type { StoredOrder, OrderItemPayload } from "../storage/store";
import type {
  StoredInvoice,
  InvoiceItem,
  InvoiceCustomerSnapshot,
  InvoiceBusinessSnapshot,
  InvoiceStats,
} from "./types";

const INVOICES_STORAGE_KEY = "palak_invoices_v1";

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

export function normalizeInvoicePaymentStatus(st?: string): StoredInvoice["paymentStatus"] {
  if (st === "confirmed" || st === "paid") return "paid";
  if (st === "partially_paid") return "partially_paid";
  if (st === "failed") return "failed";
  if (st === "refunded") return "refunded";
  return "pending";
}

export function normalizeInvoicePaymentMethod(m?: string): StoredInvoice["paymentMethod"] {
  if (m === "pay_online" || m === "upi_online") return "pay_online";
  if (m === "pay_after_confirmation") return "pay_after_confirmation";
  return "pay_at_store";
}

/** Converts numeric amount to Indian Currency words (e.g. 520 -> "Five Hundred Twenty Rupees Only") */
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
    terms: [
      "1. This is a computer generated invoice and does not require physical signature.",
      "2. Goods/prints once inspected and delivered will not be returned.",
      "3. Online services fees are non-refundable once portal filing is initiated.",
      "4. Jurisdiction for all matters & disputes: Chakia / Motihari, East Champaran, Bihar.",
    ],
  };
}

/** Generates local temporary invoice number (e.g. TEMP-2026-A8F92D) that cannot conflict with cloud PE-* series */
function generateLocalTemporaryNumber(year: number = new Date().getFullYear()): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TEMP-${year}-${randomSuffix}`;
}

/** Builds invoice line items from order items snapshot */
export function buildInvoiceItems(items: OrderItemPayload[]): InvoiceItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      {
        productName: "Printing & Documentation Service",
        description: "Custom Service Execution",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: 0,
        totalPrice: 0,
      },
    ];
  }

  return items.map((item, idx) => {
    // Generate detailed description from selected options
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
      unitPrice,
      discount: 0,
      tax: 0,
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
  /** Fetch all invoices from localStorage */
  static getAllLocalInvoices(): StoredInvoice[] {
    return getLocal<StoredInvoice[]>(INVOICES_STORAGE_KEY, []);
  }

  /** Clear all invoices from local storage */
  static clearAllInvoices(): void {
    setLocal(INVOICES_STORAGE_KEY, []);
  }

  /** Sync cloud invoices to local storage */
  static syncInvoicesFromCloud(cloudInvoices: StoredInvoice[]): void {
    if (Array.isArray(cloudInvoices)) {
      setLocal(INVOICES_STORAGE_KEY, cloudInvoices);
    }
  }

  /** Prune invoices whose order codes no longer exist in the authoritative orders list */
  static pruneOrphanedInvoices(validOrderCodes: Set<string>): StoredInvoice[] {
    const list = this.getAllLocalInvoices();
    if (!validOrderCodes || validOrderCodes.size === 0) {
      setLocal(INVOICES_STORAGE_KEY, []);
      return [];
    }
    const filtered = list.filter((inv) => inv.orderCode && validOrderCodes.has(inv.orderCode.trim().toUpperCase()));
    setLocal(INVOICES_STORAGE_KEY, filtered);
    return filtered;
  }

  /** Fetch single invoice by order code from local store */
  static getLocalInvoiceByOrderCode(orderCode: string): StoredInvoice | undefined {
    const clean = orderCode.trim().toUpperCase();
    const list = this.getAllLocalInvoices();
    return list.find((inv) => inv.orderCode.toUpperCase() === clean && inv.status === "ISSUED");
  }

  /** Fetch single invoice by invoice number from local store */
  static getLocalInvoiceByNumber(invoiceNumber: string): StoredInvoice | undefined {
    const clean = invoiceNumber.trim().toUpperCase();
    const list = this.getAllLocalInvoices();
    return list.find((inv) => inv.invoiceNumber.toUpperCase() === clean);
  }

  /** Save or update invoice in local storage */
  static saveInvoiceToLocal(invoice: StoredInvoice): void {
    const list = this.getAllLocalInvoices();
    const idx = list.findIndex((inv) => inv.orderCode.toUpperCase() === invoice.orderCode.toUpperCase());
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    setLocal(INVOICES_STORAGE_KEY, list);
  }

  /**
   * Primary generator for completed orders.
   * - Supabase is Authoritative Source whenever online (RPC: create_or_regenerate_invoice).
   * - If genuinely offline, creates local temporary invoice marked 'LOCAL_PENDING' (e.g. TEMP-2026-XXXXXX).
   * - Ensures exactly 1 invoice per order (Idempotent).
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

    // 1. Check local cache first if existing is already SYNCED and not forced
    const existingLocal = this.getLocalInvoiceByOrderCode(orderCode);
    if (existingLocal && existingLocal.syncStatus === "SYNCED" && !forceRegenerate) {
      return { success: true, invoice: existingLocal, isNew: false };
    }

    // 2. Cloud Supabase RPC generation (Atomic Authoritative Generator)
    if (isSupabaseConfigured && supabase) {
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
            orderId: invData.order_id,
            orderCode: invData.order_code,
            userId: invData.user_id,
            invoiceDate: invData.invoice_date || now,
            completionDate: invData.completion_date || now,
            customerSnapshot: invData.customer_snapshot || {},
            businessSnapshot: invData.business_snapshot || getBusinessSnapshot(),
            items: Array.isArray(invData.items) ? invData.items : buildInvoiceItems(order.items),
            subtotalAmount: Number(invData.subtotal_amount) || order.subtotalAmount || 0,
            discountAmount: Number(invData.discount_amount) || 0,
            taxableAmount: Number(invData.taxable_amount) || order.subtotalAmount || 0,
            taxAmount: Number(invData.tax_amount) || 0,
            deliveryFee: Number(invData.delivery_fee) || order.deliveryFee || 0,
            otherCharges: Number(invData.other_charges) || 0,
            totalAmount: Number(invData.total_amount) || order.totalAmount || 0,
            amountPaid: Number(invData.amount_paid) || (order.paymentStatus === "confirmed" || order.paymentStatus === "paid" ? order.totalAmount : 0),
            amountDue: Number(invData.amount_due) || (order.paymentStatus === "confirmed" || order.paymentStatus === "paid" ? 0 : order.totalAmount),
            paymentStatus: normalizeInvoicePaymentStatus(order.paymentStatus),
            paymentMethod: normalizeInvoicePaymentMethod(order.paymentMethod),
            status: "ISSUED",
            notes: invData.notes,
            syncStatus: "SYNCED",
            isTemporary: false,
            createdAt: invData.created_at || now,
            updatedAt: invData.updated_at || now,
          };

          this.saveInvoiceToLocal(mappedInvoice);
          return { success: true, invoice: mappedInvoice, isNew: Boolean(rpcRes.isNew) };
        } else if (rpcErr) {
          console.warn("create_or_regenerate_invoice RPC warning, proceeding to fallback:", rpcErr);
        }
      } catch (cloudErr) {
        console.warn("Invoice cloud RPC exception:", cloudErr);
      }
    }

    // 3. Fallback: Local Temporary Invoice Engine (Offline only)
    try {
      const year = new Date().getFullYear();
      let invoiceNumber = existingLocal?.invoiceNumber;
      
      // Never create a fake PE-* number locally; use TEMP-* series
      if (!invoiceNumber || forceRegenerate || invoiceNumber.startsWith("PE-")) {
        invoiceNumber = generateLocalTemporaryNumber(year);
      }

      const fin = calculateFinancials({
        subtotal: order.subtotalAmount || order.totalAmount || 0,
        discount: order.discountAmount || 0,
        taxableAmount: order.taxableAmount,
        taxAmount: order.taxAmount,
        taxRate: order.taxRate,
        cgstAmount: order.cgstAmount,
        sgstAmount: order.sgstAmount,
        igstAmount: order.igstAmount,
        platformFee: order.platformFee,
        deliveryFee: order.deliveryFee || 0,
        otherCharges: order.otherCharges || order.serviceCharge || 0,
        paymentStatus: order.paymentStatus,
        totalOverride: order.totalAmount,
      });

      const customerSnapshot: InvoiceCustomerSnapshot = {
        name: order.customerName || "Valued Customer",
        phone: order.customerPhone || "",
        email: order.customerEmail,
        fulfillmentType: order.fulfillmentType || "pickup",
        deliveryAddress: order.deliveryAddress,
        orderNotes: order.orderNotes,
      };

      const businessSnapshot = getBusinessSnapshot();
      const invoiceItems = buildInvoiceItems(order.items);

      const tempInvoice: StoredInvoice = {
        id: existingLocal?.id || (crypto.randomUUID ? crypto.randomUUID() : `temp_${Date.now()}`),
        invoiceNumber,
        orderId: order.id,
        orderCode,
        userId: order.userId,
        invoiceDate: now,
        completionDate: now,
        customerSnapshot,
        businessSnapshot,
        items: invoiceItems,
        subtotalAmount: fin.subtotalAmount,
        discountAmount: fin.discountAmount,
        taxableAmount: fin.taxableAmount,
        taxAmount: fin.taxAmount,
        taxRate: fin.taxRate,
        cgstAmount: fin.cgstAmount,
        sgstAmount: fin.sgstAmount,
        igstAmount: fin.igstAmount,
        platformFee: fin.platformFee,
        deliveryFee: fin.deliveryFee,
        otherCharges: fin.otherCharges,
        chargesSnapshot: order.chargesSnapshot,
        totalAmount: fin.totalAmount,
        amountPaid: fin.amountPaid,
        amountDue: fin.amountDue,
        paymentStatus: normalizeInvoicePaymentStatus(order.paymentStatus),
        paymentMethod: normalizeInvoicePaymentMethod(order.paymentMethod),
        status: "ISSUED",
        syncStatus: "LOCAL_PENDING",
        notes: forceRegenerate
          ? `Locally regenerated by ${performedBy}: ${reason || "No reason specified"}`
          : `Temporary offline bill created by ${performedBy}`,
        createdAt: existingLocal?.createdAt || now,
        updatedAt: now,
      };

      this.saveInvoiceToLocal(tempInvoice);
      return { success: true, invoice: tempInvoice, isNew: !existingLocal };
    } catch (localErr: any) {
      console.error("Local temporary invoice generation error:", localErr);
      return { success: false, error: localErr?.message || "Failed to generate invoice", isNew: false };
    }
  }

  /**
   * Reconcile any pending temporary local invoices with Supabase cloud.
   * Auto-replaces TEMP-* records with authoritative PE-* records.
   */
  static async reconcilePendingInvoices(): Promise<{ checked: number; reconciled: number; errors: number }> {
    if (!isSupabaseConfigured || !supabase) {
      return { checked: 0, reconciled: 0, errors: 0 };
    }

    const localList = this.getAllLocalInvoices();
    const pending = localList.filter((inv) => inv.syncStatus === "LOCAL_PENDING" || inv.isTemporary);
    if (pending.length === 0) return { checked: 0, reconciled: 0, errors: 0 };

    let reconciled = 0;
    let errors = 0;

    for (const inv of pending) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_or_regenerate_invoice", {
          p_order_code: inv.orderCode,
          p_force_regenerate: false,
          p_performed_by: "Cloud Reconciliation Engine",
          p_reason: "Automated offline bill reconciliation",
        });

        if (!rpcErr && rpcRes && rpcRes.success && rpcRes.invoice) {
          const cloudInv = rpcRes.invoice;
          const reconciledInvoice: StoredInvoice = {
            ...inv,
            id: cloudInv.id,
            invoiceNumber: cloudInv.invoice_number,
            orderId: cloudInv.order_id,
            syncStatus: "SYNCED",
            isTemporary: false,
            reconciledAt: new Date().toISOString(),
            updatedAt: cloudInv.updated_at || new Date().toISOString(),
          };
          this.saveInvoiceToLocal(reconciledInvoice);
          reconciled++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { checked: pending.length, reconciled, errors };
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
    let pendingReconciliations = 0;

    list.forEach((inv) => {
      if (inv.status === "VOID" || inv.status === "CANCELLED") return;

      if (inv.syncStatus === "LOCAL_PENDING" || inv.isTemporary) {
        pendingReconciliations++;
      }

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
      totalInvoices: Math.max(list.length, completedOrdersCount),
      todayInvoices: todayCount,
      monthInvoices: monthCount,
      pendingInvoices: pendingCount,
      totalInvoicedAmount: roundCurrency(totalInvoiced),
      totalPaidAmount: roundCurrency(totalPaid),
      totalDueAmount: roundCurrency(totalDue),
      pendingReconciliationCount: pendingReconciliations,
    };
  }
}
