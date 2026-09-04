/**
 * Print Order Specification Sync & Admin Production Requirements Test Suite
 *
 * Verifies that:
 * 1. Customer selections produce exact canonical print configurations and price breakdown.
 * 2. Order persistence captures the immutable snapshot.
 * 3. Normalization and storage extract all production specifications (GSM, binding, covers, finishing, orientation).
 * 4. Multi-file orders preserve independent specifications per file.
 * 5. Legacy orders fallback cleanly without crashing.
 */

import {
  calculateDocumentPrintPriceComplete,
  buildOrderPrintSnapshot,
} from "../pricing/printPricingEngine";
import { submitPrintOrder } from "../supabase/database";
import { PalakDataStore, normalizeOrder } from "../storage/store";
import type { DocumentPrintConfig } from "../../types/printJob";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    passedCount++;
  }
}

export async function runPrintOrderSpecSyncTests() {
  console.log("\n========================================================");
  console.log("🖨️ RUNNING PRINT ORDER SPECIFICATION SYNC TEST SUITE");
  console.log("========================================================\n");

  // TEST 1: Exact Screenshot 1 Order (1 page, 100 GSM, Staple, Transparent Front, Color Back, Thermal Lamination = ₹53.00)
  console.log("▶ Test 1: Canonical Pricing Calculation for Exact Screenshot 1 Order (₹53.00)");
  const screenshot1DocConfig: Partial<DocumentPrintConfig> = {
    documentId: "doc_screenshot_1",
    fileName: "Palak-Enterprises-Invoice-PE-2026-000027 (1).pdf",
    totalPages: 1,
    copies: 1,
    paperSize: "a4",
    paperType: "normal",
    gsm: 100,
    colorMode: "bw",
    sides: "single",
    orientation: "portrait",
    binding: "staple",
    frontCover: "transparent",
    backCover: "color",
    finishing: {
      lamination: true,
      holePunching: false,
      bookletMode: false,
    },
  };

  const calcResult = calculateDocumentPrintPriceComplete(screenshot1DocConfig);
  assert(calcResult.selectedPageCount === 1, "Selected page count is 1");
  assert(calcResult.bwPageCount === 1, "B/W page count is 1");
  assert(calcResult.colorPageCount === 0, "Color page count is 0");
  assert(calcResult.physicalSheetsPerCopy === 1, "Physical sheets is 1");
  assert(calcResult.priceBreakdown.bwPrintCost === 2, "Base B/W A4 single rate is ₹2.00");
  assert(calcResult.priceBreakdown.paperCost === 1, "100 GSM paper surcharge is +₹1.00");
  assert(calcResult.priceBreakdown.bindingCost === 5, "Corner/Saddle Staple cost is +₹5.00");
  assert(calcResult.priceBreakdown.frontCoverCost === 10, "Transparent Plastic Sheet front cover is +₹10.00");
  assert(calcResult.priceBreakdown.backCoverCost === 20, "Color Card Sheet back cover is +₹20.00");
  assert(calcResult.priceBreakdown.finishingCost === 15, "Thermal Lamination cost is +₹15.00");
  assert(calcResult.totalPrice === 53, "Exact calculated total price is ₹53.00 (2 + 1 + 5 + 10 + 20 + 15 = 53)");

  const fullDoc: DocumentPrintConfig = {
    ...(screenshot1DocConfig as DocumentPrintConfig),
    ...calcResult,
  };

  const snapshot = buildOrderPrintSnapshot([fullDoc], 0, "2026-08-22-v1");
  assert(snapshot.documents.length === 1, "Snapshot contains exactly 1 document");
  assert(snapshot.documents[0].gsm === 100, "Snapshot document GSM is 100");
  assert(snapshot.documents[0].binding === "staple", "Snapshot document binding is staple");
  assert(snapshot.documents[0].frontCover === "transparent", "Snapshot document front cover is transparent");
  assert(snapshot.documents[0].backCover === "color", "Snapshot document back cover is color");
  assert(snapshot.documents[0].finishing.lamination === true, "Snapshot document lamination is true");
  assert(snapshot.grandTotal === 53, "Snapshot grandTotal is exactly ₹53.00");

  // TEST 2: Order Persistence & Full Snapshot Retrieval
  console.log("\n▶ Test 2: Order Persistence & Extraction via submitPrintOrder");
  const subId = `TEST_SPEC_SUB_${Date.now()}`;
  const submitRes = await submitPrintOrder({
    clientSubmissionId: subId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    documentType: "Assignment",
    customerName: "TEAM RDX",
    customerPhone: "09576742410",
    customerEmail: "rishavrajchaman@gmail.com",
    instructions: "Online Service: Document Printing | Doc: Assignment",
    paymentMethod: "pay_at_store",
    paymentStatus: "pending",
    pricingSnapshot: {
      unitPrice: snapshot.subtotal,
      subtotal: snapshot.subtotal,
      totalAmount: snapshot.grandTotal,
      breakdown: { snapshot },
    },
    options: {
      documentType: "Assignment",
      totalDocuments: 1,
      totalPages: snapshot.totalPrintedPages,
      printSnapshot: snapshot,
    },
    printSnapshot: snapshot,
    file: {
      name: fullDoc.fileName,
      size: 1024 * 410,
      url: "https://example.com/Palak-Enterprises-Invoice.pdf",
      storagePath: "orders/test/Palak-Enterprises-Invoice.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    },
    files: [
      {
        name: fullDoc.fileName,
        size: 1024 * 410,
        url: "https://example.com/Palak-Enterprises-Invoice.pdf",
        storagePath: "orders/test/Palak-Enterprises-Invoice.pdf",
        mimeType: "application/pdf",
        pageCount: 1,
      },
    ],
  });

  assert(submitRes.success, "Order submission succeeded");
  assert(Boolean(submitRes.orderCode), `Order code generated: ${submitRes.orderCode}`);

  const localSaved = PalakDataStore.getOrderByCode(submitRes.orderCode);
  assert(Boolean(localSaved), "Order found in PalakDataStore");
  assert(localSaved?.printSnapshot !== undefined, "Order has printSnapshot attached");
  assert(localSaved?.printSnapshot?.documents[0]?.gsm === 100, "Stored printSnapshot preserves 100 GSM");
  assert(localSaved?.printSnapshot?.documents[0]?.binding === "staple", "Stored printSnapshot preserves staple binding");
  assert(localSaved?.printSnapshot?.documents[0]?.frontCover === "transparent", "Stored printSnapshot preserves transparent front cover");
  assert(localSaved?.printSnapshot?.documents[0]?.backCover === "color", "Stored printSnapshot preserves color back cover");
  assert(localSaved?.printSnapshot?.documents[0]?.finishing?.lamination === true, "Stored printSnapshot preserves lamination");
  assert(localSaved?.items[0].selectedOptions.gsm === 100, "Order item selectedOptions preserves gsm: 100");
  assert(localSaved?.items[0].selectedOptions.binding === "staple", "Order item selectedOptions preserves binding: staple");
  assert(localSaved?.items[0].selectedOptions.frontCover === "transparent", "Order item selectedOptions preserves frontCover: transparent");
  assert(localSaved?.items[0].selectedOptions.backCover === "color", "Order item selectedOptions preserves backCover: color");

  // TEST 3: Multi-File Orders Isolation (File 1: 20p 100GSM Color Double Stapled, File 2: 5p 75GSM BW Single, File 3: 10p 120GSM Color Laminated)
  console.log("\n▶ Test 3: Multi-File Orders with Independent Configurations");
  const doc1Calc = calculateDocumentPrintPriceComplete({
    documentId: "doc_multi_1",
    fileName: "ProjectReport_Part1.pdf",
    totalPages: 20,
    copies: 1,
    paperSize: "a4",
    gsm: 100,
    colorMode: "color",
    sides: "double_long",
    orientation: "portrait",
    binding: "staple",
  });
  const doc1: DocumentPrintConfig = {
    documentId: "doc_multi_1",
    fileName: "ProjectReport_Part1.pdf",
    fileSize: 1024 * 1024 * 2,
    totalPages: 20,
    pageRangeType: "all",
    pagesPerSheet: 1,
    scaling: "fit",
    copies: 1,
    paperSize: "a4",
    paperType: "normal",
    gsm: 100,
    colorMode: "color",
    sides: "double_long",
    orientation: "portrait",
    binding: "staple",
    frontCover: "none",
    backCover: "none",
    finishing: {},
    ...doc1Calc,
  };

  const doc2Calc = calculateDocumentPrintPriceComplete({
    documentId: "doc_multi_2",
    fileName: "Appendix_Notes.pdf",
    totalPages: 5,
    copies: 1,
    paperSize: "a4",
    gsm: 75,
    colorMode: "bw",
    sides: "single",
    orientation: "portrait",
    binding: "none",
  });
  const doc2: DocumentPrintConfig = {
    documentId: "doc_multi_2",
    fileName: "Appendix_Notes.pdf",
    fileSize: 1024 * 500,
    totalPages: 5,
    pageRangeType: "all",
    pagesPerSheet: 1,
    scaling: "fit",
    copies: 1,
    paperSize: "a4",
    paperType: "normal",
    gsm: 75,
    colorMode: "bw",
    sides: "single",
    orientation: "portrait",
    binding: "none",
    frontCover: "none",
    backCover: "none",
    finishing: {},
    ...doc2Calc,
  };

  const doc3Calc = calculateDocumentPrintPriceComplete({
    documentId: "doc_multi_3",
    fileName: "CoverAndCertificates.pdf",
    totalPages: 10,
    copies: 1,
    paperSize: "a4",
    gsm: 120,
    colorMode: "color",
    sides: "double_long",
    orientation: "landscape",
    binding: "none",
    finishing: { lamination: true },
  });
  const doc3: DocumentPrintConfig = {
    documentId: "doc_multi_3",
    fileName: "CoverAndCertificates.pdf",
    fileSize: 1024 * 1024,
    totalPages: 10,
    pageRangeType: "all",
    pagesPerSheet: 1,
    scaling: "fit",
    copies: 1,
    paperSize: "a4",
    paperType: "normal",
    gsm: 120,
    colorMode: "color",
    sides: "double_long",
    orientation: "landscape",
    binding: "none",
    frontCover: "none",
    backCover: "none",
    finishing: { lamination: true },
    ...doc3Calc,
  };

  const multiSnapshot = buildOrderPrintSnapshot([doc1, doc2, doc3], 0, "2026-08-22-v1");
  assert(multiSnapshot.totalDocuments === 3, "Multi-doc snapshot has 3 documents");
  assert(multiSnapshot.totalPrintedPages === 35, "Multi-doc total pages is 20 + 5 + 10 = 35");

  const multiSubId = `MULTI_SUB_${Date.now()}`;
  const multiSubmitRes = await submitPrintOrder({
    clientSubmissionId: multiSubId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Multi File Client",
    customerPhone: "9123456789",
    paymentMethod: "pay_at_store",
    paymentStatus: "pending",
    pricingSnapshot: {
      unitPrice: multiSnapshot.subtotal,
      subtotal: multiSnapshot.subtotal,
      totalAmount: multiSnapshot.grandTotal,
      breakdown: { snapshot: multiSnapshot },
    },
    options: {
      documentType: "Project Report",
      totalDocuments: 3,
      totalPages: multiSnapshot.totalPrintedPages,
      printSnapshot: multiSnapshot,
    },
    printSnapshot: multiSnapshot,
    files: [
      { name: doc1.fileName, size: doc1.fileSize, url: "https://example.com/doc1.pdf", pageCount: 20 },
      { name: doc2.fileName, size: doc2.fileSize, url: "https://example.com/doc2.pdf", pageCount: 5 },
      { name: doc3.fileName, size: doc3.fileSize, url: "https://example.com/doc3.pdf", pageCount: 10 },
    ],
  });

  assert(multiSubmitRes.success, "Multi-file order submitted successfully");
  const multiOrder = PalakDataStore.getOrderByCode(multiSubmitRes.orderCode);
  assert(Boolean(multiOrder), "Multi-file order retrieved from store");
  assert(multiOrder?.printSnapshot?.documents?.length === 3, "Retrieved multi-order has 3 distinct document configs");
  assert(multiOrder?.printSnapshot?.documents[0].gsm === 100, "File 1 retains 100 GSM");
  assert(multiOrder?.printSnapshot?.documents[0].colorMode === "color", "File 1 retains Color");
  assert(multiOrder?.printSnapshot?.documents[0].binding === "staple", "File 1 retains Staple");
  assert(multiOrder?.printSnapshot?.documents[1].gsm === 75, "File 2 retains 75 GSM");
  assert(multiOrder?.printSnapshot?.documents[1].colorMode === "bw", "File 2 retains B/W");
  assert(multiOrder?.printSnapshot?.documents[1].binding === "none", "File 2 retains No Binding");
  assert(multiOrder?.printSnapshot?.documents[2].gsm === 120, "File 3 retains 120 GSM");
  assert(multiOrder?.printSnapshot?.documents[2].finishing?.lamination === true, "File 3 retains Lamination");

  // TEST 4: Legacy Order Normalization Safety
  console.log("\n▶ Test 4: Legacy Order Backward Compatibility");
  const legacyRaw = {
    order_code: "PE-LEGACY-001",
    customer_name: "Legacy Customer",
    customer_phone: "9999999999",
    total_amount: 25,
    items: [
      {
        productId: "document-printing",
        productName: "Document Printing",
        quantity: 1,
        unitPrice: 25,
        totalPrice: 25,
        selectedOptions: {
          totalPages: 5,
        },
      },
    ],
  };

  const legacyNormalized = normalizeOrder(legacyRaw);
  assert(legacyNormalized.orderCode === "PE-LEGACY-001", "Legacy order code normalized");
  assert(legacyNormalized.items.length === 1, "Legacy items normalized");
  assert(legacyNormalized.items[0].selectedOptions.totalPages === 5, "Legacy totalPages preserved");
  assert(legacyNormalized.items[0].selectedOptions.colorMode === "bw", "Legacy colorMode defaults safely to bw");
  assert(legacyNormalized.items[0].selectedOptions.sides === "single", "Legacy sides defaults safely to single");

  console.log("\n========================================================");
  console.log(`✅ ALL TESTS PASSED (${passedCount} checks passed, ${failedCount} failed)`);
  console.log("========================================================\n");
  process.exit(0);
}

// Self-run when executed directly via tsx
runPrintOrderSpecSyncTests().catch((e) => {
  console.error("Test execution encountered fatal error:", e);
  process.exit(1);
});
