/**
 * Palak Printing Press — Centralized Quick Service Queue Engine
 * 
 * Rules:
 * 1. Priority Queue (queuePriority = 1): Pay Online orders with verified successful payment (paymentStatus: 'confirmed' | 'paid').
 * 2. Normal Queue (queuePriority = 2): Send Document / Pay at Shop orders (paymentStatus: 'pending').
 * 3. Sorting: Priority orders processed FIRST in their own FIFO order (by priorityAt),
 *    followed by Normal orders in their own FIFO order (by submittedAt).
 * 4. Deterministic, starvation-preventing, and unified across Frontend, Store, Supabase, Admin & Tracking.
 */

import type { StoredOrder } from "./storage/store";

export type QueueType = "priority" | "normal";
export type QueuePriority = 1 | 2; // 1 = Priority (Pay Online), 2 = Normal (Send Document)

export interface QueueMetadata {
  queueType: QueueType;
  queuePriority: QueuePriority;
  submittedAt: string;
  priorityAt?: string;
  queuePosition?: number;
}

export interface QueueItemPositionInfo {
  queueType: QueueType;
  queuePriority: QueuePriority;
  positionInQueue: number; // Position within its own queue (1-based, e.g. #1 in Priority, #3 in Normal)
  totalInQueue: number;    // Total active orders in that specific queue
  overallQueueIndex: number; // Overall processing index across all active orders (1-based)
  totalActiveOrders: number;
}

/**
 * Extracts Razorpay payment ID from notes string if present
 */
export function extractRazorpayId(notes?: string): string | null {
  if (!notes) return null;
  const match = notes.match(/\[Razorpay ID:\s*([a-zA-Z0-9_]+)\]/i) || notes.match(/(pay_[a-zA-Z0-9_]+)/i);
  return match ? match[1] : null;
}

/**
 * Validates whether an order has genuinely verified online payment
 */
export function isOrderPaidOnline(order: {
  paymentMethod?: string;
  paymentStatus?: string;
  orderNotes?: string;
}): boolean {
  if (!order) return false;
  const method = String(order.paymentMethod || "").toLowerCase().trim();
  const status = String(order.paymentStatus || "").toLowerCase().trim();
  const hasRzpId = Boolean(extractRazorpayId(order.orderNotes));

  // A verified Razorpay payment ID in order notes is definitive proof of an online payment
  if (hasRzpId) return true;

  const isOnlineMethod =
    method === "upi_online" ||
    method === "pay_online" ||
    method === "online" ||
    method === "razorpay" ||
    method.includes("upi") ||
    method.includes("online");

  const isPaidStatus =
    status === "confirmed" ||
    status === "paid" ||
    status === "success" ||
    status === "completed" ||
    status === "captured";

  return isOnlineMethod && isPaidStatus;
}

/**
 * Resolves queue classification (priority vs normal) for any order record.
 * Paid-online orders always jump to Priority Queue (queuePriority: 1).
 */
export function getQueueClassification(order: Partial<StoredOrder> & Record<string, any>): QueueMetadata {
  const submittedAt = order.submittedAt || order.createdAt || new Date().toISOString();

  // Rule 1: Authoritative Priority Invariant — Any verified online paid order MUST be in Priority Queue
  const isPaid = isOrderPaidOnline(order);
  if (isPaid) {
    return {
      queueType: "priority",
      queuePriority: 1,
      submittedAt,
      priorityAt: order.priorityAt || order.createdAt || submittedAt,
    };
  }

  // Rule 2: Explicit priority assignment
  if (order.queueType === "priority" || order.queuePriority === 1) {
    return {
      queueType: "priority",
      queuePriority: 1,
      submittedAt,
      priorityAt: order.priorityAt || order.createdAt || submittedAt,
    };
  }

  // Rule 3: Unpaid / Counter orders remain in Normal Queue
  return {
    queueType: "normal",
    queuePriority: 2,
    submittedAt,
  };
}

/**
 * Checks if an order is currently active in the printing queue
 * (i.e. not completed, cancelled, rejected, or already ready for pickup)
 */
export function isOrderInActivePrintingQueue(status?: string): boolean {
  if (!status) return true;
  const s = status.toUpperCase().trim();
  return (
    s === "NEW" ||
    s === "PENDING" ||
    s === "UNDER_REVIEW" ||
    s === "CONFIRMED" ||
    s === "DESIGN_REVIEW" ||
    s === "IN_PRODUCTION" ||
    s === "PROCESSING" ||
    s === "PAYMENT_PENDING"
  );
}

/**
 * Deterministic queue sorting function
 * 
 * Order of processing:
 * 1. PRIORITY (queuePriority = 1) sorted by priorityAt ASC (FIFO within priority)
 * 2. NORMAL (queuePriority = 2) sorted by submittedAt ASC (FIFO within normal)
 * 3. Tie-breaker by orderCode/id for absolute stability
 */
export function sortPrintingQueue<T extends Partial<StoredOrder> & Record<string, any>>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const statusA = (a.orderStatus || "NEW").toUpperCase();
    const statusB = (b.orderStatus || "NEW").toUpperCase();

    const isClosedA = statusA === "COMPLETED" || statusA === "CANCELLED" || statusA === "REJECTED";
    const isClosedB = statusB === "COMPLETED" || statusB === "CANCELLED" || statusB === "REJECTED";

    // Rule 1: Active orders ALWAYS come before Closed (Completed / Cancelled) orders
    if (isClosedA !== isClosedB) {
      return isClosedA ? 1 : -1;
    }

    // Rule 2: If both are closed, sort by latest timestamp DESC (most recent completed on top)
    if (isClosedA && isClosedB) {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (b.orderCode || "").localeCompare(a.orderCode || "");
    }

    // Rule 3: Active Orders: Unfinished printing jobs come before Ready for Pickup
    const isReadyA = statusA === "READY_FOR_PICKUP" || statusA === "OUT_FOR_DELIVERY";
    const isReadyB = statusB === "READY_FOR_PICKUP" || statusB === "OUT_FOR_DELIVERY";
    if (isReadyA !== isReadyB) {
      return isReadyA ? 1 : -1;
    }

    const classA = getQueueClassification(a);
    const classB = getQueueClassification(b);

    // Rule 4: Queue Priority (1 = Priority before 2 = Normal)
    if (classA.queuePriority !== classB.queuePriority) {
      return classA.queuePriority - classB.queuePriority;
    }

    // Rule 5: Deterministic FIFO timestamp comparison
    // Priority orders use priorityAt (fallback submittedAt); Normal orders use submittedAt
    const timeA = new Date(
      classA.queuePriority === 1 ? (classA.priorityAt || classA.submittedAt) : classA.submittedAt
    ).getTime() || 0;
    
    const timeB = new Date(
      classB.queuePriority === 1 ? (classB.priorityAt || classB.submittedAt) : classB.submittedAt
    ).getTime() || 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // Rule 6: Tie-breaker by orderCode or ID
    const codeA = a.orderCode || a.id || "";
    const codeB = b.orderCode || b.id || "";
    return codeA.localeCompare(codeB);
  });
}

/**
 * Computes queue positions and stats for all active orders in the printing queue
 */
export function calculateQueueStats<T extends Partial<StoredOrder> & Record<string, any>>(
  allOrders: T[]
): {
  sortedActiveOrders: T[];
  priorityActiveCount: number;
  normalActiveCount: number;
  positionsMap: Map<string, QueueItemPositionInfo>;
} {
  const activeOrders = allOrders.filter((o) => isOrderInActivePrintingQueue(o.orderStatus));
  const sortedActiveOrders = sortPrintingQueue(activeOrders);

  const positionsMap = new Map<string, QueueItemPositionInfo>();

  let priorityCount = 0;
  let normalCount = 0;

  // First pass to count totals
  sortedActiveOrders.forEach((o) => {
    const meta = getQueueClassification(o);
    if (meta.queuePriority === 1) {
      priorityCount++;
    } else {
      normalCount++;
    }
  });

  // Second pass to assign distinct 1-based positions
  let currentPriorityPos = 0;
  let currentNormalPos = 0;

  sortedActiveOrders.forEach((o, index) => {
    const key = o.orderCode || o.id || `order_${index}`;
    const meta = getQueueClassification(o);

    if (meta.queuePriority === 1) {
      currentPriorityPos++;
      positionsMap.set(key, {
        queueType: "priority",
        queuePriority: 1,
        positionInQueue: currentPriorityPos,
        totalInQueue: priorityCount,
        overallQueueIndex: index + 1,
        totalActiveOrders: sortedActiveOrders.length,
      });
    } else {
      currentNormalPos++;
      positionsMap.set(key, {
        queueType: "normal",
        queuePriority: 2,
        positionInQueue: currentNormalPos,
        totalInQueue: normalCount,
        overallQueueIndex: index + 1,
        totalActiveOrders: sortedActiveOrders.length,
      });
    }
  });

  return {
    sortedActiveOrders,
    priorityActiveCount: priorityCount,
    normalActiveCount: normalCount,
    positionsMap,
  };
}

/**
 * Gets the queue position info for a single order given the current list of orders
 */
export function getSingleOrderQueueInfo<T extends Partial<StoredOrder> & Record<string, any>>(
  targetOrder: T,
  allOrders: T[]
): QueueItemPositionInfo {
  const stats = calculateQueueStats(allOrders);
  const key = targetOrder.orderCode || targetOrder.id || "";
  
  if (key && stats.positionsMap.has(key)) {
    return stats.positionsMap.get(key)!;
  }

  // Fallback if order not found in active list (e.g. Completed or single record)
  const meta = getQueueClassification(targetOrder);
  return {
    queueType: meta.queueType,
    queuePriority: meta.queuePriority,
    positionInQueue: 1,
    totalInQueue: meta.queuePriority === 1 ? stats.priorityActiveCount || 1 : stats.normalActiveCount || 1,
    overallQueueIndex: 1,
    totalActiveOrders: stats.sortedActiveOrders.length || 1,
  };
}
