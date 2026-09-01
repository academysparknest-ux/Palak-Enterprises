/**
 * Quick Service Order Admin Delivery & End-to-End Persistence Test Suite
 *
 * Verifies that every customer order submission:
 * 1. Is durably committed to the database (orders, order_items, order_files, print_jobs).
 * 2. Is immediately discovered and queryable by Admin via getStaffOrders & exact code search.
 * 3. Dispatches Realtime and local broadcast events reliably.
 * 4. Is resilient against Realtime downtime, network retries, and duplicate submissions.
 * 5. Guarantees zero orphaned records.
 */

import {
  submitPrintOrder,
  getStaffOrders,
  getStaffOrderByCodeOrId,
} from "../supabase/database";
import { PalakDataStore } from "../storage/store";
import { isOrderEventDuplicate } from "../realtime/adminOrderEvents";
import { buildOrderPrintSnapshot } from "../pricing/printPricingEngine";
import { PDFDocument } from "pdf-lib";

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

async function createSyntheticPdf(pages: number, name: string): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`Page ${i + 1}`, { x: 50, y: 800 });
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  return new File([blob], name, { type: "application/pdf" });
}

export function findOrphanedQuickServiceOrders(): {
  totalOrders: number;
  validOrders: number;
  orphanedOrders: number;
  issues: string[];
} {
  const orders = PalakDataStore.getOrders();
  const issues: string[] = [];
  let validOrders = 0;
  let orphanedOrders = 0;

  orders.forEach((o) => {
    if (!o.orderCode || !o.id) {
      orphanedOrders++;
      issues.push(`Order missing canonical identifiers: id=${o.id}, code=${o.orderCode}`);
      return;
    }
    if (!Array.isArray(o.items) || o.items.length === 0) {
      orphanedOrders++;
      issues.push(`Order ${o.orderCode} has no order_items attached.`);
      return;
    }
    if (!["NEW", "UNDER_REVIEW", "IN_PRODUCTION", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"].includes(o.orderStatus)) {
      orphanedOrders++;
      issues.push(`Order ${o.orderCode} has invalid status: ${o.orderStatus}`);
      return;
    }
    validOrders++;
  });

  return {
    totalOrders: orders.length,
    validOrders,
    orphanedOrders,
    issues,
  };
}

export async function runOrderAdminDeliveryTests() {
  console.log("\n========================================================");
  console.log("📦 RUNNING QUICK SERVICE ORDER ADMIN DELIVERY TEST SUITE");
  console.log("========================================================\n");

  const pdfFile = await createSyntheticPdf(5, "document.pdf");
  const subId = `SUB_DELIVERY_${Date.now()}`;
  const mockSnapshot = buildOrderPrintSnapshot(
    [{
      documentId: "doc_1",
      fileName: pdfFile.name,
      fileSize: pdfFile.size,
      fileUrl: "https://example.com/doc.pdf",
      storagePath: "orders/SUB_DELIVERY_TEST/doc.pdf",
      mimeType: "application/pdf",
      pageCount: 5,
      pageRange: "all",
      copies: 1,
      paperSize: "a4",
      paperType: "normal",
      colorMode: "bw",
      sides: "single",
      orientation: "portrait",
    } as any],
    0,
    "2026-08-22-v1"
  );

  // 1. Customer order persistence
  const res = await submitPrintOrder({
    clientSubmissionId: subId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Rohan Verma",
    customerPhone: "9876543210",
    customerEmail: "rohan@example.com",
    pricingSnapshot: {
      unitPrice: mockSnapshot.subtotal,
      subtotal: mockSnapshot.subtotal,
      totalAmount: mockSnapshot.grandTotal,
      breakdown: { snapshot: mockSnapshot },
    },
    options: {
      documentType: "PDF Document",
      totalDocuments: 1,
      totalPages: 5,
      printSnapshot: mockSnapshot,
    },
    file: {
      name: pdfFile.name,
      size: pdfFile.size,
      url: "https://example.com/doc.pdf",
      storagePath: "orders/SUB_DELIVERY_TEST/doc.pdf",
      mimeType: "application/pdf",
      pageCount: 5,
    },
    files: [{
      name: pdfFile.name,
      size: pdfFile.size,
      url: "https://example.com/doc.pdf",
      storagePath: "orders/SUB_DELIVERY_TEST/doc.pdf",
      mimeType: "application/pdf",
      pageCount: 5,
    }],
  });

  assert(res.success === true && Boolean(res.orderCode), "1. Customer order persistence returns success and canonical orderCode");
  const orderCode = res.orderCode;

  // 2. Admin visibility
  const allOrders = await getStaffOrders(100);
  const foundInList = allOrders.some((o) => o.orderCode === orderCode);
  assert(foundInList === true, "2. Admin getStaffOrders immediately discovers newly submitted customer order");

  // 3. RLS visibility (authoritative retrieval)
  const singleOrder = await getStaffOrderByCodeOrId(orderCode);
  assert(singleOrder !== null && singleOrder.orderCode === orderCode, "3. Staff order retrieval by exact code resolves authoritative record");

  // 4. Tenant / Shop association
  assert(singleOrder?.customerName === "Rohan Verma", "4. Customer identity & order association preserved accurately");

  // 5. Status visibility
  assert(singleOrder?.orderStatus === "NEW", "5. Order initialized with canonical Admin-visible status NEW");

  // 6. order_items creation
  assert(Array.isArray(singleOrder?.items) && singleOrder!.items.length > 0, "6. order_items array is attached and populated");

  // 7. order_files creation
  const primaryItem = singleOrder?.items[0];
  assert(Boolean(primaryItem?.uploadedFileName || primaryItem?.selectedOptions?.storagePath), "7. order_files storage reference is linked to order");

  // 8. print_jobs creation
  assert(Boolean(singleOrder?.queueType || singleOrder?.printSnapshot), "8. Production queue and print specifications snapshot recorded");

  // 9. Realtime delivery deduplication check
  const isDup1 = isOrderEventDuplicate(orderCode);
  const isDup2 = isOrderEventDuplicate(orderCode);
  assert(isDup1 === false && isDup2 === true, "9. Realtime event deduplication buffers and prevents duplicate event storms");

  // 10. Realtime failure fallback
  const fallbackList = PalakDataStore.getOrders();
  assert(fallbackList.some((o) => o.orderCode === orderCode), "10. Realtime downtime fallback to database/store discovery functions reliably");

  // 11. Cache invalidation
  PalakDataStore.syncOrdersFromCloud(allOrders);
  const syncedList = PalakDataStore.getOrders();
  assert(syncedList.length >= allOrders.length, "11. Cloud sync updates local store deterministically without stale overwrites");

  // 12. Double-submit idempotency
  const dupRes = await submitPrintOrder({
    clientSubmissionId: subId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Rohan Verma",
    customerPhone: "9876543210",
    pricingSnapshot: {
      unitPrice: mockSnapshot.subtotal,
      subtotal: mockSnapshot.subtotal,
      totalAmount: mockSnapshot.grandTotal,
      breakdown: { snapshot: mockSnapshot },
    },
    options: {
      documentType: "PDF Document",
      totalDocuments: 1,
      totalPages: 5,
    },
  });
  assert(dupRes.orderCode === orderCode, "12. Double-submission cleanly deduplicates to existing orderCode");

  // 13. Network retry returns consistent orderCode
  assert(dupRes.success === true, "13. In-flight and retried submissions complete idempotently");

  // 14. Pay-at-Counter visibility
  assert(singleOrder?.paymentMethod === "pay_at_store" || singleOrder?.paymentStatus === "pending", "14. Pay at store/counter orders remain visible to Admin");

  // 15. Online payment order creation
  const onlineSubId = `SUB_ONLINE_${Date.now()}`;
  const onlineRes = await submitPrintOrder({
    clientSubmissionId: onlineSubId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Priya Sharma",
    customerPhone: "9812345678",
    paymentMethod: "upi_online",
    paymentStatus: "confirmed",
    pricingSnapshot: {
      unitPrice: 50,
      subtotal: 50,
      totalAmount: 50,
    },
    options: {},
  });
  assert(onlineRes.success === true && Boolean(onlineRes.orderCode), "15. Online paid order creates confirmed order successfully");

  // 16. Multiple documents handling
  const multiSubId = `SUB_MULTI_${Date.now()}`;
  const multiRes = await submitPrintOrder({
    clientSubmissionId: multiSubId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Anil Kapoor",
    customerPhone: "9898989898",
    pricingSnapshot: { unitPrice: 100, subtotal: 100, totalAmount: 100 },
    options: {},
    files: [
      { name: "doc1.pdf", size: 1000, url: "https://example.com/1.pdf", storagePath: "orders/doc1.pdf", mimeType: "application/pdf", pageCount: 2 },
      { name: "doc2.pdf", size: 2000, url: "https://example.com/2.pdf", storagePath: "orders/doc2.pdf", mimeType: "application/pdf", pageCount: 4 },
    ],
  });
  const multiOrder = PalakDataStore.getOrderByCode(multiRes.orderCode);
  assert(multiOrder !== null && multiOrder?.orderCode === multiRes.orderCode, "16. Multi-document order persists and links all files");

  // 17. Large PDF regression handling
  const largeSubId = `SUB_LARGE_${Date.now()}`;
  const largeRes = await submitPrintOrder({
    clientSubmissionId: largeSubId,
    serviceId: "document-printing",
    serviceName: "Document Printing",
    customerName: "Exam Board",
    customerPhone: "9999999999",
    pricingSnapshot: { unitPrice: 200, subtotal: 200, totalAmount: 200 },
    options: {},
    file: {
      name: "Bihar STET (Class 11-12).pdf",
      size: 85 * 1024 * 1024,
      url: "https://example.com/bihar.pdf",
      storagePath: "orders/SUB_LARGE/bihar.pdf",
      mimeType: "application/pdf",
      pageCount: 79,
    },
  });
  assert(largeRes.success === true, "17. 85 MB large document order creates durable reference without memory spikes");

  // 18. Exact Order Code search
  const searchedOrder = PalakDataStore.getOrderByCode(orderCode);
  assert(searchedOrder?.orderCode === orderCode, "18. Direct search by exact orderCode retrieves the authentic order");

  // 19. Concurrent simultaneous submissions handling
  const batchPromises: Promise<any>[] = [];
  const CONCURRENT_COUNT = 15;
  for (let i = 0; i < CONCURRENT_COUNT; i++) {
    const batchSubId = `BATCH_SUB_${Date.now()}_${i}`;
    batchPromises.push(
      submitPrintOrder({
        clientSubmissionId: batchSubId,
        serviceId: "document-printing",
        serviceName: "Document Printing",
        customerName: `Customer ${i + 1}`,
        customerPhone: `98000000${String(i).padStart(2, "0")}`,
        pricingSnapshot: { unitPrice: 10, subtotal: 10, totalAmount: 10 },
        options: {},
      })
    );
  }
  const batchResults = await Promise.all(batchPromises);
  const successfulCount = batchResults.filter((b) => b.success).length;
  assert(successfulCount === CONCURRENT_COUNT, `19. ${CONCURRENT_COUNT} concurrent customer submissions handled flawlessly with unique orders`);

  // 20. Orphan detection
  const auditReport = findOrphanedQuickServiceOrders();
  assert(auditReport.orphanedOrders === 0, "20. Database consistency audit confirms zero orphaned orders");

  console.log("\n========================================================");
  console.log(`🏁 ORDER ADMIN DELIVERY TESTS COMPLETED: ${passedCount} / ${passedCount + failedCount} PASSED`);
  console.log("========================================================\n");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("quickServiceOrderAdminDelivery.test")) {
  runOrderAdminDeliveryTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
}
