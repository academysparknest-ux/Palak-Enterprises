import { supabase, isSupabaseConfigured } from "../supabase/client";

export interface PublicVerificationItem {
  productName: string;
  quantity: number;
  unit?: string;
  totalPrice?: number;
  description?: string;
}

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
      items: PublicVerificationItem[];
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
 * 2. Strict input sanitization (alphanumeric format, max length 64, rejection of TEMP-/DRAFT-/LOCAL-).
 * 3. 8-second request timeout with graceful fallback to UNAVAILABLE (never INVALID).
 * 4. Technical errors are sanitized; zero leakage of private PII, credentials, or internal schemas.
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

  // 3. Authoritative Query via Dedicated PostgreSQL RPC (Fail-Closed)
  let timer: any;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("VERIFICATION_TIMEOUT")), timeoutMs);
    });

    const { data: rpcRes, error: rpcErr } = await Promise.race([
      supabase.rpc("verify_invoice_authenticity", { p_invoice_number: cleanId }),
      timeoutPromise,
    ]);
    clearTimeout(timer);

    if (rpcErr) {
      console.warn("Public invoice verification RPC notice:", rpcErr.message || rpcErr);
      return {
        status: "UNAVAILABLE",
        error: "NETWORK_ERROR",
      };
    }

    if (!rpcRes) {
      return {
        status: "UNAVAILABLE",
        error: "SERVICE_UNAVAILABLE",
      };
    }

    // 4. Map RPC Result
    if (rpcRes.success && rpcRes.isValid) {
      const rawItems = Array.isArray(rpcRes.items) ? rpcRes.items : [];
      const items: PublicVerificationItem[] = rawItems.map((it: any) => ({
        productName: String(it.productName || it.name || "Printing & Digital Service"),
        quantity: Number(it.quantity) || 1,
        unit: it.unit ? String(it.unit) : undefined,
        totalPrice: Number(it.totalPrice) || 0,
        description: it.description ? String(it.description) : undefined,
      }));

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
        itemCount: items.length || Number(rpcRes.itemCount) || 1,
        items,
        verifiedAt: String(rpcRes.verifiedAt || new Date().toISOString()),
      };
    }

    if (rpcRes.success && rpcRes.isCancelled) {
      return {
        status: "CANCELLED",
        invoiceNumber: String(rpcRes.invoiceNumber || cleanId),
        totalAmount: Number(rpcRes.totalAmount) || 0,
        cancellationReason: rpcRes.cancellationReason ? String(rpcRes.cancellationReason) : undefined,
        verifiedAt: String(rpcRes.verifiedAt || new Date().toISOString()),
      };
    }

    if (rpcRes.error === "INVOICE_NOT_FOUND") {
      return {
        status: "INVALID",
        reason: "INVOICE_NOT_FOUND",
      };
    }

    if (rpcRes.error === "INVALID_INVOICE_IDENTIFIER") {
      return {
        status: "INVALID",
        reason: "INVALID_IDENTIFIER",
      };
    }

    return {
      status: "UNAVAILABLE",
      error: "SERVICE_UNAVAILABLE",
    };
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
}
