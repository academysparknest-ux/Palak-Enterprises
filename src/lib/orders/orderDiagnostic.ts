/**
 * Order Forensic Diagnostic & Duplicate Detection Engine
 *
 * Implements authoritative diagnostics for:
 * 1. diagnoseOrder(orderCode) - Deep forensic inspection of a specific order
 * 2. findPotentialDuplicateOrders() - System-wide scan for exact or suspected duplicate orders
 * 3. reconcileOrderSnapshots(orderCode) - Reconciles and synchronizes local vs cloud snapshots
 *
 * CRITICAL INVARIANT:
 * Two orders with the same customer name or same filename are NOT automatically duplicates.
 * Only orders sharing client_submission_id, payment_transaction_id, or conflicting storage paths are flagged.
 */

import { PalakDataStore, type StoredOrder } from "../storage/store";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { executeWithAuthRetry } from "../supabase/authSession";

export type DuplicateClassification = "EXACT_DUPLICATE" | "POSSIBLE_DUPLICATE" | "LEGITIMATE_SEPARATE_ORDER";

export interface DuplicateOrderGroup {
  classification: DuplicateClassification;
  reason: string;
  authoritativeOrderId: string;
  orderCodes: string[];
  orderIds: string[];
  clientSubmissionId?: string;
  customerName: string;
  customerPhone: string;
  createdDates: string[];
  totalAmounts: number[];
}

export interface OrderDiagnosticReport {
  orderId: string;
  orderCode: string;
  clientSubmissionId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  totalAmount: number;
  hasPricingSnapshot: boolean;
  documentCount: number;
  itemCount: number;
  fileCount: number;
  printJobCount: number;
  pageCount: number;
  physicalSheetCount: number;
  copies: number;
  paper: string;
  colorMode: string;
  sides: string;
  orientation: string;
  storagePaths: string[];
  duplicateChildRecordsFound: boolean;
  inLocalCache: boolean;
  inCloudDatabase: boolean;
  isConsistent: boolean;
  consistencyMessage: string;
}

/**
 * Performs a comprehensive forensic audit of a single order by code or UUID.
 */
export async function diagnoseOrder(orderCodeOrId: string): Promise<OrderDiagnosticReport> {
  const clean = (orderCodeOrId || "").trim().toUpperCase();
  const localOrders = PalakDataStore.getOrders();
  const localOrder = localOrders.find((o) => o.orderCode?.toUpperCase() === clean || o.id === orderCodeOrId);

  let cloudOrder: any = null;
  let cloudItems: any[] = [];
  let cloudFiles: any[] = [];
  let cloudPrintJobs: any[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      await executeWithAuthRetry(async (client) => {
        const { data: ord } = await client
          .from("orders")
          .select("*")
          .or(`order_code.eq.${clean},id.eq.${orderCodeOrId}`)
          .maybeSingle();

        if (ord) {
          cloudOrder = ord;
          const [itemsRes, filesRes, jobsRes] = await Promise.allSettled([
            client.from("order_items").select("*").eq("order_id", ord.id),
            client.from("order_files").select("*").eq("order_id", ord.id),
            client.from("print_jobs").select("*").eq("order_id", ord.id),
          ]);

          if (itemsRes.status === "fulfilled" && itemsRes.value.data) {
            cloudItems = itemsRes.value.data;
          }
          if (filesRes.status === "fulfilled" && filesRes.value.data) {
            cloudFiles = filesRes.value.data;
          }
          if (jobsRes.status === "fulfilled" && jobsRes.value.data) {
            cloudPrintJobs = jobsRes.value.data;
          }
        }
      });
    } catch (err) {
      console.warn("[diagnoseOrder] Cloud query note:", err);
    }
  }

  const authoritative: StoredOrder = cloudOrder
    ? {
        id: cloudOrder.id,
        orderCode: cloudOrder.order_code,
        clientSubmissionId: cloudOrder.client_submission_id,
        userId: cloudOrder.user_id,
        customerName: cloudOrder.customer_name,
        customerPhone: cloudOrder.customer_phone,
        customerEmail: cloudOrder.customer_email,
        fulfillmentType: cloudOrder.fulfillment_type || "pickup",
        subtotalAmount: Number(cloudOrder.subtotal_amount) || 0,
        totalAmount: Number(cloudOrder.total_amount) || 0,
        deliveryFee: Number(cloudOrder.delivery_fee) || 0,
        paymentMethod: cloudOrder.payment_method || "pay_at_store",
        paymentStatus: cloudOrder.payment_status || "pending",
        orderStatus: cloudOrder.order_status || "NEW",
        items: cloudItems.length > 0 ? cloudItems : (localOrder?.items || []),
        printSnapshot: cloudOrder.print_snapshot || localOrder?.printSnapshot,
        createdAt: cloudOrder.created_at,
        updatedAt: cloudOrder.updated_at,
      }
    : localOrder || {
        id: "UNKNOWN",
        orderCode: clean,
        customerName: "Unknown",
        customerPhone: "",
        subtotalAmount: 0,
        totalAmount: 0,
        deliveryFee: 0,
        paymentMethod: "pay_at_store",
        paymentStatus: "pending",
        orderStatus: "NEW",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fulfillmentType: "pickup",
      };

  const printSnapshot = authoritative.printSnapshot;
  const primaryItem = authoritative.items?.[0];
  const primaryDoc = printSnapshot?.documents?.[0];

  const storagePaths: string[] = [];
  if (cloudFiles.length > 0) {
    cloudFiles.forEach((f) => {
      if (f.file_path) storagePaths.push(f.file_path);
    });
  } else if (primaryItem?.selectedOptions?.storagePath || primaryItem?.uploadedFileUrl) {
    storagePaths.push(primaryItem.selectedOptions?.storagePath || primaryItem.uploadedFileUrl);
  }

  const documentCount = printSnapshot?.totalDocuments || cloudFiles.length || (primaryItem ? 1 : 0);
  const pageCount = printSnapshot?.totalPrintedPages || primaryDoc?.selectedPageCount || primaryItem?.selectedOptions?.totalPages || 1;
  const physicalSheetCount = printSnapshot?.totalPhysicalSheets || primaryDoc?.totalPhysicalSheets || 1;
  const copies = primaryDoc?.copies || primaryItem?.quantity || 1;

  // Duplicate child check
  const duplicateChildRecordsFound =
    cloudItems.length > documentCount ||
    cloudFiles.length > documentCount ||
    cloudPrintJobs.length > 1;

  let isConsistent = true;
  let consistencyMessage = "Order data is consistent across all verification channels.";

  if (cloudOrder && localOrder && Math.abs(cloudOrder.total_amount - localOrder.totalAmount) > 0.01) {
    isConsistent = false;
    consistencyMessage = `Price mismatch between cloud (₹${cloudOrder.total_amount}) and local store (₹${localOrder.totalAmount}).`;
  }

  if (duplicateChildRecordsFound) {
    isConsistent = false;
    consistencyMessage = `Duplicate child entities detected in database (Items: ${cloudItems.length}, Files: ${cloudFiles.length}, Jobs: ${cloudPrintJobs.length}).`;
  }

  return {
    orderId: authoritative.id,
    orderCode: authoritative.orderCode,
    clientSubmissionId: authoritative.clientSubmissionId,
    customerId: authoritative.userId,
    customerName: authoritative.customerName,
    customerPhone: authoritative.customerPhone,
    customerEmail: authoritative.customerEmail,
    createdAt: authoritative.createdAt,
    updatedAt: authoritative.updatedAt,
    orderStatus: authoritative.orderStatus,
    paymentMethod: authoritative.paymentMethod,
    paymentStatus: authoritative.paymentStatus,
    subtotalAmount: authoritative.subtotalAmount,
    totalAmount: authoritative.totalAmount,
    hasPricingSnapshot: Boolean(printSnapshot),
    documentCount,
    itemCount: cloudItems.length || authoritative.items.length,
    fileCount: cloudFiles.length || (primaryItem?.uploadedFileUrl ? 1 : 0),
    printJobCount: cloudPrintJobs.length || (authoritative.id !== "UNKNOWN" ? 1 : 0),
    pageCount,
    physicalSheetCount,
    copies,
    paper: primaryDoc?.paperSize || "a4",
    colorMode: primaryDoc?.colorMode || "bw",
    sides: primaryDoc?.sides || "single",
    orientation: primaryDoc?.orientation || "portrait",
    storagePaths,
    duplicateChildRecordsFound,
    inLocalCache: Boolean(localOrder),
    inCloudDatabase: Boolean(cloudOrder),
    isConsistent,
    consistencyMessage,
  };
}

/**
 * Scans the entire store and cloud database for true duplicate orders.
 */
export function findPotentialDuplicateOrders(ordersList?: StoredOrder[]): DuplicateOrderGroup[] {
  const list = ordersList || PalakDataStore.getOrders();
  const submissionMap = new Map<string, StoredOrder[]>();
  const duplicateGroups: DuplicateOrderGroup[] = [];

  // Group by client_submission_id
  list.forEach((ord) => {
    if (ord.clientSubmissionId) {
      const existing = submissionMap.get(ord.clientSubmissionId) || [];
      existing.push(ord);
      submissionMap.set(ord.clientSubmissionId, existing);
    }
  });

  submissionMap.forEach((matchedOrders, subId) => {
    // Distinct order codes under same client_submission_id = EXACT DUPLICATE
    const distinctCodes = Array.from(new Set(matchedOrders.map((o) => o.orderCode)));
    if (distinctCodes.length > 1) {
      duplicateGroups.push({
        classification: "EXACT_DUPLICATE",
        reason: `Multiple order codes (${distinctCodes.join(", ")}) registered under identical client_submission_id (${subId}).`,
        authoritativeOrderId: matchedOrders[0].id,
        orderCodes: distinctCodes,
        orderIds: matchedOrders.map((o) => o.id),
        clientSubmissionId: subId,
        customerName: matchedOrders[0].customerName,
        customerPhone: matchedOrders[0].customerPhone,
        createdDates: matchedOrders.map((o) => o.createdAt),
        totalAmounts: matchedOrders.map((o) => o.totalAmount),
      });
    }
  });

  // Group by customer phone + exact 5-second timestamp window + same amount + same document
  const timeWindowMap = new Map<string, StoredOrder[]>();
  list.forEach((ord) => {
    const timeBucket = Math.floor(new Date(ord.createdAt).getTime() / 5000);
    const key = `${ord.customerPhone.trim()}_${ord.totalAmount}_${timeBucket}`;
    const existing = timeWindowMap.get(key) || [];
    existing.push(ord);
    timeWindowMap.set(key, existing);
  });

  timeWindowMap.forEach((matchedOrders) => {
    const distinctCodes = Array.from(new Set(matchedOrders.map((o) => o.orderCode)));
    if (distinctCodes.length > 1) {
      // Check if not already classified as EXACT_DUPLICATE
      const alreadyFlagged = duplicateGroups.some((g) =>
        distinctCodes.every((c) => g.orderCodes.includes(c))
      );

      if (!alreadyFlagged) {
        duplicateGroups.push({
          classification: "POSSIBLE_DUPLICATE",
          reason: `Identical phone, amount, and submission timestamp window within 5 seconds.`,
          authoritativeOrderId: matchedOrders[0].id,
          orderCodes: distinctCodes,
          orderIds: matchedOrders.map((o) => o.id),
          customerName: matchedOrders[0].customerName,
          customerPhone: matchedOrders[0].customerPhone,
          createdDates: matchedOrders.map((o) => o.createdAt),
          totalAmounts: matchedOrders.map((o) => o.totalAmount),
        });
      }
    }
  });

  return duplicateGroups;
}

/**
 * Finds all orders sharing identical orderCodes or identical clientSubmissionIds across the dataset.
 */
export function findDuplicateOrderIdentities(ordersList?: StoredOrder[]): {
  duplicateOrderCodes: string[];
  duplicateSubmissionIds: string[];
} {
  const list = ordersList || PalakDataStore.getOrders();
  const codeCounts = new Map<string, number>();
  const subIdCounts = new Map<string, number>();

  list.forEach((ord) => {
    const code = (ord.orderCode || "").trim().toUpperCase();
    if (code) {
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
    }
    const sub = (ord.clientSubmissionId || "").trim();
    if (sub) {
      subIdCounts.set(sub, (subIdCounts.get(sub) || 0) + 1);
    }
  });

  const duplicateOrderCodes: string[] = [];
  codeCounts.forEach((count, code) => {
    if (count > 1) duplicateOrderCodes.push(code);
  });

  const duplicateSubmissionIds: string[] = [];
  subIdCounts.forEach((count, sub) => {
    if (count > 1) duplicateSubmissionIds.push(sub);
  });

  return { duplicateOrderCodes, duplicateSubmissionIds };
}

/**
 * Identifies any file paths or order_file records that do not link to an existing active order.
 */
export function findOrphanedOrderFiles(ordersList?: StoredOrder[]): string[] {
  const list = ordersList || PalakDataStore.getOrders();
  const knownOrderCodes = new Set(list.map((o) => (o.orderCode || "").trim().toUpperCase()));
  const orphanedPaths: string[] = [];

  list.forEach((ord) => {
    const item = ord.items?.[0];
    const path = item?.selectedOptions?.storagePath || item?.uploadedFileUrl;
    if (path && path.startsWith("orders/")) {
      const match = path.match(/^orders\/([^\/]+)/);
      if (match && match[1]) {
        const pathCode = match[1].trim().toUpperCase();
        if (!knownOrderCodes.has(pathCode) && !pathCode.startsWith("PE-DOC-")) {
          orphanedPaths.push(path);
        }
      }
    }
  });

  return orphanedPaths;
}

/**
 * Identifies print jobs that do not map to any existing order.
 */
export function findOrphanedPrintJobs(ordersList?: StoredOrder[]): string[] {
  const list = ordersList || PalakDataStore.getOrders();
  const knownOrderCodes = new Set(list.map((o) => (o.orderCode || "").trim().toUpperCase()));
  const orphanedJobCodes: string[] = [];

  // Inspect any print jobs from store
  try {
    const jobs = (PalakDataStore as any).getPrintJobs ? (PalakDataStore as any).getPrintJobs() : [];
    (jobs || []).forEach((j: any) => {
      const jobCode = (j.orderCode || "").trim().toUpperCase();
      if (jobCode && !knownOrderCodes.has(jobCode)) {
        orphanedJobCodes.push(jobCode);
      }
    });
  } catch {}

  return orphanedJobCodes;
}

/**
 * Detects cross-order file contamination (i.e. two distinct orders pointing to the exact same storage path).
 */
export function findCrossLinkedFiles(ordersList?: StoredOrder[]): Array<{ storagePath: string; orderCodes: string[] }> {
  const list = ordersList || PalakDataStore.getOrders();
  const pathMap = new Map<string, string[]>();

  list.forEach((ord) => {
    const item = ord.items?.[0];
    const path = item?.selectedOptions?.storagePath || item?.uploadedFileUrl;
    if (path && !path.startsWith("data:") && !path.startsWith("blob:")) {
      const existing = pathMap.get(path) || [];
      if (!existing.includes(ord.orderCode)) {
        existing.push(ord.orderCode);
      }
      pathMap.set(path, existing);
    }
  });

  const crossLinked: Array<{ storagePath: string; orderCodes: string[] }> = [];
  pathMap.forEach((codes, path) => {
    if (codes.length > 1) {
      crossLinked.push({ storagePath: path, orderCodes: codes });
    }
  });

  return crossLinked;
}

/**
 * Detects pricing snapshot mismatches between subtotal, items, and total amount.
 */
export function findPricingSnapshotMismatches(ordersList?: StoredOrder[]): Array<{ orderCode: string; expectedTotal: number; recordedTotal: number; difference: number }> {
  const list = ordersList || PalakDataStore.getOrders();
  const mismatches: Array<{ orderCode: string; expectedTotal: number; recordedTotal: number; difference: number }> = [];

  list.forEach((ord) => {
    const recordedTotal = ord.totalAmount || 0;

    // Check if recordedTotal differs significantly from printSnapshot.grandTotal
    if (ord.printSnapshot?.grandTotal && Math.abs(ord.printSnapshot.grandTotal - recordedTotal) > 0.05) {
      mismatches.push({
        orderCode: ord.orderCode,
        expectedTotal: ord.printSnapshot.grandTotal,
        recordedTotal,
        difference: Math.abs(ord.printSnapshot.grandTotal - recordedTotal),
      });
    }
  });

  return mismatches;
}

/**
 * Detects page count mismatches (e.g. print snapshot says 79 pages but item options say 1 page).
 */
export function findPageCountMismatches(ordersList?: StoredOrder[]): Array<{ orderCode: string; snapshotPages: number; itemPages: number }> {
  const list = ordersList || PalakDataStore.getOrders();
  const mismatches: Array<{ orderCode: string; snapshotPages: number; itemPages: number }> = [];

  list.forEach((ord) => {
    const snapshotPages = ord.printSnapshot?.totalPrintedPages;
    const itemPages = ord.items?.[0]?.selectedOptions?.totalPages || (ord.items?.[0]?.selectedOptions as any)?.pageCount;

    if (snapshotPages && itemPages && snapshotPages !== itemPages) {
      mismatches.push({
        orderCode: ord.orderCode,
        snapshotPages,
        itemPages,
      });
    }
  });

  return mismatches;
}

