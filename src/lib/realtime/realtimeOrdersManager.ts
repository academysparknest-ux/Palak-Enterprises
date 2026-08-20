/**
 * Centralized Realtime Orders Manager for Palak Enterprises Admin.
 *
 * This is the SINGLE source of truth for all order events in the admin UI.
 * It coordinates:
 *   1. One shared Supabase Realtime channel for `orders` (INSERT/UPDATE/DELETE)
 *   2. Local DOM event listeners for same-tab order creation
 *   3. Deduplication so each subscriber receives each event exactly once
 *   4. Reconnection with automatic data sync signal
 *
 * Components use `useRealtimeOrders` hook which delegates entirely to this manager.
 */

import { supabase, isSupabaseConfigured } from "../supabase/client";
import { type StoredOrder } from "../storage/store";
import { mapOrderRowToStoredOrder, getStaffOrderByCodeOrId } from "../supabase/database";
import {
  dispatchNewOrderLocally,
  dispatchOrderUpdatedLocally,
  dispatchOrderDeletedLocally,
} from "./adminOrderEvents";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealtimeOrderCallbacks {
  onNewOrder?: (order: StoredOrder) => void;
  onOrderUpdated?: (order: StoredOrder) => void;
  onOrderDeleted?: (payload: { orderCode?: string; id?: string }) => void;
}

// ─── Deduplication Buffer ─────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 6000;
const DEDUP_MAX_SIZE = 500;

/** Tracks recently dispatched events to prevent double-firing */
const recentlyDispatched = new Map<string, number>();

function isDuplicateDispatch(key: string): boolean {
  if (!key) return false;
  const now = Date.now();
  const normalizedKey = key.trim().toUpperCase();
  const last = recentlyDispatched.get(normalizedKey);
  if (last && now - last < DEDUP_WINDOW_MS) {
    return true;
  }
  recentlyDispatched.set(normalizedKey, now);
  // Prune old entries
  if (recentlyDispatched.size > DEDUP_MAX_SIZE) {
    const oldest = recentlyDispatched.keys().next().value;
    if (oldest) recentlyDispatched.delete(oldest);
  }
  return false;
}

// ─── Manager Class ────────────────────────────────────────────────────────────

class RealtimeOrdersManager {
  private subscribers = new Set<RealtimeOrderCallbacks>();
  private channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private wasConnected = false;
  private localListenersAttached = false;

  /**
   * Subscribe a component to real-time order events.
   * Returns an unsubscribe cleanup function.
   */
  public subscribe(callbacks: RealtimeOrderCallbacks): () => void {
    this.subscribers.add(callbacks);

    // Attach local DOM listeners once (not per subscriber)
    if (!this.localListenersAttached) {
      this.attachLocalListeners();
    }

    // Connect Supabase channel when first subscriber arrives
    if (this.subscribers.size === 1) {
      this.connect();
    }

    return () => {
      this.subscribers.delete(callbacks);
      if (this.subscribers.size === 0) {
        this.disconnect();
        this.detachLocalListeners();
      }
    };
  }

  // ─── Supabase Realtime Channel ────────────────────────────────────────────

  private connect(): void {
    if (!isSupabaseConfigured || !supabase || this.channel || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const client = supabase;

    console.info("[Realtime Orders] Initializing");
    console.info("[Realtime Orders] Creating channel: admin-orders-realtime-singleton");

    try {
      this.channel = client
        .channel("admin-orders-realtime-singleton")
        .on(
          "postgres_changes" as any,
          { event: "INSERT", schema: "public", table: "orders" },
          async (payload: any) => {
            const raw = payload.new;
            if (!raw || (!raw.id && !raw.order_code)) return;

            const code = (raw.order_code || raw.id || "").trim().toUpperCase();
            console.info("[Realtime Orders] INSERT received");
            console.info(`[Realtime Orders] Order ID: ${raw.id || "N/A"}`);
            console.info(`[Realtime Orders] Order Code: ${code}`);

            const dedupKey = `insert:${code}`;
            if (isDuplicateDispatch(dedupKey)) {
              console.debug(`[Realtime Orders] Order already dispatched, skipping duplicate: ${code}`);
              return;
            }

            console.info(`[Realtime Orders] Dispatching new order: ${code}`);

            let storedOrder = mapOrderRowToStoredOrder(raw);

            // Enrich items if not embedded in the realtime payload
            if ((!storedOrder.items || storedOrder.items.length === 0) && (raw.id || raw.order_code)) {
              try {
                const enriched = await getStaffOrderByCodeOrId(raw.id || raw.order_code);
                if (enriched && enriched.items && enriched.items.length > 0) {
                  storedOrder = enriched;
                }
              } catch {
                // Items will be loaded on next full fetch
              }
            }

            this.notifySubscribers("new", storedOrder);

            // Bridge to DOM bus for cross-tab BroadcastChannel
            dispatchNewOrderLocally(
              this.buildEventPayload(storedOrder, "supabase_realtime"),
              true
            );
          }
        )
        .on(
          "postgres_changes" as any,
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload: any) => {
            const raw = payload.new;
            if (!raw || (!raw.id && !raw.order_code)) return;

            const code = (raw.order_code || raw.id || "").trim().toUpperCase();
            const dedupKey = `update:${code}:${raw.order_status}:${raw.payment_status}`;
            if (isDuplicateDispatch(dedupKey)) return;

            console.info(`[Realtime Orders] UPDATE received: ${code} → ${raw.order_status}`);

            const storedOrder = mapOrderRowToStoredOrder(raw);
            this.notifySubscribers("updated", storedOrder);

            dispatchOrderUpdatedLocally(
              this.buildEventPayload(storedOrder, "supabase_realtime"),
              true
            );
          }
        )
        .on(
          "postgres_changes" as any,
          { event: "DELETE", schema: "public", table: "orders" },
          (payload: any) => {
            const deletedCode = payload.old?.order_code;
            const deletedId = payload.old?.id;
            if (!deletedCode && !deletedId) return;

            const code = (deletedCode || deletedId || "").trim().toUpperCase();
            const dedupKey = `delete:${code}`;
            if (isDuplicateDispatch(dedupKey)) return;

            console.info(`[Realtime Orders] DELETE received: ${code}`);

            const deletionPayload = { orderCode: deletedCode, id: deletedId };
            this.notifySubscribers("deleted", deletionPayload);
            dispatchOrderDeletedLocally(deletionPayload, true);
          }
        )
        .subscribe((status: string) => {
          this.isConnecting = false;

          if (status === "SUBSCRIBED") {
            console.info("[Realtime Orders] SUBSCRIBED — connected to orders stream.");
            console.info("[Realtime Orders] Listening for INSERT, UPDATE, DELETE events.");

            // If reconnecting after a previous connection, signal consumers to re-sync
            if (this.wasConnected) {
              console.info("[Realtime Orders] Reconnected — signaling data sync...");
              this.dispatchReconnectSignal();
            }

            this.wasConnected = true;
            this.reconnectAttempts = 0;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.warn(`[Realtime Orders] Channel status: ${status}. Scheduling retry...`);
            this.handleReconnect();
          }
        });
    } catch (err) {
      this.isConnecting = false;
      console.warn("[Realtime Orders] Subscription error:", err);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.subscribers.size === 0) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.debug(`[Realtime Orders] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      if (this.channel && supabase) {
        try {
          supabase.removeChannel(this.channel);
        } catch {}
        this.channel = null;
      }
      this.isConnecting = false;
      this.connect();
    }, delay);
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel && supabase) {
      console.info("[Realtime Orders] Subscription closed.");
      try {
        supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.wasConnected = false;
  }

  // ─── Local / Cross-Tab DOM Event Listeners ────────────────────────────────

  private boundOnLocalNew: ((e: Event) => void) | null = null;
  private boundOnLocalUpdated: ((e: Event) => void) | null = null;
  private boundOnLocalDeleted: ((e: Event) => void) | null = null;

  private attachLocalListeners(): void {
    if (this.localListenersAttached || typeof window === "undefined") return;

    this.boundOnLocalNew = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      // Skip events that originated from this manager's Supabase handler
      if (detail.source === "supabase_realtime") return;

      const code = (detail.orderCode || detail.id || "").trim().toUpperCase();
      const dedupKey = `insert:${code}`;
      if (isDuplicateDispatch(dedupKey)) {
        console.debug(`[Realtime Orders] Order already dispatched locally, skipping: ${code}`);
        return;
      }

      console.info(`[Realtime Orders] New order via local event: ${code}`);

      const mapped = mapOrderRowToStoredOrder({
        id: detail.id,
        order_code: detail.orderCode,
        customer_name: detail.customerName,
        customer_phone: detail.customerPhone,
        total_amount: detail.totalAmount,
        order_status: detail.orderStatus,
        payment_status: detail.paymentStatus,
        payment_method: detail.paymentMethod,
        items: detail.items,
        created_at: detail.createdAt,
      });

      this.notifySubscribers("new", mapped);
    };

    this.boundOnLocalUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.source === "supabase_realtime") return;

      const code = (detail.orderCode || detail.id || "").trim().toUpperCase();
      const dedupKey = `update:${code}:${detail.orderStatus}:${detail.paymentStatus}`;
      if (isDuplicateDispatch(dedupKey)) return;

      const mapped = mapOrderRowToStoredOrder({
        id: detail.id,
        order_code: detail.orderCode,
        customer_name: detail.customerName,
        customer_phone: detail.customerPhone,
        total_amount: detail.totalAmount,
        order_status: detail.orderStatus,
        payment_status: detail.paymentStatus,
        payment_method: detail.paymentMethod,
        items: detail.items,
        created_at: detail.createdAt,
      });

      this.notifySubscribers("updated", mapped);
    };

    this.boundOnLocalDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const code = (detail.orderCode || detail.id || "").trim().toUpperCase();
      const dedupKey = `delete:${code}`;
      if (isDuplicateDispatch(dedupKey)) return;

      this.notifySubscribers("deleted", { orderCode: detail.orderCode, id: detail.id });
    };

    window.addEventListener("palak:new-order", this.boundOnLocalNew);
    window.addEventListener("palak:order-updated", this.boundOnLocalUpdated);
    window.addEventListener("palak:order-deleted", this.boundOnLocalDeleted);

    this.localListenersAttached = true;
  }

  private detachLocalListeners(): void {
    if (!this.localListenersAttached || typeof window === "undefined") return;

    if (this.boundOnLocalNew) window.removeEventListener("palak:new-order", this.boundOnLocalNew);
    if (this.boundOnLocalUpdated) window.removeEventListener("palak:order-updated", this.boundOnLocalUpdated);
    if (this.boundOnLocalDeleted) window.removeEventListener("palak:order-deleted", this.boundOnLocalDeleted);

    this.boundOnLocalNew = null;
    this.boundOnLocalUpdated = null;
    this.boundOnLocalDeleted = null;
    this.localListenersAttached = false;
  }

  // ─── Subscriber Notification ──────────────────────────────────────────────

  private notifySubscribers(type: "new", data: StoredOrder): void;
  private notifySubscribers(type: "updated", data: StoredOrder): void;
  private notifySubscribers(type: "deleted", data: { orderCode?: string; id?: string }): void;
  private notifySubscribers(type: string, data: any): void {
    this.subscribers.forEach((sub) => {
      try {
        if (type === "new") sub.onNewOrder?.(data);
        else if (type === "updated") sub.onOrderUpdated?.(data);
        else if (type === "deleted") sub.onOrderDeleted?.(data);
      } catch (e) {
        console.warn("[Realtime Orders] Subscriber callback error:", e);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildEventPayload(order: StoredOrder, source: 'supabase_realtime' | 'local_store' | 'broadcast') {
    const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
    let serviceTitle = firstItem ? firstItem.productName : "Print Order";
    if (order.items && order.items.length > 1) {
      serviceTitle += ` + ${order.items.length - 1} more`;
    }

    return {
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      serviceName: serviceTitle,
      items: order.items,
      createdAt: order.createdAt,
      source,
    };
  }

  private dispatchReconnectSignal(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("palak:realtime-reconnected"));
    }
  }
}

export const realtimeOrdersManager = new RealtimeOrdersManager();
