import { supabase, isSupabaseConfigured } from "../supabase/client";

/**
 * Mutually exclusive, strongly-typed verification result.
 * Eliminates impossible states and prevents client-side ambiguity.
 */
export type PublicInvoiceVerificationResult =
  | {
      status: "AUTHENTIC";
      invoiceNumber: string;
      invoiceDate: string;
      completionDate?: string;
      documentType: string;
      financialYear: string;
      orderCode?: string;
      source: string;
      totalAmount: number;
      amountPaid: number;
      amountDue: number;
      paymentStatus: "paid" | "confirmed" | "pending" | "partially_paid" | "failed" | "refunded";
      paymentMethod?: string;
      businessName: string;
      itemCount: number;
      verifiedAt: string;
    }
  | {
      status: "CANCELLED";
      invoiceNumber: string;
      totalAmount: number;
      cancellationReason?: string;
      verifiedAt: string;
    }
  | {
      status: "INVALID";
      reason: "INVALID_IDENTIFIER" | "INVOICE_NOT_FOUND";
    }
  | {
      status: "UNAVAILABLE";
      error: "SERVICE_UNAVAILABLE" | "TIMEOUT" | "NETWORK_ERROR";
    };

/**
 * Publicly verifies an invoice by invoice number exclusively against the authoritative database.
 * 
 * SECURITY AUDIT PROMISES:
 * 1. Database is the SOLE authority. LocalStorage/sessionStorage/cache have zero influence.
 * 2. Strict input sanitization (alphanumeric format, max length 64, rejection of TEMP-/DRAFT-).
 * 3. 8-second request timeout with graceful fallback to UNAVAILABLE (never INVALID).
 * 4. Technical errors are sanitized; zero leakage of database schemas, SQL errors, or stack traces.
 */
export async function verifyInvoiceAuthenticity(
  invoiceIdentifier: string,
  timeoutMs: number = 8000
): Promise<PublicInvoiceVerificationResult> {
  const cleanId = (invoiceIdentifier || "").trim().toUpperCase();

  // 1. Strict input validation and rejection of invalid / draft / unpersisted identifiers
  if (
    !cleanId ||
    cleanId.length > 64 ||
    !/^[A-Z0-9\-_/]+$/.test(cleanId) ||
    cleanId.startsWith("TEMP-") ||
    cleanId.startsWith("DRAFT-") ||
    cleanId.startsWith("LOCAL-")
  ) {
    return {
      status: "INVALID",
      reason: "INVALID_IDENTIFIER",
    };
  }

  // 2. Database client configuration check
  if (!isSupabaseConfigured || !supabase) {
    return {
      status: "UNAVAILABLE",
      error: "SERVICE_UNAVAILABLE",
    };
  }

  // 3. Authoritative Query with Timeout Protection
  try {
    const rpcPromise = supabase.rpc("verify_invoice_authenticity", {
      p_invoice_number: cleanId,
    });

    const timeoutPromise = new Promise<{ data: null; error: { message: string; isTimeout: boolean } }>(
      (_, reject) => setTimeout(() => reject(new Error("VERIFICATION_TIMEOUT")), timeoutMs)
    );

    const { data: rpcRes, error: rpcErr } = (await Promise.race([
      rpcPromise,
      timeoutPromise,
    ])) as any;

    if (rpcErr) {
      console.warn("Invoice verification RPC notice:", rpcErr.message || rpcErr);
      return {
        status: "UNAVAILABLE",
        error: "SERVICE_UNAVAILABLE",
      };
    }

    if (rpcRes) {
      if (rpcRes.success && rpcRes.isValid) {
        return {
          status: "AUTHENTIC",
          invoiceNumber: String(rpcRes.invoiceNumber || cleanId),
          invoiceDate: String(rpcRes.invoiceDate || new Date().toISOString()),
          completionDate: rpcRes.completionDate ? String(rpcRes.completionDate) : undefined,
          documentType: String(rpcRes.documentType || "TAX_INVOICE"),
          financialYear: String(rpcRes.financialYear || "2026-27"),
          orderCode: rpcRes.orderCode ? String(rpcRes.orderCode) : undefined,
          source: String(rpcRes.source || "OFFICIAL"),
          totalAmount: Number(rpcRes.totalAmount) || 0,
          amountPaid: Number(rpcRes.amountPaid) || 0,
          amountDue: Number(rpcRes.amountDue) || 0,
          paymentStatus: rpcRes.paymentStatus || "pending",
          paymentMethod: rpcRes.paymentMethod || "pay_at_store",
          businessName: String(rpcRes.businessName || "Palak Enterprises"),
          itemCount: Number(rpcRes.itemCount) || 0,
          verifiedAt: String(rpcRes.verifiedAt || new Date().toISOString()),
        };
      } else if (rpcRes.success && rpcRes.isCancelled) {
        return {
          status: "CANCELLED",
          invoiceNumber: String(rpcRes.invoiceNumber || cleanId),
          totalAmount: Number(rpcRes.totalAmount) || 0,
          cancellationReason: rpcRes.cancellationReason ? String(rpcRes.cancellationReason) : undefined,
          verifiedAt: String(rpcRes.verifiedAt || new Date().toISOString()),
        };
      } else {
        // Authoritative confirmation: No matching invoice in database
        return {
          status: "INVALID",
          reason: "INVOICE_NOT_FOUND",
        };
      }
    }
  } catch (err: any) {
    if (err?.message === "VERIFICATION_TIMEOUT") {
      return {
        status: "UNAVAILABLE",
        error: "TIMEOUT",
      };
    }
    console.warn("Invoice verification network exception:", err);
    return {
      status: "UNAVAILABLE",
      error: "NETWORK_ERROR",
    };
  }

  return {
    status: "UNAVAILABLE",
    error: "SERVICE_UNAVAILABLE",
  };
}
