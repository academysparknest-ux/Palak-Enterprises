/**
 * Canonical Server-Side Storage Path Security Validator
 *
 * Implements strict, multi-layer allowlist validation for temporary customer document paths.
 * Guarantees that document retention cleanup can NEVER touch or delete:
 * - Rendered invoice PDFs ('customer-documents/invoice-pdfs/*')
 * - ID card assets ('idcard-photos/*', 'idcard/*')
 * - Website content, photos, or business assets
 * - Parent directories, system paths, or arbitrary customer paths
 */

export const ALLOWED_RETENTION_BUCKET = "customer-documents";

export interface PathValidationResult {
  isValid: boolean;
  cleanPath: string;
  error?: string;
}

const FORBIDDEN_TOKENS = [
  "invoice-pdfs",
  "invoices",
  "idcard",
  "idcard-photos",
  "website",
  "website-photos",
  "website-assets",
  "business",
  "signatures",
  "logos",
  "templates",
  ".env",
  "schema.sql",
];

/**
 * Decodes URI percent-encoding iteratively (up to 3 levels) to unmask hidden traversal tokens
 * such as %252e%252e -> %2e%2e -> ..
 */
export function recursivelyDecodePath(rawPath: string): string {
  let decoded = rawPath;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

/**
 * Validates a storage path against the strict Quick Services temporary document allowlist.
 *
 * Requirements:
 * 1. Bucket must strictly be 'customer-documents'
 * 2. Path must not contain null bytes (\0), backslashes (\), or directory traversal (..)
 * 3. Path must not contain any forbidden directory tokens (invoice-pdfs, idcard, website, etc.)
 * 4. Allowed structures:
 *    - Structure A: 'orders/<orderCode>/<fileName>' (exactly 3 slash-separated segments)
 *      - orderCode: ^[a-zA-Z0-9_\-]+$
 *      - fileName:  ^[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]{2,5}$
 *    - Structure B: 'PHOTO-<timestamp>...<ext>' (legacy root photo, exactly 1 segment)
 *      - filename:  ^PHOTO-[0-9]{10,14}[a-zA-Z0-9_\-\.]*\.(jpg|jpeg|png|webp)$
 */
export function validateCanonicalQuickServicePath(
  bucket: string,
  rawPath: string
): PathValidationResult {
  // 1. Bucket Check
  if (!bucket || bucket.trim() !== ALLOWED_RETENTION_BUCKET) {
    return {
      isValid: false,
      cleanPath: "",
      error: `Forbidden bucket: "${bucket}". Retention cleanup is strictly restricted to "${ALLOWED_RETENTION_BUCKET}".`,
    };
  }

  if (!rawPath || typeof rawPath !== "string") {
    return {
      isValid: false,
      cleanPath: "",
      error: "Path is empty or not a string.",
    };
  }

  // 2. Normalize and strip prefix
  let normalized = rawPath.trim().normalize("NFC");
  normalized = normalized.replace(/\\/g, "/");

  // Strip bucket prefix if present
  if (normalized.startsWith("customer-documents/")) {
    normalized = normalized.substring("customer-documents/".length);
  }
  // Strip leading and trailing slashes
  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");

  // 3. Multi-layer decode check
  const fullyDecoded = recursivelyDecodePath(normalized);

  // 4. Disallow null bytes and traversal tokens
  if (
    normalized.includes("\0") ||
    fullyDecoded.includes("\0") ||
    normalized.includes("..") ||
    fullyDecoded.includes("..") ||
    normalized.includes("//") ||
    fullyDecoded.includes("//")
  ) {
    return {
      isValid: false,
      cleanPath: "",
      error: `Path traversal or invalid sequence detected in path: "${rawPath}".`,
    };
  }

  // 5. Explicit forbidden tokens check
  const lowerDecoded = fullyDecoded.toLowerCase();
  for (const token of FORBIDDEN_TOKENS) {
    if (lowerDecoded.includes(token)) {
      return {
        isValid: false,
        cleanPath: "",
        error: `Security violation: Path references protected directory or token "${token}".`,
      };
    }
  }

  // 6. Split into path segments
  const segments = normalized.split("/");

  // Structure A: orders/<cleanOrderCode>/<fileName>
  if (segments.length === 3 && segments[0] === "orders") {
    const orderCode = segments[1];
    const fileName = segments[2];

    const isOrderCodeValid = /^[a-zA-Z0-9_\-]+$/.test(orderCode);
    const isFileNameValid = /^[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]{2,5}$/.test(fileName);

    if (isOrderCodeValid && isFileNameValid) {
      return {
        isValid: true,
        cleanPath: `orders/${orderCode}/${fileName}`,
      };
    }

    return {
      isValid: false,
      cleanPath: "",
      error: `Invalid characters or structure in order document path: orders/${orderCode}/${fileName}.`,
    };
  }

  // Structure B: PHOTO-<timestamp>...<ext> (root legacy photo)
  if (segments.length === 1) {
    const fileName = segments[0];
    const isLegacyPhoto = /^PHOTO-[0-9]{10,14}[a-zA-Z0-9_\-\.]*\.(jpg|jpeg|png|webp)$/i.test(fileName);

    if (isLegacyPhoto) {
      return {
        isValid: true,
        cleanPath: fileName,
      };
    }
  }

  return {
    isValid: false,
    cleanPath: "",
    error: `Path does not match any authorized Quick Services document structure: "${rawPath}".`,
  };
}

/**
 * Checks if a path belongs to protected permanent records.
 */
export function isProtectedPermanentPath(rawPath: string): boolean {
  if (!rawPath || typeof rawPath !== "string") return false;
  const lower = rawPath.toLowerCase();
  return FORBIDDEN_TOKENS.some((token) => lower.includes(token));
}
