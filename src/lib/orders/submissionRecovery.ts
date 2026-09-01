import { supabase, isSupabaseConfigured } from "../supabase/client";
import { PalakDataStore } from "../storage/store";
import type { OrderSubmissionState } from "./orderSubmissionStateMachine";

export interface ActiveSubmissionSession {
  submissionId: string;
  orderCode?: string;
  orderId?: string;
  state: OrderSubmissionState;
  paymentMethod: "pay_at_store" | "upi_online" | "pay_online";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount: number;
  totalPrintedPages: number;
  totalPhysicalSheets: number;
  totalDocuments: number;
  specifications: Record<string, string>;
  startedAt: string;
  updatedAt: string;
}

const ACTIVE_SUBMISSION_SESSION_KEY = "palak_active_order_submission_v2";
let memorySubmissionSession: string | null = null;

export function generateUniqueSubmissionId(): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PE-DOC-${Date.now()}-${rand}`;
}

export function saveActiveSubmissionSession(data: ActiveSubmissionSession): void {
  const serialized = JSON.stringify({ ...data, updatedAt: new Date().toISOString() });
  memorySubmissionSession = serialized;
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(ACTIVE_SUBMISSION_SESSION_KEY, serialized);
    } catch (err) {
      console.debug("[submissionRecovery] Session save note:", err);
    }
  }
}

export function getActiveSubmissionSession(): ActiveSubmissionSession | null {
  try {
    let raw = memorySubmissionSession;
    if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
      raw = sessionStorage.getItem(ACTIVE_SUBMISSION_SESSION_KEY) || memorySubmissionSession;
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.submissionId) return parsed;
  } catch (err) {
    console.debug("[submissionRecovery] Session read note:", err);
  }
  return null;
}

export function clearActiveSubmissionSession(): void {
  memorySubmissionSession = null;
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(ACTIVE_SUBMISSION_SESSION_KEY);
    } catch {}
  }
}

/**
 * Backend-authoritative query checking if an order under this submission ID has already been committed.
 */
export async function checkExistingSubmission(
  clientSubmissionId: string
): Promise<{
  found: boolean;
  orderCode?: string;
  orderId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  totalAmount?: number;
  items?: any[];
  error?: string;
}> {
  if (!clientSubmissionId || !clientSubmissionId.trim()) {
    return { found: false };
  }

  const cleanId = clientSubmissionId.trim();

  // 1. Authoritative PostgreSQL Database Query
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, payment_status, payment_method, order_status, total_amount, items, created_at")
        .eq("client_submission_id", cleanId)
        .maybeSingle();

      if (!error && data?.order_code) {
        return {
          found: true,
          orderCode: data.order_code,
          orderId: data.id,
          paymentStatus: data.payment_status,
          paymentMethod: data.payment_method,
          orderStatus: data.order_status,
          totalAmount: data.total_amount,
          items: data.items,
        };
      }
    } catch (dbErr: any) {
      console.warn("[submissionRecovery] Database submission check note:", dbErr);
    }
  }

  // 2. Authoritative Local Store Query Fallback
  try {
    const localOrders = PalakDataStore.getOrders();
    const localMatch = localOrders.find(
      (o) => (o as any).clientSubmissionId === cleanId || o.orderCode === cleanId
    );
    if (localMatch) {
      return {
        found: true,
        orderCode: localMatch.orderCode,
        orderId: localMatch.id,
        paymentStatus: localMatch.paymentStatus,
        paymentMethod: localMatch.paymentMethod,
        orderStatus: localMatch.orderStatus,
        totalAmount: localMatch.totalAmount,
        items: localMatch.items,
      };
    }
  } catch (storeErr) {
    console.debug("[submissionRecovery] Local store check note:", storeErr);
  }

  return { found: false };
}
