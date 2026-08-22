export interface InvoiceItem {
  id?: string;
  productId?: string;
  productName: string;
  description?: string;
  quantity: number;
  unit?: string; // e.g. "Pcs", "Copies", "Sq.Ft", "Sets", "Books", "Nos", "Pages"
  unitPrice: number;
  discount: number;
  tax: number;
  taxRate?: number; // e.g. 0, 5, 12, 18, 28
  totalPrice: number;
  selectedOptions?: Record<string, any>;
  selectedOptionsLabels?: Record<string, string>;
  uploadedFileName?: string;
}

export interface InvoiceCustomerSnapshot {
  name: string;
  phone: string;
  email?: string;
  fulfillmentType?: "pickup" | "delivery" | string;
  deliveryAddress?: {
    street?: string;
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  orderNotes?: string;
  gstin?: string;
}

export interface InvoiceBusinessSnapshot {
  nameEn: string;
  nameHi: string;
  unitEn: string;
  unitHi: string;
  taglineEn: string;
  taglineHi: string;
  ownerName: string;
  ownerTitle?: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  addressLine: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  fullAddressEn?: string;
  fullAddressHi?: string;
  cscId: string;
  udyamNo: string;
  gstin?: string;
  logoUrl: string;
  terms: string[];
}

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  source: "ONLINE" | "ADMIN" | "OFFLINE";
  documentType: "TAX_INVOICE" | "RETAIL_BILL";
  financialYear: string; // e.g. "2026-27"
  temporaryNumber?: string; // e.g. "TEMP-2026-XXXXXX"
  orderId?: string;
  orderCode?: string;
  userId?: string;
  invoiceDate: string;
  completionDate: string;
  customerSnapshot: InvoiceCustomerSnapshot;
  businessSnapshot: InvoiceBusinessSnapshot;
  items: InvoiceItem[];
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  platformFee?: number;
  deliveryFee: number;
  otherCharges: number;
  chargesSnapshot?: any;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: "pending" | "confirmed" | "paid" | "failed" | "refunded" | "partially_paid";
  paymentMethod: "pay_online" | "pay_at_shop" | "pay_at_store" | "pay_after_confirmation" | "upi_online" | "cash" | "upi" | "card" | "bank_transfer" | "other" | string;
  status: "DRAFT" | "ISSUED" | "CANCELLED" | "VOID" | "PENDING_SYNC";
  signatureUrl?: string;
  createdBy?: string;
  notes?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  syncStatus?: "SYNCED" | "LOCAL_PENDING" | "RECONCILIATION_REQUIRED";
  isTemporary?: boolean;
  reconciledAt?: string;
  reconciliationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBillPayload {
  action: "DRAFT" | "ISSUE";
  draftId?: string;
  documentType: "TAX_INVOICE" | "RETAIL_BILL";
  customer: InvoiceCustomerSnapshot;
  items: InvoiceItem[];
  financials: {
    subtotal: number;
    discount: number;
    taxableAmount: number;
    taxAmount: number;
    taxRate?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    grandTotal: number;
  };
  paymentMode: string;
  paymentStatus: "paid" | "pending" | "partially_paid";
  amountPaid?: number;
  notes?: string;
  performedBy?: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  todayInvoices: number;
  monthInvoices: number;
  pendingInvoices: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  pendingReconciliationCount?: number;
}
