/**
 * React hook for consuming real-time order events in Admin components.
 *
 * This hook is a thin wrapper around the singleton RealtimeOrdersManager.
 * All event deduplication, local DOM event handling, and cross-tab sync
 * are handled internally by the manager — components just provide callbacks.
 *
 * Usage:
 *   useRealtimeOrders({
 *     onNewOrder: (order) => { ... },
 *     onOrderUpdated: (order) => { ... },
 *     onOrderDeleted: (payload) => { ... },
 *   });
 */

import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { realtimeOrdersManager, type RealtimeOrderCallbacks } from "../lib/realtime/realtimeOrdersManager";
import { type StoredOrder } from "../lib/storage/store";

export interface UseRealtimeOrdersOptions {
  enabled?: boolean;
}

export function useRealtimeOrders(
  callbacks: RealtimeOrderCallbacks,
  options?: UseRealtimeOrdersOptions
) {
  const { loading: authLoading, isAuthenticated, isStaff, user } = useAuth();
  const callbacksRef = useRef<RealtimeOrderCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  const isEnabled = options?.enabled !== undefined
    ? options.enabled
    : (!authLoading && isAuthenticated && isStaff && Boolean(user));

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Subscribe to the singleton manager — it handles:
    //   • Supabase Realtime postgres_changes (INSERT/UPDATE/DELETE)
    //   • Local DOM events (palak:new-order, palak:order-updated, palak:order-deleted)
    //   • Cross-tab BroadcastChannel events
    //   • Deduplication across all sources
    const unsubscribe = realtimeOrdersManager.subscribe({
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

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);
}

