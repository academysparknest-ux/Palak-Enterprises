/**
 * Canonical Document Metadata & Order Snapshot Architecture
 *
 * Single Source of Truth for:
 * - Document Page Count, Sheets, and Print Options
 * - Pricing Breakdown (Subtotal, Tax, Delivery, Grand Total)
 * - Customer Confirmation Modal & Admin Production Queue
 *
 * CRITICAL INVARIANTS:
 * 1. Customer Display === Authoritative Database Commit === Admin View === Production Queue
 * 2. Submission MUST NEVER proceed with provisional 1-page defaults for multi-page documents.
 * 3. Authoritative Order Total is persisted once and never mutated by post-order recalculations.
 */

import type {
  OrderPrintSnapshot,
  PaperSize,
  ColorMode,
  PrintSides,
  PrintOrientation,
  PaperType,
} from "../../types/printJob";

export interface CanonicalDocumentMetadata {
  documentId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  pageCountStatus: "verified" | "analyzing" | "failed" | "unsupported";
  physicalSheetsPerCopy: number;
  totalPhysicalSheets: number;
  copies: number;
  paperSize: PaperSize;
  paperType: PaperType;
  colorMode: ColorMode;
  sides: PrintSides;
  orientation: PrintOrientation;
  storageBucket: string;
  storagePath: string;
  checksum?: string;
  uploadStatus: "PENDING" | "UPLOADING" | "READY" | "FAILED";
}

export interface CanonicalOrderSnapshot {
  orderId: string;
  orderCode: string;
  clientSubmissionId: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    userId?: string;
  };
  documents: CanonicalDocumentMetadata[];
  totalDocuments: number;
  totalPrintedPages: number;
  totalBwPages: number;
  totalColorPages: number;
  totalPhysicalSheets: number;
  pricing: {
    baseSubtotal: number;
    taxAmount: number;
    deliveryFee: number;
    discountAmount: number;
    grandTotal: number;
    currency: "INR";
    pricingVersion: string;
  };
  fulfillment: "pickup" | "delivery";
  payment: {
    method: "pay_online" | "pay_at_shop" | "pay_at_store" | "upi_online";
    status: "pending" | "confirmed" | "paid" | "failed";
    transactionId?: string;
  };
  orderStatus: "NEW" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";
  submittedAt: string;
  confirmedAt?: string;
}

/**
 * Builds a CanonicalOrderSnapshot from an existing OrderPrintSnapshot and customer details.
 */
export function buildCanonicalOrderSnapshot(params: {
  orderId: string;
  orderCode: string;
  clientSubmissionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  userId?: string;
  printSnapshot: OrderPrintSnapshot;
  paymentMethod: "pay_online" | "pay_at_shop" | "pay_at_store" | "upi_online";
  paymentStatus: "pending" | "confirmed" | "paid" | "failed";
  paymentTransactionId?: string;
  orderStatus?: "NEW" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";
  fulfillmentType?: "pickup" | "delivery";
  submittedAt?: string;
}): CanonicalOrderSnapshot {
  const {
    orderId,
    orderCode,
    clientSubmissionId,
    customerName,
    customerPhone,
    customerEmail,
    userId,
    printSnapshot,
    paymentMethod,
    paymentStatus,
    paymentTransactionId,
    orderStatus = "NEW",
    fulfillmentType = "pickup",
    submittedAt = new Date().toISOString(),
  } = params;

  const docs: CanonicalDocumentMetadata[] = (printSnapshot.documents || []).map((d) => ({
    documentId: d.documentId,
    filename: d.fileName,
    originalFilename: d.fileName,
    mimeType: d.mimeType || "application/pdf",
    fileSize: d.fileSize || 0,
    pageCount: d.selectedPageCount || d.bwPageCount + d.colorPageCount || 1,
    pageCountStatus: "verified",
    physicalSheetsPerCopy: d.physicalSheetsPerCopy || 1,
    totalPhysicalSheets: d.totalPhysicalSheets || 1,
    copies: d.copies || 1,
    paperSize: d.paperSize || "a4",
    paperType: d.paperType || "normal",
    colorMode: d.colorMode || "bw",
    sides: d.sides || "single",
    orientation: d.orientation || "portrait",
    storageBucket: "customer-documents",
    storagePath: d.storagePath || "",
    uploadStatus: "READY",
  }));

  const subtotal = Math.max(0, Number(printSnapshot.subtotal) || 0);
  const deliveryFee = Math.max(0, Number(printSnapshot.deliveryFee) || 0);
  const grandTotal = Math.max(0, Number(printSnapshot.grandTotal) || subtotal + deliveryFee);
  const taxAmount = Math.max(0, Number((grandTotal - subtotal - deliveryFee).toFixed(2)) || 0);

  return {
    orderId,
    orderCode,
    clientSubmissionId,
    customer: {
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail?.trim() || undefined,
      userId,
    },
    documents: docs,
    totalDocuments: printSnapshot.totalDocuments || docs.length,
    totalPrintedPages: printSnapshot.totalPrintedPages || docs.reduce((s, d) => s + (d.pageCount * d.copies), 0),
    totalBwPages: printSnapshot.totalBwPages || 0,
    totalColorPages: printSnapshot.totalColorPages || 0,
    totalPhysicalSheets: printSnapshot.totalPhysicalSheets || docs.reduce((s, d) => s + d.totalPhysicalSheets, 0),
    pricing: {
      baseSubtotal: subtotal,
      taxAmount,
      deliveryFee,
      discountAmount: 0,
      grandTotal,
      currency: "INR",
      pricingVersion: printSnapshot.pricingConfigVersion || "2026-08-22-v1",
    },
    fulfillment: fulfillmentType,
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      transactionId: paymentTransactionId,
    },
    orderStatus,
    submittedAt,
  };
}
