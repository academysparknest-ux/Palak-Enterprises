import QRCode from "qrcode";
import type { StoredInvoice } from "./types";

export interface InvoiceQRConfig {
  label: "SCAN TO VERIFY";
  caption: string;
  verificationUrl: string;
  isPermanent: boolean;
}

/**
 * Resolves application canonical production base URL.
 * Checks VITE_APP_URL, VITE_PUBLIC_APP_URL, VITE_SITE_URL, production browser origin, or canonical fallback.
 * CRITICAL: Never generates localhost URLs for customer-facing invoices or QR codes.
 */
export function getAppBaseUrl(): string {
  const envUrl = typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_SITE_URL)
    : undefined;

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const clean = envUrl.trim().replace(/\/+$/, "");
    if (!clean.includes("localhost") && !clean.includes("127.0.0.1") && !clean.includes("0.0.0.0")) {
      return clean;
    }
  }

  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    // Use window origin only if running in production on a real domain or preview URL
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes("0.0.0.0")) {
      return origin.replace(/\/+$/, "");
    }
  }

  // Canonical Production Application URL
  return "https://www.palakenterprises.shop";
}

/**
 * Determines whether the invoice number is a permanent persisted sequential identifier
 * e.g. "PE-2026-0042" -> true
 * e.g. "TEMP-2026-XXXX", "DRAFT-XXXX", "" -> false
 */
export function isPermanentInvoiceNumber(invoiceNumber?: string): boolean {
  if (!invoiceNumber || typeof invoiceNumber !== "string") return false;
  const clean = invoiceNumber.trim().toUpperCase();
  if (clean.length === 0) return false;
  if (clean.startsWith("TEMP-") || clean.startsWith("DRAFT-") || clean.startsWith("LOCAL-")) {
    return false;
  }
  return true;
}

/**
 * Builds canonical public invoice verification URL using the permanent invoice identifier
 * Example: https://www.palakenterprises.shop/verify-invoice/PE-2026-0042
 */
export function buildInvoiceVerificationUrl(invoice: StoredInvoice | { invoiceNumber?: string }): string | null {
  const invoiceNumber = (invoice.invoiceNumber || "").trim().toUpperCase();
  
  if (!isPermanentInvoiceNumber(invoiceNumber)) {
    return null;
  }

  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/verify-invoice/${encodeURIComponent(invoiceNumber)}`;
}

/**
 * Gets invoice QR configuration for rendering
 */
export function getInvoiceQRConfig(invoice: StoredInvoice): InvoiceQRConfig | null {
  const invoiceNumber = (invoice.invoiceNumber || "").trim().toUpperCase();
  const isPermanent = isPermanentInvoiceNumber(invoiceNumber);
  const verificationUrl = buildInvoiceVerificationUrl(invoice);

  if (!isPermanent || !verificationUrl) {
    return {
      label: "SCAN TO VERIFY",
      caption: invoiceNumber || "Unassigned",
      verificationUrl: "",
      isPermanent: false,
    };
  }

  return {
    label: "SCAN TO VERIFY",
    caption: invoiceNumber,
    verificationUrl,
    isPermanent: true,
  };
}

/**
 * Generates a high-density, sharp PNG Data URL representation of the verification QR code.
 * Downscaled via CSS to 55-65px to ensure razor sharpness in print and A4 PDF export.
 */
export async function generateInvoiceVerificationQr(
  verificationUrl: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  if (!verificationUrl || typeof verificationUrl !== "string" || verificationUrl.trim().length === 0) {
    throw new Error("Invalid verification URL for QR generation");
  }

  return QRCode.toDataURL(verificationUrl, {
    width: 256, // High internal resolution for crisp print/PDF output
    margin: 1,  // Minimal clean quiet-zone
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a", // Slate-900 for dark, professional scan contrast
      light: "#ffffff",
    },
    ...options,
  });
}
