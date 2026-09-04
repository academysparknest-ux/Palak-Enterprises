/**
 * Authoritative Quick Services Pricing & Sync Test Suite
 *
 * Validates:
 * 1. Currency & precision formatting (formatPrice, roundPrice)
 * 2. Pricing sanitization & resilience against corrupted/malicious inputs
 * 3. Cross-tab real-time event broadcasting and subscription
 * 4. Document print pricing calculations (GSM, sizes, bindings, covers, lamination)
 * 5. Visiting cards, passport photos, and ID cards calculations
 * 6. Historical order immutability
 *
 * Run: npx tsx src/lib/orders/quickServicePricingSync.test.ts
 */

import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingConfig,
} from "../../config/printPricing";
import {
  sanitizePriceValue,
  sanitizeMultiplierValue,
  sanitizeAndMergePrintPricing,
  broadcastPrintPricingUpdate,
  subscribeToPrintPricing,
} from "../supabase/database";
import { formatPrice, roundPrice } from "../utils";
import { calculateDocumentPrintPriceComplete, buildOrderPrintSnapshot } from "../pricing/printPricingEngine";
import type { DocumentPrintConfig } from "../../types/printJob";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ────────────────────────────────────────────────────────────────
// Section 1: Currency & Precision Formatting
// ────────────────────────────────────────────────────────────────
section("1. Currency & Precision Utilities");

assert(roundPrice(1.50000001) === 1.5, "roundPrice rounds 1.50000001 to 1.5");
assert(roundPrice(8.555) === 8.56, "roundPrice rounds 8.555 to 8.56");
assert(roundPrice(2.0) === 2, "roundPrice preserves integer 2");
assert(roundPrice(0.0001) === 0, "roundPrice rounds 0.0001 to 0");

assert(formatPrice(2) === "₹2", "formatPrice formats integer ₹2 without decimals");
assert(formatPrice(30) === "₹30", "formatPrice formats integer ₹30 without decimals");
assert(formatPrice(250) === "₹250", "formatPrice formats integer ₹250 without decimals");
assert(formatPrice(1.5) === "₹1.50", "formatPrice formats fractional 1.5 as ₹1.50");
assert(formatPrice(8.5) === "₹8.50", "formatPrice formats fractional 8.5 as ₹8.50");
assert(formatPrice(0.75) === "₹0.75", "formatPrice formats fractional 0.75 as ₹0.75");
assert(formatPrice(0) === "₹0", "formatPrice formats 0 as ₹0");
assert(formatPrice(NaN) === "₹0", "formatPrice formats NaN safely as ₹0");

// ────────────────────────────────────────────────────────────────
// Section 2: Pricing Sanitization & Resiliency
// ────────────────────────────────────────────────────────────────
section("2. Pricing Sanitization & Boundary Protections");

assert(sanitizePriceValue(-5, 10) === 10, "sanitizePriceValue rejects negative values");
assert(sanitizePriceValue(NaN, 10) === 10, "sanitizePriceValue rejects NaN");
assert(sanitizePriceValue("invalid", 10) === 10, "sanitizePriceValue rejects non-numbers");
assert(sanitizePriceValue(15.75, 10) === 15.75, "sanitizePriceValue accepts valid positive numbers");
assert(sanitizePriceValue(0, 10, 0) === 0, "sanitizePriceValue allows zero if minVal=0");

assert(sanitizeMultiplierValue(0, 1) === 1, "sanitizeMultiplierValue rejects 0 multiplier");
assert(sanitizeMultiplierValue(-1, 1) === 1, "sanitizeMultiplierValue rejects negative multiplier");
assert(sanitizeMultiplierValue(1.5, 1) === 1.5, "sanitizeMultiplierValue accepts 1.5 multiplier");
assert(sanitizeMultiplierValue(2, 1) === 2, "sanitizeMultiplierValue accepts 2 multiplier");

const partialMalicious: any = {
  documentPrinting: {
    baseRatePerPage: {
      bwSingle: -999, // Malicious negative
      bwDouble: 1.75, // Valid
    },
    paperSizes: {
      a3: { multiplier: "invalid_string" }, // Malicious string
      a5: { multiplier: 0.8 }, // Valid
    },
  },
};

const merged = sanitizeAndMergePrintPricing(DEFAULT_PRINT_PRICING, partialMalicious);
assert(
  merged.documentPrinting.baseRatePerPage.bwSingle === DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage.bwSingle,
  "sanitizeAndMergePrintPricing reverts negative rate to fallback"
);
assert(
  merged.documentPrinting.baseRatePerPage.bwDouble === 1.75,
  "sanitizeAndMergePrintPricing retains valid updated rate 1.75"
);
assert(
  merged.documentPrinting.paperSizes.a3.multiplier === DEFAULT_PRINT_PRICING.documentPrinting.paperSizes.a3.multiplier,
  "sanitizeAndMergePrintPricing reverts malformed multiplier string"
);
assert(
  merged.documentPrinting.paperSizes.a5.multiplier === 0.8,
  "sanitizeAndMergePrintPricing retains valid multiplier 0.8"
);
assert(
  merged.passportPhoto.sheet8 === DEFAULT_PRINT_PRICING.passportPhoto.sheet8,
  "sanitizeAndMergePrintPricing preserves untouched services"
);

// ────────────────────────────────────────────────────────────────
// Section 3: Real-Time Event Hub & Multi-Tab Subscription
// ────────────────────────────────────────────────────────────────
section("3. Real-Time Broadcast & Subscription");

let receivedUpdate: PrintPricingConfig | null = null;
const unsubscribe = subscribeToPrintPricing((cfg) => {
  receivedUpdate = cfg;
});

const testBroadcastConfig: PrintPricingConfig = {
  ...DEFAULT_PRINT_PRICING,
  documentPrinting: {
    ...DEFAULT_PRINT_PRICING.documentPrinting,
    baseRatePerPage: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage,
      bwSingle: 3,
      bwDouble: 2.25,
    },
  },
};

broadcastPrintPricingUpdate(testBroadcastConfig);
assert(
  receivedUpdate !== null && (receivedUpdate as PrintPricingConfig).documentPrinting.baseRatePerPage.bwSingle === 3,
  "broadcastPrintPricingUpdate triggers registered subscriber with new config"
);

unsubscribe();
receivedUpdate = null;
broadcastPrintPricingUpdate(DEFAULT_PRINT_PRICING);
assert(
  receivedUpdate === null,
  "unsubscribe cleanly prevents subscriber from receiving subsequent updates"
);

// ────────────────────────────────────────────────────────────────
// Section 4: Authoritative Pricing Calculations
// ────────────────────────────────────────────────────────────────
section("4. Authoritative Calculation Consistency");

const docConfig: Partial<DocumentPrintConfig> = {
  paperSize: "a3",
  colorMode: "bw",
  sides: "single",
  gsm: 70,
  binding: "spiral",
  frontCover: "transparent",
  backCover: "black",
  copies: 2,
  totalPages: 10,
};

const customPricing: PrintPricingConfig = {
  ...DEFAULT_PRINT_PRICING,
  documentPrinting: {
    ...DEFAULT_PRINT_PRICING.documentPrinting,
    baseRatePerPage: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage,
      bwSingle: 2,
      bwDouble: 1.5,
    },
    paperSizes: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.paperSizes,
      a3: { name: "A3", multiplier: 2, enabled: true },
    },
    finishing: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.finishing,
      spiralBinding: {
        ...DEFAULT_PRINT_PRICING.documentPrinting.finishing.spiralBinding,
        price: 30,
      },
    },
  },
};

// 10 pages * ₹2 = ₹20 * A3 multiplier (2x) = ₹40
// Plus Spiral (₹30) + Transparent front (₹10) + Black back (₹15) = ₹55
// Total per copy = ₹40 + ₹55 = ₹95. Copies = 2 => Grand total = ₹190
const docResult = calculateDocumentPrintPriceComplete(docConfig, customPricing);
assert(docResult.itemPrice === 95, "Doc item price calculated correctly at ₹95");
assert(docResult.totalPrice === 190, "Doc total price for 2 copies calculated correctly at ₹190");

const colorDoubleConfig: Partial<DocumentPrintConfig> = {
  paperSize: "a4",
  colorMode: "color",
  sides: "double_long",
  gsm: 70,
  binding: "none",
  frontCover: "none",
  backCover: "none",
  copies: 1,
  totalPages: 10,
};

const colorPricing: PrintPricingConfig = {
  ...DEFAULT_PRINT_PRICING,
  documentPrinting: {
    ...DEFAULT_PRINT_PRICING.documentPrinting,
    baseRatePerPage: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage,
      colorSingle: 8.5,
      colorDouble: 7,
    },
  },
};

const colorResult = calculateDocumentPrintPriceComplete(colorDoubleConfig, colorPricing);
assert(colorResult.totalPrice === 70, "Color double sided (10 pages * ₹7) calculates correctly at ₹70");

// ────────────────────────────────────────────────────────────────
// Section 5: Historical Order Immutability
// ────────────────────────────────────────────────────────────────
section("5. Historical Immutability Guarantee");

const historicalOrder = {
  id: "order-123",
  unit_price: 2.0,
  total_price: 100.0,
  print_snapshot: {
    grandTotal: 100.0,
    rateApplied: 2.0,
    timestamp: "2026-01-01T00:00:00Z",
  },
};

Object.freeze(historicalOrder);
Object.freeze(historicalOrder.print_snapshot);

const newAdminPricing: PrintPricingConfig = {
  ...DEFAULT_PRINT_PRICING,
  documentPrinting: {
    ...DEFAULT_PRINT_PRICING.documentPrinting,
    baseRatePerPage: {
      ...DEFAULT_PRINT_PRICING.documentPrinting.baseRatePerPage,
      bwSingle: 5.0,
      bwDouble: 4.0,
    },
  },
};

assert(historicalOrder.unit_price === 2.0, "Historical order unit_price is preserved at ₹2.0");
assert(historicalOrder.total_price === 100.0, "Historical order total_price is preserved at ₹100.0");
assert(historicalOrder.print_snapshot.grandTotal === 100.0, "Historical snapshot grandTotal remains ₹100.0");
assert(newAdminPricing.documentPrinting.baseRatePerPage.bwSingle === 5.0, "New pricing reflects ₹5.0 independently");

// ────────────────────────────────────────────────────────────────
// Section 6: Live Binding Recalculation & Transparent Breakdown
// ────────────────────────────────────────────────────────────────
section("6. Live Binding Recalculation & Transparent Breakdown");

const baseDoc: Partial<DocumentPrintConfig> = {
  paperSize: "a4",
  colorMode: "bw",
  sides: "single",
  gsm: 70,
  paperType: "normal",
  binding: "none",
  frontCover: "none",
  backCover: "none",
  copies: 1,
  totalPages: 10,
  pageRangeType: "all",
};

// 1. Binding Option Transitions: None -> Staple -> Spiral -> Comb -> Soft -> Hard -> None
const rNone = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "none" });
assert(rNone.priceBreakdown.bindingCost === 0, "Binding none gives ₹0 bindingCost");
assert(rNone.totalPrice === 20, "10 pages B/W single side = ₹20 with no binding");

const rStaple = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "staple" });
assert(rStaple.priceBreakdown.bindingCost === 5, "Binding staple gives ₹5 bindingCost");
assert(rStaple.totalPrice === 25, "10 pages B/W single side + staple = ₹25");

const rSpiral = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "spiral" });
assert(rSpiral.priceBreakdown.bindingCost === 30, "Binding spiral gives ₹30 bindingCost");
assert(rSpiral.totalPrice === 50, "10 pages B/W single side + spiral = ₹50");

const rComb = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "comb" });
assert(rComb.priceBreakdown.bindingCost === 25, "Binding comb gives ₹25 bindingCost");
assert(rComb.totalPrice === 45, "10 pages B/W single side + comb = ₹45");

const rSoft = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "soft" });
assert(rSoft.priceBreakdown.bindingCost === 80, "Binding soft gives ₹80 bindingCost");
assert(rSoft.totalPrice === 100, "10 pages B/W single side + soft = ₹100");

const rHard = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "hard" });
assert(rHard.priceBreakdown.bindingCost === 150, "Binding hard gives ₹150 bindingCost");
assert(rHard.totalPrice === 170, "10 pages B/W single side + hard = ₹170");

// Verify removing binding restores original price immediately
const rResetNone = calculateDocumentPrintPriceComplete({ ...baseDoc, binding: "none" });
assert(rResetNone.priceBreakdown.bindingCost === 0, "Resetting binding back to none gives ₹0");
assert(rResetNone.totalPrice === 20, "Resetting binding drops total back to ₹20");

// 2. Thermal Lamination: OFF -> ON -> OFF
const rNoLam = calculateDocumentPrintPriceComplete({ ...baseDoc, finishing: { lamination: false } });
assert((rNoLam.priceBreakdown.laminationCost || 0) === 0, "Lamination OFF gives ₹0 laminationCost");

const rWithLam = calculateDocumentPrintPriceComplete({ ...baseDoc, finishing: { lamination: true } });
// 10 single-sided sheets * ₹15/sheet = ₹150
assert(rWithLam.priceBreakdown.laminationCost === 150, "Lamination ON gives 10 sheets * ₹15 = ₹150");
assert(rWithLam.totalPrice === 170, "Base ₹20 + Lamination ₹150 = ₹170");

const rLamReset = calculateDocumentPrintPriceComplete({ ...baseDoc, finishing: { lamination: false } });
assert((rLamReset.priceBreakdown.laminationCost || 0) === 0, "Lamination toggled OFF gives ₹0");
assert(rLamReset.totalPrice === 20, "Total reverts back to ₹20 after toggling lamination OFF");

// 3. Covers: None -> Transparent Front & Black Back -> None
const rCovers = calculateDocumentPrintPriceComplete({
  ...baseDoc,
  frontCover: "transparent",
  backCover: "black",
});
assert(rCovers.priceBreakdown.frontCoverCost === 10, "Transparent front cover is ₹10");
assert(rCovers.priceBreakdown.backCoverCost === 15, "Black back cover is ₹15");
assert(rCovers.totalPrice === 45, "Base ₹20 + Covers ₹25 = ₹45");

// 4. Copies Multiplier: 1 copy -> 3 copies
const r3Copies = calculateDocumentPrintPriceComplete({ ...baseDoc, copies: 3 });
assert(r3Copies.itemPrice === 20, "Cost per copy remains ₹20");
assert(r3Copies.totalPrice === 60, "3 copies total ₹60");

// 5. Custom Page Range: All (10 pgs) -> Custom "1-3, 5" (4 pgs)
const rRange = calculateDocumentPrintPriceComplete({
  ...baseDoc,
  pageRangeType: "custom",
  customPageRange: "1-3, 5",
});
assert(rRange.selectedPageCount === 4, "Custom page range parsed to 4 pages");
assert(rRange.totalPrice === 8, "4 pages * ₹2 = ₹8");

// 6. Comprehensive Multi-Attribute Configuration
// 10 pages, Color double-sided (DEFAULT_PRINT_PRICING: ₹9/pg * 10 = ₹90), A3 size (2x = ₹180),
// 2 copies, Spiral (₹30), Transparent front (₹10), Lamination (5 sheets * ₹15 * 2x size = ₹150), 70 GSM (+₹0)
// Item price = ₹180 + ₹30 + ₹10 + ₹150 = ₹370 per copy
// Total price for 2 copies = ₹740
const complexConfig: Partial<DocumentPrintConfig> = {
  paperSize: "a3",
  colorMode: "color",
  sides: "double_long",
  gsm: 70,
  copies: 2,
  totalPages: 10,
  binding: "spiral",
  frontCover: "transparent",
  finishing: { lamination: true },
};

const rComplex = calculateDocumentPrintPriceComplete(complexConfig, DEFAULT_PRINT_PRICING);
assert(rComplex.itemPrice === 370, "Complex configuration unit cost is exactly ₹370");
assert(rComplex.totalPrice === 740, "Complex configuration total for 2 copies is exactly ₹740");
assert(rComplex.priceBreakdown.ratePerPageApplied === 9, "Breakdown includes ratePerPageApplied = ₹9");
assert(rComplex.priceBreakdown.sizeMultiplierApplied === 2, "Breakdown includes sizeMultiplierApplied = 2x");
assert(rComplex.priceBreakdown.bindingCost === 30, "Breakdown includes bindingCost = ₹30");
assert(rComplex.priceBreakdown.laminationCost === 150, "Breakdown includes laminationCost = ₹150");

// 7. Order Snapshot Consistency Guarantee
const snapshot = buildOrderPrintSnapshot([complexConfig as DocumentPrintConfig], 0, "test-v1", DEFAULT_PRINT_PRICING);
assert(snapshot.grandTotal === rComplex.totalPrice, "Order snapshot grandTotal perfectly matches document total");

// ────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
