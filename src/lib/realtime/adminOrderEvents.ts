/**
 * Centralized Realtime & Local Order Event Bus for Palak Enterprises Admin.
 * Coordinates cross-component and cross-tab order events with idempotency and deduplication.
 */

export interface OrderEventPayload {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus?: string;
  paymentMethod?: string;
  serviceName: string;
  items?: any[];
  createdAt: string;
  source?: 'supabase_realtime' | 'local_store' | 'broadcast';
}

const SEEN_EVENTS_MAX = 200;
const processedOrderCodes = new Set<string>();
const processedEventTimestamps = new Map<string, number>();

// Multi-tab BroadcastChannel
let orderBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    orderBroadcastChannel = new BroadcastChannel('palak_admin_order_channel');
    orderBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'NEW_ORDER') {
        // Tag as broadcast so the manager can distinguish and deduplicate
        const payload = { ...event.data.payload, source: event.data.payload?.source || 'broadcast' };
        dispatchNewOrderLocally(payload, false);
      } else if (event.data && event.data.type === 'ORDER_UPDATED') {
        const payload = { ...event.data.payload, source: event.data.payload?.source || 'broadcast' };
        dispatchOrderUpdatedLocally(payload, false);
      } else if (event.data && event.data.type === 'ORDER_DELETED') {
        dispatchOrderDeletedLocally(event.data.payload, false);
      }
    };
  } catch (e) {
    console.debug('[Realtime Bus] BroadcastChannel init notice:', e);
  }
}

/**
 * Checks whether an order event has already been processed to prevent duplicates.
 */
export function isOrderEventDuplicate(orderCode: string): boolean {
  if (!orderCode) return false;
  const now = Date.now();
  const lastProcessed = processedEventTimestamps.get(orderCode);

  // If processed within the last 5 seconds, it's a duplicate
  if (lastProcessed && now - lastProcessed < 5000) {
    return true;
  }

  // Record timestamp and maintain rolling buffer size
  processedEventTimestamps.set(orderCode, now);
  processedOrderCodes.add(orderCode);

  if (processedOrderCodes.size > SEEN_EVENTS_MAX) {
    const oldestKey = processedOrderCodes.values().next().value;
    if (oldestKey) {
      processedOrderCodes.delete(oldestKey);
      processedEventTimestamps.delete(oldestKey);
    }
  }

  return false;
}

/**
 * Dispatches a new order event across the current window and all open browser tabs.
 */
export function dispatchNewOrderLocally(payload: OrderEventPayload, broadcastToOtherTabs = true): void {
  if (typeof window === 'undefined') return;

  // Dispatch custom DOM event in the current window
  window.dispatchEvent(
    new CustomEvent('palak:new-order', {
      detail: payload,
    })
  );

  // Broadcast to other tabs if requested
  if (broadcastToOtherTabs && orderBroadcastChannel) {
    try {
      orderBroadcastChannel.postMessage({
        type: 'NEW_ORDER',
        payload,
      });
    } catch {}
  }
}

/**
 * Dispatches an order update event across the current window and all open browser tabs.
 */
export function dispatchOrderUpdatedLocally(payload: OrderEventPayload, broadcastToOtherTabs = true): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('palak:order-updated', {
      detail: payload,
    })
  );

  if (broadcastToOtherTabs && orderBroadcastChannel) {
    try {
      orderBroadcastChannel.postMessage({
        type: 'ORDER_UPDATED',
        payload,
      });
    } catch {}
  }
}

/**
 * Dispatches an order deletion event across the current window and all open browser tabs.
 */
export function dispatchOrderDeletedLocally(payload: { orderCode?: string; id?: string }, broadcastToOtherTabs = true): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('palak:order-deleted', {
      detail: payload,
    })
  );

  if (broadcastToOtherTabs && orderBroadcastChannel) {
    try {
      orderBroadcastChannel.postMessage({
        type: 'ORDER_DELETED',
        payload,
      });
    } catch {}
  }
}

/**
 * Helper to safely extract a human-readable service title from order items payload.
 */
export function extractServiceNameFromItems(items: any): string {
  if (!items) return 'Print Order';
  try {
    const arr = Array.isArray(items) ? items : typeof items === 'string' ? JSON.parse(items) : [];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0]?.productName || arr[0]?.product_name || arr[0]?.name || 'Print Service';
      return arr.length > 1 ? `${first} + ${arr.length - 1} more` : first;
    }
  } catch {}
  return 'Print Order';
}

/**
 * Dispatches a toast notification to the Admin UI via DOM custom event.
 */
export function dispatchAdminToast(
  title: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  message?: string
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('palak:show-toast', {
      detail: { title, type, message },
    })
  );
}
