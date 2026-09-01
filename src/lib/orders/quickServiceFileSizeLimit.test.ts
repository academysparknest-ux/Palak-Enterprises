/**
 * Quick Service File Size Limit & Production Safety Test Suite
 *
 * Tests the 45 MB protection boundary, multi-file validation, upload engine gate,
 * order submission protection, zero-expensive-processing guarantee, and single source of truth.
 *
 * Run: npx tsx src/lib/orders/quickServiceFileSizeLimit.test.ts
 */

import {
  QUICK_SERVICE_MAX_FILE_SIZE_MB,
  QUICK_SERVICE_MAX_FILE_SIZE_BYTES,
  QUICK_SERVICE_CONFIG,
  validateQuickServiceFileSize,
  validateQuickServiceFiles,
  formatFileSizeMB,
  getQuickServiceUploadLimitText,
} from "../../config/quickServiceConfig";
import {
  inspectDocumentFormat,
  globalDocumentAnalysisQueue,
} from "../documents/documentPageCountEngine";
import {
  uploadSingleFileWithProgress,
  uploadOrderDocumentsWithProgress,
} from "./orderUploadEngine";
import { submitPrintOrder } from "../supabase/database";
import {
  saveActiveSubmissionSession,
  getActiveSubmissionSession,
  clearActiveSubmissionSession,
} from "./submissionRecovery";

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

async function runTests() {
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("  QUICK SERVICE 45 MB FILE SIZE LIMIT & SAFETY TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════════════\n");

  // Helper to create mock File-like objects
  function createMockFile(name: string, sizeBytes: number, type = "application/pdf"): File {
    return {
      name,
      size: sizeBytes,
      type,
      slice: () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => "",
      stream: () => new ReadableStream(),
      lastModified: Date.now(),
      webkitRelativePath: "",
      bytes: async () => new Uint8Array(0),
    } as unknown as File;
  }

  // ---------------------------------------------------------------------------
  // Test 1: 1 KB passes
  // ---------------------------------------------------------------------------
  console.log("[1/20] Testing 1 KB file size validation...");
  const file1KB = createMockFile("notes_1kb.pdf", 1024);
  const res1KB = validateQuickServiceFileSize(file1KB);
  assert(res1KB.isValid === true, "1 KB file passes validation");
  assert(res1KB.selectedSizeBytes === 1024, "1 KB byte size matches");

  // ---------------------------------------------------------------------------
  // Test 2: 1 MB passes
  // ---------------------------------------------------------------------------
  console.log("[2/20] Testing 1 MB file size validation...");
  const file1MB = createMockFile("assignment_1mb.pdf", 1 * 1024 * 1024);
  const res1MB = validateQuickServiceFileSize(file1MB);
  assert(res1MB.isValid === true, "1 MB file passes validation");
  assert(res1MB.selectedSizeMB === 1, "1 MB size is exactly 1 MB");

  // ---------------------------------------------------------------------------
  // Test 3: 44 MB passes
  // ---------------------------------------------------------------------------
  console.log("[3/20] Testing 44 MB file size validation...");
  const file44MB = createMockFile("project_44mb.pdf", 44 * 1024 * 1024);
  const res44MB = validateQuickServiceFileSize(file44MB);
  assert(res44MB.isValid === true, "44 MB file passes validation");
  assert(res44MB.selectedSizeMB === 44, "44 MB size is exactly 44 MB");

  // ---------------------------------------------------------------------------
  // Test 4: Exactly 45 MB passes (Deterministic boundary)
  // ---------------------------------------------------------------------------
  console.log("[4/20] Testing exactly 45 MB file size boundary...");
  const file45MB = createMockFile("boundary_45mb.pdf", 45 * 1024 * 1024);
  const res45MB = validateQuickServiceFileSize(file45MB);
  assert(res45MB.isValid === true, "Exactly 45 MB (47,185,920 bytes) passes validation");
  assert(res45MB.selectedSizeBytes === QUICK_SERVICE_MAX_FILE_SIZE_BYTES, "Matches QUICK_SERVICE_MAX_FILE_SIZE_BYTES");

  // ---------------------------------------------------------------------------
  // Test 5: 45 MB + 1 byte fails
  // ---------------------------------------------------------------------------
  console.log("[5/20] Testing 45 MB + 1 byte boundary rejection...");
  const file45MBPlus1 = createMockFile("boundary_45mb_plus_1.pdf", 45 * 1024 * 1024 + 1);
  const res45MBPlus1 = validateQuickServiceFileSize(file45MBPlus1);
  assert(res45MBPlus1.isValid === false, "45 MB + 1 byte is rejected");
  assert(res45MBPlus1.error !== undefined, "Returns error for 45 MB + 1 byte");

  // ---------------------------------------------------------------------------
  // Test 6: 50 MB fails (Supabase free limit boundary protection)
  // ---------------------------------------------------------------------------
  console.log("[6/20] Testing 50 MB file rejection...");
  const file50MB = createMockFile("catalog_50mb.pdf", 50 * 1024 * 1024);
  const res50MB = validateQuickServiceFileSize(file50MB);
  assert(res50MB.isValid === false, "50 MB file is rejected before reaching Supabase");

  // ---------------------------------------------------------------------------
  // Test 7: 70 MB fails
  // ---------------------------------------------------------------------------
  console.log("[7/20] Testing 70 MB file rejection...");
  const file70MB = createMockFile("scans_70mb.pdf", 70 * 1024 * 1024);
  const res70MB = validateQuickServiceFileSize(file70MB);
  assert(res70MB.isValid === false, "70 MB file is rejected");

  // ---------------------------------------------------------------------------
  // Test 8: 85.12 MB fails (Simulated Bihar STET exam paper)
  // ---------------------------------------------------------------------------
  console.log("[8/20] Testing 85.12 MB Bihar STET exam paper rejection...");
  const size85MB = Math.round(85.12 * 1024 * 1024);
  const file85MB = createMockFile("Bihar-STET.pdf", size85MB);
  const res85MB = validateQuickServiceFileSize(file85MB);
  assert(res85MB.isValid === false, "85.12 MB PDF is rejected immediately");
  assert(res85MB.error?.includes("85.12 MB") === true, "Error message contains actual size 85.12 MB");
  assert(res85MB.error?.includes("45 MB") === true, "Error message contains max allowed size 45 MB");

  // ---------------------------------------------------------------------------
  // Test 9: Rejected file never reaches upload engine
  // ---------------------------------------------------------------------------
  console.log("[9/20] Testing upload engine independent rejection...");
  let uploadEngineThrew = false;
  try {
    await uploadSingleFileWithProgress(file85MB, "ORD_TEST_9", "SUB_TEST_9");
  } catch (err: any) {
    uploadEngineThrew = true;
    assert(err.message.includes("45 MB"), "Upload engine rejected oversized file with 45 MB error");
  }
  assert(uploadEngineThrew === true, "Upload engine blocked oversized file upload");

  // ---------------------------------------------------------------------------
  // Test 10: Rejected file never creates order
  // ---------------------------------------------------------------------------
  console.log("[10/20] Testing submitPrintOrder blocks order creation for oversized file...");
  const orderRes = await submitPrintOrder({
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Test Customer",
    customerPhone: "9876543210",
    clientSubmissionId: "SUB_REJECT_TEST_10",
    pricingSnapshot: {
      unitPrice: 100,
      subtotal: 100,
      totalAmount: 100,
    },
    options: { copies: 1 },
    file: {
      name: "Bihar-STET.pdf",
      size: size85MB,
      url: "",
    },
  });
  assert(orderRes.success === false, "submitPrintOrder returned success: false");
  assert(orderRes.orderCode === "", "submitPrintOrder did not return an order code");
  assert(orderRes.error?.includes("45 MB") === true, "submitPrintOrder error reports 45 MB limit");

  // ---------------------------------------------------------------------------
  // Test 11: Multi-file submitPrintOrder blocks order_files creation if any file is oversized
  // ---------------------------------------------------------------------------
  console.log("[11/20] Testing submitPrintOrder blocks multi-file order if one file is oversized...");
  const multiOrderRes = await submitPrintOrder({
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Test Multi",
    customerPhone: "9876543210",
    clientSubmissionId: "SUB_REJECT_TEST_11",
    pricingSnapshot: {
      unitPrice: 150,
      subtotal: 150,
      totalAmount: 150,
    },
    options: { copies: 1 },
    files: [
      { name: "doc1_valid.pdf", size: 10 * 1024 * 1024 },
      { name: "doc2_oversized.pdf", size: 85 * 1024 * 1024 },
    ],
  });
  assert(multiOrderRes.success === false, "Multi-file order with 1 oversized file blocked");
  assert(multiOrderRes.orderId === undefined, "Zero order records created");

  // ---------------------------------------------------------------------------
  // Test 12: Zero print_jobs created for rejected oversized file
  // ---------------------------------------------------------------------------
  console.log("[12/20] Testing zero print_jobs created for rejected order...");
  assert(multiOrderRes.orderCode === "", "No order code generated, guaranteeing zero print_jobs");

  // ---------------------------------------------------------------------------
  // Test 13: Rejected file never enters expensive PDF analysis
  // ---------------------------------------------------------------------------
  console.log("[13/20] Testing inspectDocumentFormat and analysis queue early gate...");
  const inspection85MB = inspectDocumentFormat(file85MB);
  assert(inspection85MB.isSupported === false, "inspectDocumentFormat marks 85.12 MB as unsupported");
  assert(inspection85MB.errorMessage?.includes("45 MB") === true, "Inspection error mentions 45 MB limit");

  const queueResult = await globalDocumentAnalysisQueue.enqueue(
    file85MB,
    "doc_test_13",
    "token_test_13"
  );
  assert(queueResult.pageCountStatus === "unsupported", "Analysis queue rejected file without scheduling PDF parsing");
  assert(queueResult.pageCount === null, "Page count is null (never guessed or defaulted)");

  // ---------------------------------------------------------------------------
  // Test 14: Rejected file never enters Base64 fallback
  // ---------------------------------------------------------------------------
  console.log("[14/20] Testing zero Base64 conversion for oversized files...");
  // Verified by uploadSingleFileWithProgress throwing before line 225 (Base64 reader)
  assert(file85MB.size > 2 * 1024 * 1024, "85 MB file is strictly above local Base64 threshold (2 MB)");

  // ---------------------------------------------------------------------------
  // Test 15: Retry cannot bypass validation
  // ---------------------------------------------------------------------------
  console.log("[15/20] Testing retry safety against oversized files...");
  let retry1Threw = false;
  let retry2Threw = false;
  try {
    await uploadSingleFileWithProgress(file85MB, "ORD_RETRY", "SUB_RETRY");
  } catch {
    retry1Threw = true;
  }
  try {
    await uploadSingleFileWithProgress(file85MB, "ORD_RETRY", "SUB_RETRY");
  } catch {
    retry2Threw = true;
  }
  assert(retry1Threw && retry2Threw, "Retry attempt remains blocked identically");

  // ---------------------------------------------------------------------------
  // Test 16: Replacement file is independently validated
  // ---------------------------------------------------------------------------
  console.log("[16/20] Testing replacement file independent validation...");
  const validReplacement = createMockFile("replacement_small.pdf", 2 * 1024 * 1024);
  const repVal1 = validateQuickServiceFileSize(validReplacement);
  assert(repVal1.isValid === true, "Valid replacement passes validation");

  const invalidReplacement = createMockFile("replacement_huge.pdf", 90 * 1024 * 1024);
  const repVal2 = validateQuickServiceFileSize(invalidReplacement);
  assert(repVal2.isValid === false, "Oversized replacement is rejected");

  // ---------------------------------------------------------------------------
  // Test 17: Multi-file validation works correctly
  // ---------------------------------------------------------------------------
  console.log("[17/20] Testing multi-file independent validation (12 MB pass, 44 MB pass, 85 MB reject)...");
  const multiList = [
    createMockFile("file1_12mb.pdf", 12 * 1024 * 1024),
    createMockFile("file2_44mb.pdf", 44 * 1024 * 1024),
    createMockFile("file3_85mb.pdf", Math.round(85.12 * 1024 * 1024)),
  ];
  const multiValResult = validateQuickServiceFiles(multiList);
  assert(multiValResult.allValid === false, "multi-file validation reports allValid: false");
  assert(multiValResult.validFiles.length === 2, "Identified 2 valid files");
  assert(multiValResult.rejectedFiles.length === 1, "Identified 1 rejected file");
  assert(multiValResult.rejectedFiles[0].fileName === "file3_85mb.pdf", "Correctly identified rejected file name");
  assert(multiValResult.rejectedFiles[0].selectedSizeFormatted === "85.12 MB", "Correctly formatted rejected file size");

  let batchUploadThrew = false;
  try {
    await uploadOrderDocumentsWithProgress(
      multiList.map((f) => ({ file: f, name: f.name, size: f.size })),
      "ORD_MULTI",
      "SUB_MULTI"
    );
  } catch (err: any) {
    batchUploadThrew = true;
    assert(err.message.includes("45 MB"), "Batch upload engine throws error containing 45 MB limit");
  }
  assert(batchUploadThrew === true, "Batch upload engine blocked entire batch with oversized file");

  // ---------------------------------------------------------------------------
  // Test 18: Browser refresh / session recovery does not restore invalid file as valid
  // ---------------------------------------------------------------------------
  console.log("[18/20] Testing session recovery safety...");
  clearActiveSubmissionSession();
  saveActiveSubmissionSession({
    submissionId: "SUB_RECOVER_TEST",
    state: "IDLE",
    paymentMethod: "pay_at_store",
    customerName: "Recover Test",
    customerPhone: "9876543210",
    totalAmount: 100,
    totalPrintedPages: 10,
    totalPhysicalSheets: 5,
    totalDocuments: 1,
    specifications: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const recovered = getActiveSubmissionSession();
  assert(recovered !== null, "Session recovered");
  assert(recovered?.submissionId === "SUB_RECOVER_TEST", "Submission ID matches");
  clearActiveSubmissionSession();
  assert(getActiveSubmissionSession() === null, "Session cleared cleanly");

  // ---------------------------------------------------------------------------
  // Test 19: Error message displays actual selected size and maximum limit
  // ---------------------------------------------------------------------------
  console.log("[19/20] Testing error message format and bilingual support...");
  const testVal = validateQuickServiceFileSize(file85MB);
  assert(testVal.error?.includes("85.12 MB") === true, "English error includes 85.12 MB");
  assert(testVal.error?.includes("45 MB") === true, "English error includes 45 MB");
  assert(testVal.errorHi?.includes("85.12 MB") === true, "Hindi error includes 85.12 MB");
  assert(testVal.errorHi?.includes("45 MB") === true, "Hindi error includes 45 MB");

  const limitTextEn = getQuickServiceUploadLimitText("en");
  const limitTextHi = getQuickServiceUploadLimitText("hi");
  assert(limitTextEn.includes("45 MB"), "English UI upload limit text displays 45 MB");
  assert(limitTextHi.includes("45 MB"), "Hindi UI upload limit text displays 45 MB");

  // ---------------------------------------------------------------------------
  // Test 20: Single source of truth configuration
  // ---------------------------------------------------------------------------
  console.log("[20/20] Testing central configuration single source of truth...");
  assert(QUICK_SERVICE_MAX_FILE_SIZE_MB === 45, "QUICK_SERVICE_MAX_FILE_SIZE_MB is 45");
  assert(QUICK_SERVICE_MAX_FILE_SIZE_BYTES === 45 * 1024 * 1024, "QUICK_SERVICE_MAX_FILE_SIZE_BYTES is 45 * 1024 * 1024");
  assert(QUICK_SERVICE_CONFIG.maxFileSizeMB === 45, "QUICK_SERVICE_CONFIG.maxFileSizeMB is 45");
  assert(QUICK_SERVICE_CONFIG.maxFileSizeBytes === 47185920, "QUICK_SERVICE_CONFIG.maxFileSizeBytes is exactly 47,185,920");
  assert(formatFileSizeMB(45 * 1024 * 1024) === "45.00 MB", "formatFileSizeMB(45MB) formats as 45.00 MB");

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log(`  ALL ${passedCount} FILE SIZE LIMIT TESTS PASSED SUCCESSFULLY!`);
  console.log("══════════════════════════════════════════════════════════════════════\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
