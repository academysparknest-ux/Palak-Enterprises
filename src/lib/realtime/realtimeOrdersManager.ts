/**
 * Centralized Realtime Orders Manager for Palak Enterprises Admin.
 * Coordinates a single shared Supabase Realtime channel for orders,
 * preventing multiple subscriptions, race conditions, and duplicate listeners.
 */

import { supabase, isSupabaseConfigured } from "../supabase/client";
import { type StoredOrder } from "../storage/store";
import { mapOrderRowToStoredOrder, getStaffOrderByCodeOrId } from "../supabase/database";
import {
  isOrderEventDuplicate,
  dispatchNewOrderLocally,
  dispatchOrderUpdatedLocally,
  dispatchOrderDeletedLocally,
} from "./adminOrderEvents";

export interface RealtimeOrderCallbacks {
  onNewOrder?: (order: StoredOrder) => void;
  onOrderUpdated?: (order: StoredOrder) => void;
  onOrderDeleted?: (payload: { orderCode?: string; id?: string }) => void;
}

class RealtimeOrdersManager {
  private subscribers = new Set<RealtimeOrderCallbacks>();
  private channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;

  /**
   * Subscribes a component to real-time order events.
   * Returns an unsubscribe cleanup function.
   */
  public subscribe(callbacks: RealtimeOrderCallbacks): () => void {
    this.subscribers.add(callbacks);

    if (this.subscribers.size === 1) {
      this.connect();
    }

    return () => {
      this.subscribers.delete(callbacks);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Initializes the Supabase Realtime channel for orders.
   */
  private connect(): void {
    if (!isSupabaseConfigured || !supabase || this.channel || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const client = supabase;

    try {
      this.channel = client
        .channel("admin-orders-realtime-singleton")
        .on(
          "postgres_changes" as any,
          { event: "INSERT", schema: "public", table: "orders" },
          async (payload: any) => {
            const raw = payload.new;
            if (!raw) return;

            const orderCode = raw.order_code || raw.id;
            const isDup = isOrderEventDuplicate(orderCode);

            let storedOrder = mapOrderRowToStoredOrder(raw);

            // If payload has no embedded items, enrich asynchronously from DB
            if ((!storedOrder.items || storedOrder.items.length === 0) && (raw.id || raw.order_code)) {
              try {
                const enriched = await getStaffOrderByCodeOrId(raw.id || raw.order_code);
                if (enriched && enriched.items && enriched.items.length > 0) {
                  storedOrder = enriched;
                }
              } catch {}
            }

            // Notify all active subscribers
            this.subscribers.forEach((sub) => {
              try {
                sub.onNewOrder?.(storedOrder);
              } catch (e) {
                console.warn("[Realtime Manager] Subscriber callback error:", e);
              }
            });

            // Bridge to local DOM bus if not duplicate
            if (!isDup) {
              const firstItem = storedOrder.items && storedOrder.items.length > 0 ? storedOrder.items[0] : null;
              let serviceTitle = firstItem ? firstItem.productName : "Print Order";
              if (storedOrder.items && storedOrder.items.length > 1) {
                serviceTitle += ` + ${storedOrder.items.length - 1} more`;
              }

              dispatchNewOrderLocally(
                {
                  id: storedOrder.id,
                  orderCode: storedOrder.orderCode,
                  customerName: storedOrder.customerName,
                  customerPhone: storedOrder.customerPhone,
                  totalAmount: storedOrder.totalAmount,
                  orderStatus: storedOrder.orderStatus,
                  paymentStatus: storedOrder.paymentStatus,
                  paymentMethod: storedOrder.paymentMethod,
                  serviceName: serviceTitle,
                  items: storedOrder.items,
                  createdAt: storedOrder.createdAt,
                  source: "supabase_realtime",
                },
                false // Don't broadcast to other tabs to avoid double-processing
              );
            }
          }
        )
        .on(
          "postgres_changes" as any,
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload: any) => {
            const raw = payload.new;
            if (!raw) return;

            const storedOrder = mapOrderRowToStoredOrder(raw);

            this.subscribers.forEach((sub) => {
              try {
                sub.onOrderUpdated?.(storedOrder);
              } catch (e) {
                console.warn("[Realtime Manager] Update callback error:", e);
              }
            });

            dispatchOrderUpdatedLocally(
              {
                id: storedOrder.id,
                orderCode: storedOrder.orderCode,
                customerName: storedOrder.customerName,
                customerPhone: storedOrder.customerPhone,
                totalAmount: storedOrder.totalAmount,
                orderStatus: storedOrder.orderStatus,
                paymentStatus: storedOrder.paymentStatus,
                paymentMethod: storedOrder.paymentMethod,
                serviceName: "Print Order",
                items: storedOrder.items,
                createdAt: storedOrder.createdAt,
                source: "supabase_realtime",
              },
              false
            );
          }
        )
        .on(
          "postgres_changes" as any,
          { event: "DELETE", schema: "public", table: "orders" },
          (payload: any) => {
            const deletedCode = payload.old?.order_code;
            const deletedId = payload.old?.id;
            const deletionPayload = { orderCode: deletedCode, id: deletedId };

            this.subscribers.forEach((sub) => {
              try {
                sub.onOrderDeleted?.(deletionPayload);
              } catch (e) {
                console.warn("[Realtime Manager] Delete callback error:", e);
              }
            });

            dispatchOrderDeletedLocally(deletionPayload, false);
          }
        )
        .subscribe((status: string) => {
          this.isConnecting = false;
          if (status === "SUBSCRIBED") {
            this.reconnectAttempts = 0;
            console.info("[Palak Realtime] Connected to orders stream.");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            console.warn(`[Palak Realtime] Channel status: ${status}. Scheduling retry...`);
            this.handleReconnect();
          }
        });
    } catch (err) {
      this.isConnecting = false;
      console.warn("[Palak Realtime] Subscription error:", err);
      this.handleReconnect();
    }
  }

  /**
   * Reconnects with exponential backoff.
   */
  private handleReconnect(): void {
    if (this.subscribers.size === 0) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000);
    this.reconnectAttempts++;

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

  /**
   * Cleanly disconnects the singleton channel.
   */
  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel && supabase) {
      try {
        supabase.removeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }
}

export const realtimeOrdersManager = new RealtimeOrdersManager();
