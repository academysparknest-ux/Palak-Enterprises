export type PaperSize = "a4" | "a3" | "a5" | "letter" | "legal";

export type ColorMode = "bw" | "color" | "mixed";

export type PrintSides = "single" | "double_long" | "double_short";

export type PrintOrientation = "auto" | "portrait" | "landscape";

export type PagesPerSheet = 1 | 2 | 4 | 6 | 9 | 16;

export type ScalingOption = "fit" | "actual" | "fill" | "custom";

export type PaperType = "normal" | "premium" | "glossy" | "photo" | "card";

export type PaperGSM = 70 | 75 | 80 | 100 | 120 | 160 | 200 | 250;

export type BindingType = "none" | "staple" | "spiral" | "comb" | "soft" | "hard";

export type CoverOption = "none" | "transparent" | "white" | "black" | "color" | "custom";

export interface AdvancedFinishingOptions {
  holePunching?: boolean;
  cutting?: boolean;
  borderless?: boolean;
  bookletMode?: boolean;
  watermark?: string;
  pageNumbers?: boolean;
  headerFooter?: string;
  lamination?: boolean;
}

export interface UserSavedPrintPreferences {
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: PrintSides;
  orientation: PrintOrientation;
  copies: number;
  pagesPerSheet: PagesPerSheet;
  scaling: ScalingOption;
  paperType: PaperType;
  gsm: PaperGSM;
  binding: BindingType;
  frontCover: CoverOption;
  backCover: CoverOption;
  finishing: AdvancedFinishingOptions;
}

export const DEFAULT_USER_PRINT_PREFERENCES: UserSavedPrintPreferences = {
  paperSize: "a4",
  colorMode: "bw",
  sides: "double_long",
  orientation: "auto",
  copies: 1,
  pagesPerSheet: 1,
  scaling: "fit",
  paperType: "normal",
  gsm: 75,
  binding: "none",
  frontCover: "none",
  backCover: "none",
  finishing: {},
};

export interface DocumentPrintConfig {
  documentId: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  storagePath?: string;
  mimeType?: string;
  totalPages: number;

  // Page Selection & Color
  pageRangeType: "all" | "custom";
  customPageRange?: string; // e.g. "1-5, 8, 10-15"
  colorMode: ColorMode;
  colorPagesRange?: string; // e.g. "1, 5, 8-10" when colorMode === "mixed"

  // Quantities & Core Layout
  copies: number;
  paperSize: PaperSize;
  paperType: PaperType;
  gsm: PaperGSM;
  orientation: PrintOrientation;
  sides: PrintSides;
  pagesPerSheet: PagesPerSheet;
  scaling: ScalingOption;
  customScalePercent?: number;

  // Finishing & Covers
  binding: BindingType;
  frontCover: CoverOption;
  backCover: CoverOption;
  finishing: AdvancedFinishingOptions;

  // Live Computed Counts & Pricing Breakdown
  selectedPageCount: number;
  bwPageCount: number;
  colorPageCount: number;
  physicalSheetsPerCopy: number;
  totalPhysicalSheets: number;
  itemPrice: number; // Unit price per copy
  totalPrice: number; // itemPrice * copies
  priceBreakdown: DocumentPriceBreakdown;
}

export interface DocumentPriceBreakdown {
  bwPrintCost: number;
  colorPrintCost: number;
  paperCost: number;
  bindingCost: number;
  frontCoverCost: number;
  backCoverCost: number;
  finishingCost: number;
  costPerCopy: number;
  totalCost: number;
}

export interface OrderPrintSnapshot {
  version: string; // e.g. "2026-08-22-v1"
  pricingConfigVersion: string;
  documents: DocumentPrintConfig[];
  totalDocuments: number;
  totalPrintedPages: number;
  totalBwPages: number;
  totalColorPages: number;
  totalPhysicalSheets: number;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
}

export type PrintJobStatus =
  | "PENDING"
  | "READY_TO_PRINT"
  | "PRINTING"
  | "PRINTED"
  | "QUALITY_CHECK"
  | "READY"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface AdminPrintOverride {
  id: string;
  documentId: string;
  fileName: string;
  field: string;
  requestedValue: any;
  actualValue: any;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface PrintAuditLog {
  id: string;
  jobId: string;
  orderCode: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, any>;
  notes?: string;
}

export interface PrintJobItem {
  id: string;
  documentId: string;
  fileName: string;
  storagePath: string;
  fileUrl: string;
  pageCount: number;
  colorMode: ColorMode;
  colorPages: number;
  bwPages: number;
  copies: number;
  paperSize: PaperSize;
  paperType: PaperType;
  gsm: PaperGSM;
  orientation: PrintOrientation;
  sides: PrintSides;
  pagesPerSheet: PagesPerSheet;
  scaling: ScalingOption;
  binding: BindingType;
  frontCover: CoverOption;
  backCover: CoverOption;
  finishing: AdvancedFinishingOptions;
  status: "QUEUED" | "PRINTING" | "COMPLETED" | "ERROR";
  overrides?: AdminPrintOverride[];
}

export interface PrintJob {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  status: PrintJobStatus;
  items: PrintJobItem[];
  overrides: AdminPrintOverride[];
  auditLogs: PrintAuditLog[];
  createdByName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
