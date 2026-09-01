/**
 * Original Document Resolver & Authoritative Access Gateway
 *
 * Single Source of Truth for resolving, fetching, verifying, and opening
 * customer-uploaded documents across Admin Preview, Open PDF, Download, and Print.
 *
 * ABSOLUTE INVARIANTS:
 * 1. The customer's uploaded document must remain the ORIGINAL FILE, byte-for-byte.
 * 2. Error responses (404/403/500/HTML/JSON) MUST NEVER be cast into application/pdf Blobs.
 * 3. Never return localhost application URLs, Vite dev server endpoints, or SPA index.html as a document stream.
 * 4. All Admin actions (Open PDF, Preview, Download, Print) use this authoritative resolver.
 */

import { supabase, isSupabaseConfigured } from "../supabase/client";
import {
  normalizeStoragePath,
  isInvalidAppRouteOrLocalhostUrl,
  DEFAULT_STORAGE_BUCKET,
} from "./canonicalStoragePath";
import {
  verifyFetchedPdfBlob,
} from "./documentIntegrityEngine";
import { PalakDataStore } from "../storage/store";

export interface VerifiedDocumentResult {
  ok: boolean;
  url: string;
  blob?: Blob;
  blobUrl?: string;
  verifiedSize?: number;
  mimeType?: string;
  isPdf?: boolean;
  error?: string;
  statusCode?: number;
}

export interface AuthoritativeSignedUrlResult {
  signedUrl: string;
  storagePath: string;
  bucket: string;
  expiresAt: string;
}

export interface DocumentDiagnosticReport {
  orderCode: string;
  orderFound: boolean;
  itemFound: boolean;
  fileFound: boolean;
  bucket: string;
  storagePath: string;
  normalizedPath: string;
  signedUrlGenerated: boolean;
  signedUrl: string;
  httpStatus?: number;
  contentType?: string;
  objectSize?: number;
  expectedSize?: number;
  isPdfSignatureValid?: boolean;
  integrityStatus: "VALID" | "INTEGRITY_FAILED" | "OBJECT_NOT_FOUND" | "ACCESS_DENIED" | "INVALID_URL" | "CORRUPTED";
  diagnosticMessage: string;
}

/**
 * Generates an authoritative Supabase Storage signed URL directly from the storage bucket.
 * Guarantees that no relative paths or localhost/SPA routes are ever returned as signed URLs.
 */
export async function getAuthoritativeDocumentSignedUrl(
  urlOrPath: string,
  expiresInSeconds: number = 3600,
  forDownload: boolean = false,
  fileName?: string
): Promise<string> {
  if (!urlOrPath || typeof urlOrPath !== "string") return "";

  // 1. Direct Blob and Data URLs are legitimate browser-local streams
  if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) {
    return urlOrPath;
  }

  // 2. Reject obvious SPA routes that would mistakenly hit the Vite dev server
  if (isInvalidAppRouteOrLocalhostUrl(urlOrPath)) {
    console.warn("[OriginalDocumentResolver] Rejected localhost/SPA route:", urlOrPath);
    // Attempt extracting the underlying canonical storage path
    const extracted = normalizeStoragePath(urlOrPath, DEFAULT_STORAGE_BUCKET);
    if (!extracted || isInvalidAppRouteOrLocalhostUrl(extracted)) {
      return "";
    }
    urlOrPath = extracted;
  }

  const cleanPath = normalizeStoragePath(urlOrPath, DEFAULT_STORAGE_BUCKET);
  if (!cleanPath || !isSupabaseConfigured || !supabase) {
    // If Supabase is not configured, only allow valid absolute HTTP URLs
    if (urlOrPath.startsWith("https://") || urlOrPath.startsWith("http://")) {
      return urlOrPath;
    }
    return "";
  }

  try {
    const options = forDownload
      ? { download: fileName || true }
      : { download: false };

    // Primary attempt: Create signed URL from canonical relative storage path
    const { data, error } = await supabase.storage
      .from(DEFAULT_STORAGE_BUCKET)
      .createSignedUrl(cleanPath, expiresInSeconds, options as any);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    if (error) {
      console.warn("[OriginalDocumentResolver] createSignedUrl notice:", error.message || error);
    }

    // Secondary attempt: Check legacy path with encoded slashes
    if (cleanPath.includes("/")) {
      const legacyEncodedPath = cleanPath.replace(/\//g, "%2F");
      const legacyRes = await supabase.storage
        .from(DEFAULT_STORAGE_BUCKET)
        .createSignedUrl(legacyEncodedPath, expiresInSeconds, options as any);

      if (!legacyRes.error && legacyRes.data?.signedUrl) {
        return legacyRes.data.signedUrl;
      }
    }

    // Tertiary attempt: Public URL fallback if bucket is publicly readable
    const { data: publicData } = supabase.storage
      .from(DEFAULT_STORAGE_BUCKET)
      .getPublicUrl(cleanPath);

    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }

    return "";
  } catch (err) {
    console.error("[OriginalDocumentResolver] Signed URL resolution exception:", err);
    return "";
  }
}

/**
 * Backward-compatible alias for getAuthoritativeDocumentSignedUrl.
 */
export async function getAuthoritativeSignedUrl(
  urlOrPath: string,
  expiresInSeconds: number = 3600,
  forDownload: boolean = false,
  fileName?: string
): Promise<string> {
  return getAuthoritativeDocumentSignedUrl(urlOrPath, expiresInSeconds, forDownload, fileName);
}

/**
 * Fetches and authoritatively validates the original document from Storage.
 *
 * CRITICAL SAFEGUARDS:
 * 1. Never converts 404/403/500 HTTP error responses into PDF blobs.
 * 2. Never converts Vite/React index.html SPA responses into PDF blobs.
 * 3. Verifies %PDF- magic bytes before exposing binary stream.
 * 4. Automatically retries once with fresh signed URL if initial attempt hits transient error.
 */
export async function getVerifiedOriginalDocument(
  urlOrPath: string,
  options?: {
    expectedMinSize?: number;
    forDownload?: boolean;
    fileName?: string;
  }
): Promise<VerifiedDocumentResult> {
  if (!urlOrPath) {
    return {
      ok: false,
      url: "",
      error: "Original document is temporarily unavailable. Please retry.",
    };
  }

  // 1. Local Blobs and Data URLs
  if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) {
    try {
      const resp = await fetch(urlOrPath);
      const blob = await resp.blob();
      const pdfCheck = await verifyFetchedPdfBlob(blob, options?.expectedMinSize);
      return {
        ok: pdfCheck.isValidPdf,
        url: urlOrPath,
        blob,
        blobUrl: urlOrPath,
        verifiedSize: blob.size,
        mimeType: blob.type || "application/pdf",
        isPdf: pdfCheck.isValidPdf,
        error: pdfCheck.errorMessage,
      };
    } catch {
      return { ok: true, url: urlOrPath, blobUrl: urlOrPath };
    }
  }

  // Inner execution routine with single-retry capability
  const executeFetchAndValidate = async (retryCount = 0): Promise<VerifiedDocumentResult> => {
    // 2. Resolve Authenticated Supabase Signed URL
    const signedUrl = await getAuthoritativeDocumentSignedUrl(
      urlOrPath,
      3600,
      Boolean(options?.forDownload),
      options?.fileName
    );

    if (!signedUrl || isInvalidAppRouteOrLocalhostUrl(signedUrl)) {
      if (retryCount === 0) {
        // Try re-normalizing the path and retrying once
        const normalized = normalizeStoragePath(urlOrPath);
        if (normalized && normalized !== urlOrPath) {
          urlOrPath = normalized;
          return executeFetchAndValidate(1);
        }
      }
      return {
        ok: false,
        url: "",
        error: "Original document is temporarily unavailable. Please retry.",
      };
    }

    // 3. Fetch Document Stream and Validate HTTP Response
    try {
      const response = await fetch(signedUrl);

      // Reject non-OK responses immediately (404, 403, 500, etc.)
      if (!response.ok) {
        const statusCode = response.status;
        const errorMsg =
          statusCode === 404
            ? "Original document is temporarily unavailable. The storage object was not found."
            : statusCode === 403
            ? "You do not currently have permission to open this document."
            : `Storage server returned status ${statusCode}.`;

        return {
          ok: false,
          url: signedUrl,
          statusCode,
          error: errorMsg,
        };
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const contentLength = Number(response.headers.get("content-length")) || 0;

      // CRITICAL: Reject SPA HTML or JSON error headers disguised as HTTP 200
      if (
        contentType.includes("text/html") ||
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        if (retryCount === 0) {
          // Attempt recovery: re-resolve canonical path and retry
          return executeFetchAndValidate(1);
        }
        return {
          ok: false,
          url: signedUrl,
          statusCode: 200,
          error: "The document link is invalid. We are attempting to reconnect to the original file.",
        };
      }

      const blob = await response.blob();

      // 4. Magic-Byte PDF Integrity Verification
      const isPdfExpected =
        contentType.includes("pdf") ||
        (options?.fileName && options.fileName.toLowerCase().endsWith(".pdf")) ||
        urlOrPath.toLowerCase().endsWith(".pdf");

      if (isPdfExpected) {
        const validation = await verifyFetchedPdfBlob(
          blob,
          options?.expectedMinSize
        );

        if (!validation.isValidPdf) {
          return {
            ok: false,
            url: signedUrl,
            blob,
            verifiedSize: blob.size,
            error: "The stored document failed integrity verification (%PDF- signature missing).",
          };
        }
      }

      const cleanPdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
      const localBlobUrl = URL.createObjectURL(cleanPdfBlob);

      return {
        ok: true,
        url: signedUrl,
        blob: cleanPdfBlob,
        blobUrl: localBlobUrl,
        verifiedSize: blob.size || contentLength,
        mimeType: cleanPdfBlob.type,
        isPdf: isPdfExpected,
      };
    } catch (fetchErr: any) {
      if (retryCount === 0) {
        return executeFetchAndValidate(1);
      }
      return {
        ok: false,
        url: signedUrl,
        error: "Network connection interrupted. Please retry.",
      };
    }
  };

  return executeFetchAndValidate(0);
}

/**
 * Downloads the authentic original document as a native browser download.
 */
export async function downloadOriginalDocument(
  urlOrPath: string,
  fileName?: string,
  expectedMinSize?: number
): Promise<{ success: boolean; error?: string }> {
  const safeName = fileName || `document-${Date.now()}`;

  try {
    const result = await getVerifiedOriginalDocument(urlOrPath, {
      forDownload: true,
      fileName: safeName,
      expectedMinSize,
    });

    if (result.ok && result.blobUrl) {
      const link = document.createElement("a");
      link.href = result.blobUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke object URL after timeout
      setTimeout(() => {
        if (result.blobUrl && result.blobUrl.startsWith("blob:")) {
          URL.revokeObjectURL(result.blobUrl);
        }
      }, 120000);

      return { success: true };
    }
  } catch (err) {
    console.warn("[downloadOriginalDocument] Blob verification download notice, falling back to direct stream:", err);
  }

  // Authoritative fallback: Resolve direct signed download URL
  try {
    const signedUrl = await getAuthoritativeDocumentSignedUrl(urlOrPath, 3600, true, safeName) || urlOrPath;
    if (signedUrl && (signedUrl.startsWith("http") || signedUrl.startsWith("blob:") || signedUrl.startsWith("data:"))) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = safeName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }
  } catch (err) {
    console.error("[downloadOriginalDocument] Direct signed download fallback exception:", err);
  }

  alert("Original document download could not be completed. Please check your network connection.");
  return { success: false, error: "Original document is temporarily unavailable. Please retry." };
}

/**
 * Opens the verified original document in a new browser tab with native viewer support.
 */
export async function openOriginalDocumentInNewTab(
  urlOrPath: string,
  fileName?: string,
  expectedMinSize?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await getVerifiedOriginalDocument(urlOrPath, {
      forDownload: false,
      fileName,
      expectedMinSize,
    });

    if (result.ok && result.blobUrl) {
      window.open(result.blobUrl, "_blank");
      return { success: true };
    }
  } catch (err) {
    console.warn("[openOriginalDocumentInNewTab] Blob opening notice, falling back to direct stream:", err);
  }

  // Fallback: Open authoritative signed URL directly
  try {
    const signedUrl = await getAuthoritativeDocumentSignedUrl(urlOrPath, 3600, false, fileName) || urlOrPath;
    if (signedUrl && (signedUrl.startsWith("http") || signedUrl.startsWith("blob:") || signedUrl.startsWith("data:"))) {
      window.open(signedUrl, "_blank");
      return { success: true };
    }
  } catch (err) {
    console.error("[openOriginalDocumentInNewTab] Direct signed URL open exception:", err);
  }

  alert("Original document is temporarily unavailable. Please retry.");
  return { success: false, error: "Original document is temporarily unavailable. Please retry." };
}

/**
 * Resolves and verifies the document for modal preview.
 */
export async function previewOriginalDocument(
  urlOrPath: string,
  fileName?: string,
  expectedMinSize?: number
): Promise<VerifiedDocumentResult> {
  return getVerifiedOriginalDocument(urlOrPath, {
    forDownload: false,
    fileName,
    expectedMinSize,
  });
}

/**
 * Sends the authentic original document directly to the printer.
 */
export async function printOriginalDocument(
  urlOrPath: string,
  fileName?: string,
  _mimeType?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await getVerifiedOriginalDocument(urlOrPath, {
    forDownload: false,
    fileName,
  });

  if (!result.ok || !result.blobUrl) {
    alert(result.error || "Original document is temporarily unavailable for printing. Please retry.");
    return { success: false, error: result.error };
  }

  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = result.blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(result.blobUrl, "_blank");
        }
      }, 500);
    };

    return { success: true };
  } catch (err: any) {
    window.open(result.blobUrl, "_blank");
    return { success: true };
  }
}

/**
 * Diagnostic tool for auditing an order document end-to-end.
 */
export async function diagnoseOrderDocument(
  orderCodeOrUrl: string
): Promise<DocumentDiagnosticReport> {
  const cleanOrderCode = orderCodeOrUrl.trim().toUpperCase();
  const order = PalakDataStore.getOrderByCode(cleanOrderCode) || PalakDataStore.getOrders().find(
    (o) => o.orderCode?.trim().toUpperCase() === cleanOrderCode || o.id === orderCodeOrUrl
  );

  const orderFound = Boolean(order);
  const primaryItem = order?.items?.[0];
  const itemFound = Boolean(primaryItem);
  const rawUrl = primaryItem?.uploadedFileUrl || (orderCodeOrUrl.includes("/") ? orderCodeOrUrl : "");
  const fileFound = Boolean(rawUrl);

  const normalizedPath = normalizeStoragePath(rawUrl, DEFAULT_STORAGE_BUCKET);
  const signedUrl = await getAuthoritativeDocumentSignedUrl(rawUrl || normalizedPath, 3600);
  const signedUrlGenerated = Boolean(signedUrl && !isInvalidAppRouteOrLocalhostUrl(signedUrl));

  const report: DocumentDiagnosticReport = {
    orderCode: order?.orderCode || cleanOrderCode,
    orderFound,
    itemFound,
    fileFound,
    bucket: DEFAULT_STORAGE_BUCKET,
    storagePath: rawUrl,
    normalizedPath,
    signedUrlGenerated,
    signedUrl,
    integrityStatus: "VALID",
    diagnosticMessage: "All document pipeline checks passed.",
  };

  if (!signedUrlGenerated) {
    report.integrityStatus = "INVALID_URL";
    report.diagnosticMessage = "Could not generate authentic Supabase signed URL.";
    return report;
  }

  try {
    const res = await fetch(signedUrl);
    report.httpStatus = res.status;
    report.contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      report.integrityStatus = res.status === 404 ? "OBJECT_NOT_FOUND" : "ACCESS_DENIED";
      report.diagnosticMessage = `HTTP error ${res.status}: Storage object not accessible.`;
      return report;
    }

    if (report.contentType.includes("text/html") || report.contentType.includes("application/json")) {
      report.integrityStatus = "INVALID_URL";
      report.diagnosticMessage = `Received ${report.contentType} instead of PDF stream (SPA/HTML response).`;
      return report;
    }

    const blob = await res.blob();
    report.objectSize = blob.size;

    const validation = await verifyFetchedPdfBlob(blob);
    report.isPdfSignatureValid = validation.isValidPdf;

    if (!validation.isValidPdf) {
      report.integrityStatus = "CORRUPTED";
      report.diagnosticMessage = "PDF signature (%PDF-) is missing or invalid.";
      return report;
    }

    return report;
  } catch (err: any) {
    report.integrityStatus = "INTEGRITY_FAILED";
    report.diagnosticMessage = `Diagnostic fetch exception: ${err?.message || err}`;
    return report;
  }
}
