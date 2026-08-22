import type {
  DocumentPrintConfig,
  DocumentPriceBreakdown,
  OrderPrintSnapshot,
  PaperSize,
  PaperType,
  PaperGSM,
  PrintSides,
  PagesPerSheet,
} from "../../types/printJob";
import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingConfig,
} from "../../config/printPricing";

export interface PageRangeResult {
  valid: boolean;
  pages: number[];
  count: number;
  error?: string;
}

/**
 * Validates and parses custom page ranges such as "1-5, 8, 11-15".
 * Enforces positive integers, ascending order, bounds checking, and deduplication.
 */
export function parsePageRange(rangeStr: string | undefined, totalPages: number): PageRangeResult {
  const safeTotal = Math.max(1, totalPages || 1);
  if (!rangeStr || !rangeStr.trim()) {
    const allPages = Array.from({ length: safeTotal }, (_, i) => i + 1);
    return { valid: true, pages: allPages, count: safeTotal };
  }

  const clean = rangeStr.replace(/\s+/g, "");
  if (!/^[0-9,-]+$/.test(clean) || clean.startsWith(",") || clean.endsWith(",") || clean.includes(",,")) {
    return {
      valid: false,
      pages: [],
      count: 0,
      error: "Invalid characters or malformed comma structure in page range. Use only numbers, commas, and hyphens (e.g. 1-5, 8, 10).",
    };
  }

  const parts = clean.split(",");
  if (parts.length === 0) {
    return { valid: false, pages: [], count: 0, error: "Empty page range specified." };
  }

  const pageSet = new Set<number>();

  for (const part of parts) {
    if (!part) {
      return { valid: false, pages: [], count: 0, error: "Empty token in page range." };
    }
    if (part.includes("-")) {
      if (part.startsWith("-") || part.endsWith("-") || part.includes("--")) {
        return { valid: false, pages: [], count: 0, error: `Malformed hyphen in range token "${part}".` };
      }
      const subParts = part.split("-");
      if (subParts.length !== 2) {
        return { valid: false, pages: [], count: 0, error: `Malformed range token "${part}".` };
      }
      const start = parseInt(subParts[0], 10);
      const end = parseInt(subParts[1], 10);

      if (isNaN(start) || isNaN(end)) {
        return { valid: false, pages: [], count: 0, error: `Invalid numbers in range "${part}".` };
      }
      if (start > end) {
        return { valid: false, pages: [], count: 0, error: `Inverted range "${part}". Start page must be <= end page.` };
      }
      if (start < 1 || end > safeTotal) {
        return {
          valid: false,
          pages: [],
          count: 0,
          error: `Page range "${part}" is out of document bounds (Document has ${safeTotal} pages).`,
        };
      }

      for (let p = start; p <= end; p++) {
        pageSet.add(p);
      }
    } else {
      const p = parseInt(part, 10);
      if (isNaN(p)) {
        return { valid: false, pages: [], count: 0, error: `Invalid page number "${part}".` };
      }
      if (p < 1 || p > safeTotal) {
        return {
          valid: false,
          pages: [],
          count: 0,
          error: `Page number ${p} is out of document bounds (Document has ${safeTotal} pages).`,
        };
      }
      pageSet.add(p);
    }
  }

  const sortedPages = Array.from(pageSet).sort((a, b) => a - b);
  return {
    valid: true,
    pages: sortedPages,
    count: sortedPages.length,
  };
}

/**
 * For Mixed color printing, resolves which pages in the selected range are printed in color vs black & white.
 */
export function resolveMixedColorPages(
  selectedPages: number[],
  colorPagesRangeStr: string | undefined,
  totalPagesInDoc: number
): {
  colorPages: number[];
  bwPages: number[];
  colorCount: number;
  bwCount: number;
} {
  if (!colorPagesRangeStr || !colorPagesRangeStr.trim()) {
    return {
      colorPages: [],
      bwPages: [...selectedPages],
      colorCount: 0,
      bwCount: selectedPages.length,
    };
  }

  const colorParsed = parsePageRange(colorPagesRangeStr, totalPagesInDoc);
  const colorSet = new Set(colorParsed.pages);

  const finalColor: number[] = [];
  const finalBw: number[] = [];

  for (const page of selectedPages) {
    if (colorSet.has(page)) {
      finalColor.push(page);
    } else {
      finalBw.push(page);
    }
  }

  return {
    colorPages: finalColor,
    bwPages: finalBw,
    colorCount: finalColor.length,
    bwCount: finalBw.length,
  };
}

/**
 * Accurately computes physical sheets required per copy based on sides and pages-per-sheet (N-up).
 */
export function calculatePhysicalSheets(
  pageCount: number,
  sides: PrintSides,
  pagesPerSheet: PagesPerSheet = 1
): number {
  if (pageCount <= 0) return 0;
  const nUp = Math.max(1, pagesPerSheet || 1);
  const pagesPerSide = nUp;
  const pagesPerSheetTotal = sides === "single" ? pagesPerSide : pagesPerSide * 2;
  return Math.ceil(pageCount / pagesPerSheetTotal);
}

/**
 * Extended GSM Rates and Paper Surcharge Multipliers
 */
export const GSM_SURCHARGES: Record<PaperGSM, number> = {
  70: 0.0, // standard baseline
  75: 0.2, // +₹0.20 per sheet
  80: 0.5, // +₹0.50 per sheet
  100: 1.0, // +₹1.00 per sheet
  120: 2.0, // +₹2.00 per sheet
  160: 4.0, // +₹4.00 per sheet
  200: 6.0, // +₹6.00 per sheet
  250: 8.0, // +₹8.00 per sheet
};

export const PAPER_TYPE_SURCHARGES: Record<PaperType, number> = {
  normal: 0.0,
  premium: 0.5, // +₹0.50 per sheet
  glossy: 2.0, // +₹2.00 per sheet
  photo: 4.0, // +₹4.00 per sheet
  card: 5.0, // +₹5.00 per sheet
};

export const PAPER_SIZE_MULTIPLIERS: Record<PaperSize, number> = {
  a4: 1.0,
  a3: 2.0,
  a5: 0.75,
  letter: 1.0,
  legal: 1.25,
};

export const BINDING_PRICES: Record<string, number> = {
  none: 0,
  staple: 5,
  spiral: 30,
  comb: 25,
  soft: 80,
  hard: 150,
};

export const COVER_PRICES: Record<string, number> = {
  none: 0,
  transparent: 10,
  white: 10,
  black: 15,
  color: 20,
  custom: 30,
};

/**
 * Single authoritative pricing calculation for a document.
 */
export function calculateDocumentPrintPriceComplete(
  config: Partial<DocumentPrintConfig>,
  pricing: PrintPricingConfig = DEFAULT_PRINT_PRICING
): {
  selectedPageCount: number;
  bwPageCount: number;
  colorPageCount: number;
  physicalSheetsPerCopy: number;
  totalPhysicalSheets: number;
  itemPrice: number;
  totalPrice: number;
  priceBreakdown: DocumentPriceBreakdown;
} {
  const totalPages = Math.min(100000, Math.max(1, Math.floor(Number(config.totalPages) || 1)));
  const copies = Math.min(100000, Math.max(1, Math.floor(Number(config.copies) || 1)));
  const paperSize: PaperSize = config.paperSize || "a4";
  const paperType: PaperType = config.paperType || "normal";
  const gsm: PaperGSM = config.gsm || 75;
  const sides: PrintSides = config.sides || "double_long";
  const pagesPerSheet: PagesPerSheet = config.pagesPerSheet || 1;
  const colorMode = config.colorMode || "bw";

  // 1. Resolve selected page range
  const rangeRes = parsePageRange(
    config.pageRangeType === "custom" ? config.customPageRange : undefined,
    totalPages
  );
  const selectedPages = rangeRes.valid ? rangeRes.pages : Array.from({ length: totalPages }, (_, i) => i + 1);
  const selectedPageCount = selectedPages.length;

  // 2. Resolve Color vs B/W page tallies
  let bwPageCount = 0;
  let colorPageCount = 0;

  if (colorMode === "bw") {
    bwPageCount = selectedPageCount;
    colorPageCount = 0;
  } else if (colorMode === "color") {
    colorPageCount = selectedPageCount;
    bwPageCount = 0;
  } else {
    // mixed
    const mixed = resolveMixedColorPages(selectedPages, config.colorPagesRange, totalPages);
    colorPageCount = mixed.colorCount;
    bwPageCount = mixed.bwCount;
  }

  // 3. Size multiplier
  const sizeMultiplier = PAPER_SIZE_MULTIPLIERS[paperSize] || 1.0;

  // 4. Base rates
  const bwRate =
    sides === "single"
      ? pricing.documentPrinting.baseRatePerPage.bwSingle
      : pricing.documentPrinting.baseRatePerPage.bwDouble;

  const colorRate =
    sides === "single"
      ? pricing.documentPrinting.baseRatePerPage.colorSingle
      : pricing.documentPrinting.baseRatePerPage.colorDouble;

  const bwPrintCost = Math.round(bwPageCount * bwRate * sizeMultiplier * 100) / 100;
  const colorPrintCost = Math.round(colorPageCount * colorRate * sizeMultiplier * 100) / 100;

  // 5. Physical sheets calculation
  const physicalSheetsPerCopy = calculatePhysicalSheets(selectedPageCount, sides, pagesPerSheet);
  const totalPhysicalSheets = physicalSheetsPerCopy * copies;

  // 6. Paper Type & GSM Surcharge
  const gsmExtra = GSM_SURCHARGES[gsm] || 0;
  const paperTypeExtra = PAPER_TYPE_SURCHARGES[paperType] || 0;
  const paperCost = Math.round(physicalSheetsPerCopy * (gsmExtra + paperTypeExtra) * sizeMultiplier * 100) / 100;

  // 7. Binding Cost
  const bindingType = config.binding || "none";
  let bindingCost = BINDING_PRICES[bindingType] || 0;
  if (bindingType === "spiral" && pricing.documentPrinting.finishing.spiralBinding?.enabled) {
    bindingCost = pricing.documentPrinting.finishing.spiralBinding.price;
  } else if (bindingType === "comb" && pricing.documentPrinting.finishing.combBinding?.enabled) {
    bindingCost = pricing.documentPrinting.finishing.combBinding.price;
  } else if (bindingType === "staple" && pricing.documentPrinting.finishing.stapling?.enabled) {
    bindingCost = pricing.documentPrinting.finishing.stapling.price;
  }

  // 8. Cover Costs
  const frontCoverCost = COVER_PRICES[config.frontCover || "none"] || 0;
  const backCoverCost = COVER_PRICES[config.backCover || "none"] || 0;

  // 9. Finishing Costs (Lamination, Hole punch, etc.)
  let finishingCost = 0;
  if (config.finishing?.lamination && pricing.documentPrinting.finishing.lamination?.enabled) {
    finishingCost += physicalSheetsPerCopy * pricing.documentPrinting.finishing.lamination.pricePerPage * sizeMultiplier;
  }
  if (config.finishing?.holePunching) {
    finishingCost += 2 * physicalSheetsPerCopy;
  }
  if (config.finishing?.cutting) {
    finishingCost += 10;
  }
  if (config.finishing?.bookletMode) {
    finishingCost += 15;
  }

  const costPerCopy = Math.round(
    (bwPrintCost + colorPrintCost + paperCost + bindingCost + frontCoverCost + backCoverCost + finishingCost) * 100
  ) / 100;

  const totalCost = Math.round(costPerCopy * copies * 100) / 100;

  const breakdown: DocumentPriceBreakdown = {
    bwPrintCost,
    colorPrintCost,
    paperCost,
    bindingCost,
    frontCoverCost,
    backCoverCost,
    finishingCost,
    costPerCopy,
    totalCost,
  };

  return {
    selectedPageCount,
    bwPageCount,
    colorPageCount,
    physicalSheetsPerCopy,
    totalPhysicalSheets,
    itemPrice: costPerCopy,
    totalPrice: totalCost,
    priceBreakdown: breakdown,
  };
}

/**
 * Creates an immutable OrderPrintSnapshot for an order.
 */
export function buildOrderPrintSnapshot(
  documents: DocumentPrintConfig[],
  deliveryFee: number = 0,
  pricingVersion: string = "2026-08-22-v1"
): OrderPrintSnapshot {
  const totalDocuments = documents.length;
  let totalPrintedPages = 0;
  let totalBwPages = 0;
  let totalColorPages = 0;
  let totalPhysicalSheets = 0;
  let subtotal = 0;

  for (const doc of documents) {
    const docCopies = Math.max(1, doc.copies || 1);
    totalPrintedPages += doc.selectedPageCount * docCopies;
    totalBwPages += doc.bwPageCount * docCopies;
    totalColorPages += doc.colorPageCount * docCopies;
    totalPhysicalSheets += doc.totalPhysicalSheets;
    subtotal = Math.round((subtotal + doc.totalPrice) * 100) / 100;
  }

  const cleanDeliveryFee = Math.round(Math.max(0, deliveryFee || 0) * 100) / 100;
  const grandTotal = Math.round((subtotal + cleanDeliveryFee) * 100) / 100;

  return {
    version: "2026-08-22-v1",
    pricingConfigVersion: pricingVersion,
    documents: JSON.parse(JSON.stringify(documents)), // deep clone
    totalDocuments,
    totalPrintedPages,
    totalBwPages,
    totalColorPages,
    totalPhysicalSheets,
    subtotal,
    deliveryFee: cleanDeliveryFee,
    grandTotal,
    createdAt: new Date().toISOString(),
  };
}
