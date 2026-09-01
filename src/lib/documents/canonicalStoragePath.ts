/**
 * Canonical Document Storage Path Builder & Resolver
 *
 * Enforces strict single source of truth for Supabase Storage paths across:
 * - Customer Upload Engine
 * - Database order_files and orders tables
 * - Signed URL Generation
 * - Admin Preview, Open PDF, Download, and Production Print
 *
 * CRITICAL INVARIANT:
 * Directory slashes ('/') MUST NEVER be encoded into '%2F'.
 * Path segments are encoded individually only when building HTTP REST endpoints.
 */

export const DEFAULT_STORAGE_BUCKET = "customer-documents";

/**
 * Sanitizes a filename while preserving its extension safely.
 */
export function sanitizeDocumentFilename(rawFilename: string): { safeName: string; extension: string } {
  if (!rawFilename || typeof rawFilename !== "string") {
    return { safeName: "document", extension: "pdf" };
  }

  const parts = rawFilename.split(".");
  const rawExt = parts.length > 1 ? (parts.pop() || "pdf") : "pdf";
  const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "pdf";

  const rawBase = parts.join(".");
  const safeBase = rawBase
    .replace(/[^a-zA-Z0-9_\- \(\)\[\]\.]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100) || "document";

  return {
    safeName: `${safeBase}.${safeExt}`,
    extension: safeExt,
  };
}

/**
 * Builds the canonical storage path for an order document.
 * Format: orders/{cleanOrderCode}/{timestamp}_{uniqueId}.{extension}
 */
export function buildDocumentStoragePath(
  orderCodeOrSubId: string,
  originalFilename: string,
  customTimestamp?: number,
  customUniqueId?: string
): string {
  const cleanOrderCode = (orderCodeOrSubId || "ORDER")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50) || `ORDER_${Date.now()}`;

  const { extension } = sanitizeDocumentFilename(originalFilename);
  const ts = customTimestamp || Date.now();
  const uid = customUniqueId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

  return `orders/${cleanOrderCode}/${ts}_${uid}.${extension}`;
}

/**
 * Builds the exact REST upload URL for Supabase Storage,
 * encoding individual path segments while preserving forward slashes.
 */
export function getStorageUploadEndpoint(
  supabaseUrl: string,
  bucketName: string,
  canonicalPath: string
): string {
  const cleanBase = supabaseUrl.replace(/\/+$/, "");
  const cleanBucket = bucketName.replace(/^\/+|\/+$/g, "");
  const encodedSegments = canonicalPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${cleanBase}/storage/v1/object/${cleanBucket}/${encodedSegments}`;
}

/**
 * Checks if a candidate URL or path is an invalid localhost/SPA application route
 * (which would mistakenly return the Vite/React index.html rather than a file stream).
 */
export function isInvalidAppRouteOrLocalhostUrl(urlOrPath: string): boolean {
  if (!urlOrPath || typeof urlOrPath !== "string") return false;
  const lower = urlOrPath.toLowerCase().trim();

  // Blob and data URLs are legitimate local streams
  if (lower.startsWith("blob:") || lower.startsWith("data:")) return false;

  // Detect localhost, 127.0.0.1, or Vite dev server endpoints
  if (
    lower.includes("localhost:") ||
    lower.includes("127.0.0.1:") ||
    lower.includes("/@vite") ||
    lower.includes("@react-refresh") ||
    lower.includes("index.html")
  ) {
    return true;
  }

  // Detect SPA frontend routes mistakenly used as storage paths
  if (
    lower.startsWith("/online-services") ||
    lower.startsWith("/admin") ||
    lower.startsWith("/services") ||
    lower.startsWith("/products") ||
    lower.startsWith("/cart") ||
    lower.startsWith("/checkout")
  ) {
    return true;
  }

  return false;
}

/**
 * Normalizes any storage path, legacy path, full Supabase URL, or encoded path
 * into a clean, canonical relative storage key (e.g. 'orders/PE-123/169000_doc.pdf').
 */
export function normalizeStoragePath(
  urlOrPath: string,
  bucketName: string = DEFAULT_STORAGE_BUCKET
): string {
  if (!urlOrPath || typeof urlOrPath !== "string") return "";

  // Data URLs and Blobs are not remote storage paths
  if (urlOrPath.startsWith("data:") || urlOrPath.startsWith("blob:")) {
    return urlOrPath;
  }

  let cleaned = urlOrPath.trim();

  // 1. Double URL-decode in case of '%252F' or '%2F' encoded slashes
  try {
    if (cleaned.includes("%2F") || cleaned.includes("%2f")) {
      cleaned = decodeURIComponent(cleaned);
    }
    if (cleaned.includes("%2F") || cleaned.includes("%2f")) {
      cleaned = decodeURIComponent(cleaned);
    }
  } catch {}

  // 2. Strip query parameters and hashes
  cleaned = cleaned.split("?")[0].split("#")[0];

  // 3. If full Supabase URL, extract path after bucket
  const bucketRegex = new RegExp(`/storage/v1/object/(?:sign|public)/${bucketName}/(.+)`, "i");
  const match = cleaned.match(bucketRegex);
  if (match && match[1]) {
    try {
      cleaned = decodeURIComponent(match[1]);
    } catch {
      cleaned = match[1];
    }
  }

  // 4. Strip domain or origin if present (e.g. http://localhost:5173/orders/...)
  cleaned = cleaned.replace(/^https?:\/\/[^\/]+\//i, "");

  // 5. Strip bucket prefix if present
  const prefixRegex = new RegExp(`^${bucketName}/`, "i");
  cleaned = cleaned.replace(prefixRegex, "");

  // 6. Strip leading slashes
  cleaned = cleaned.replace(/^\/+/, "");

  return cleaned;
}

/**
 * Extracts the canonical relative storage path from any full URL or relative path string.
 * Strips domain, /storage/v1/object/(public|sign)/bucket/, and query parameters.
 */
export function extractCanonicalStoragePath(
  urlOrPath: string,
  bucketName: string = DEFAULT_STORAGE_BUCKET
): string {
  return normalizeStoragePath(urlOrPath, bucketName);
}

/**
 * Validates whether a storage path complies with canonical structure.
 */
export function isValidCanonicalStoragePath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  const canonical = extractCanonicalStoragePath(path);
  // Must be in orders/ folder, contain no illegal characters, and have a valid extension
  return /^orders\/[a-zA-Z0-9_-]+\/[0-9]+_[a-zA-Z0-9_-]+\.[a-z0-9]+$/i.test(canonical);
}
