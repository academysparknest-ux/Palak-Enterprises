import { useEffect, useRef } from "react";
import { realtimeOrdersManager, type RealtimeOrderCallbacks } from "../lib/realtime/realtimeOrdersManager";
import { type StoredOrder } from "../lib/storage/store";
import { mapOrderRowToStoredOrder } from "../lib/supabase/database";

export function useRealtimeOrders(callbacks: RealtimeOrderCallbacks) {
  const callbacksRef = useRef<RealtimeOrderCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    // 1. Subscribe to the singleton Supabase Realtime manager
    const unsubscribeSupabase = realtimeOrdersManager.subscribe({
      onNewOrder: (order: StoredOrder) => {
        callbacksRef.current.onNewOrder?.(order);
      },
      onOrderUpdated: (order: StoredOrder) => {
        callbacksRef.current.onOrderUpdated?.(order);
      },
      onOrderDeleted: (payload: { orderCode?: string; id?: string }) => {
        callbacksRef.current.onOrderDeleted?.(payload);
      },
    });

    // 2. Also listen for local / cross-tab broadcast events
    const onLocalNewOrder = (e: CustomEvent) => {
      if (e.detail && e.detail.source !== "supabase_realtime") {
        const mapped = mapOrderRowToStoredOrder({
          id: e.detail.id,
          order_code: e.detail.orderCode,
          customer_name: e.detail.customerName,
          customer_phone: e.detail.customerPhone,
          total_amount: e.detail.totalAmount,
          order_status: e.detail.orderStatus,
          payment_status: e.detail.paymentStatus,
          payment_method: e.detail.paymentMethod,
          items: e.detail.items,
          created_at: e.detail.createdAt,
        });
        callbacksRef.current.onNewOrder?.(mapped);
      }
    };

    const onLocalOrderUpdated = (e: CustomEvent) => {
      if (e.detail && e.detail.source !== "supabase_realtime") {
        const mapped = mapOrderRowToStoredOrder({
          id: e.detail.id,
          order_code: e.detail.orderCode,
          customer_name: e.detail.customerName,
          customer_phone: e.detail.customerPhone,
          total_amount: e.detail.totalAmount,
          order_status: e.detail.orderStatus,
          payment_status: e.detail.paymentStatus,
          payment_method: e.detail.paymentMethod,
          items: e.detail.items,
          created_at: e.detail.createdAt,
        });
        callbacksRef.current.onOrderUpdated?.(mapped);
      }
    };

    const onLocalOrderDeleted = (e: CustomEvent) => {
      if (e.detail) {
        callbacksRef.current.onOrderDeleted?.(e.detail);
      }
    };

    window.addEventListener("palak:new-order" as any, onLocalNewOrder);
    window.addEventListener("palak:order-updated" as any, onLocalOrderUpdated);
    window.addEventListener("palak:order-deleted" as any, onLocalOrderDeleted);

    return () => {
      unsubscribeSupabase();
      window.removeEventListener("palak:new-order" as any, onLocalNewOrder);
      window.removeEventListener("palak:order-updated" as any, onLocalOrderUpdated);
      window.removeEventListener("palak:order-deleted" as any, onLocalOrderDeleted);
    };
  }, []);
}
