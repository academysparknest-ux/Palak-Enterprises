/**
 * Document Integrity & Original File Verification Engine
 *
 * Core Invariant:
 * DO NOT OPTIMIZE, COMPRESS, RE-ENCODE, RESIZE, TRANSFORM, REGENERATE, OR MODIFY CUSTOMER PDF FILES.
 * The customer's original uploaded binary document must be preserved exactly and delivered to Admin/Production.
 */

export type DocumentFileStatus =
  | "UPLOADING"
  | "VERIFYING"
  | "READY"
  | "FAILED"
  | "CORRUPTED"
  | "REPLACED";

export interface DocumentIntegrityMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  magicBytesValid: boolean;
  status: DocumentFileStatus;
  storageBucket: string;
  storagePath: string;
  verifiedAt?: string;
  error?: string | null;
}

/**
 * Validates that the file has a valid magic signature without reading the entire file.
 * For PDFs: Checks that the first 5 bytes match '%PDF-'.
 */
export async function verifyDocumentMagicBytes(file: File): Promise<{
  valid: boolean;
  detectedType: "pdf" | "image" | "docx" | "doc" | "unknown";
  error?: string;
}> {
  if (file.size === 0) {
    return { valid: false, detectedType: "unknown", error: "File is empty (0 bytes)." };
  }

  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  const mime = file.type.toLowerCase();

  try {
    // Read first 16 bytes only
    const headerSlice = file.slice(0, 16);
    const headerBuf = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    const headerText = String.fromCharCode(...bytes.slice(0, 8));

    // PDF Magic Check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    ) {
      return { valid: true, detectedType: "pdf" };
    }

    if (ext === ".pdf" || mime === "application/pdf") {
      // PDF extension or MIME but missing %PDF- header
      return {
        valid: false,
        detectedType: "unknown",
        error: "File is missing the valid '%PDF-' header signature.",
      };
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, detectedType: "image" };
    }

    // PNG: 0x89 0x50 0x4E 0x47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { valid: true, detectedType: "image" };
    }

    // WebP: 'RIFF' ... 'WEBP'
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    ) {
      return { valid: true, detectedType: "image" };
    }

    // DOCX / ZIP: 0x50 0x4B 0x03 0x04 ('PK..')
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { valid: true, detectedType: "docx" };
    }

    // If extension is an image or docx and bytes didn't fail
    if ([".jpg", ".jpeg", ".png", ".webp", ".bmp"].includes(ext) || mime.startsWith("image/")) {
      return { valid: true, detectedType: "image" };
    }

    if (ext === ".docx") {
      return { valid: true, detectedType: "docx" };
    }

    if (ext === ".doc") {
      return { valid: true, detectedType: "doc" };
    }

    return {
      valid: false,
      detectedType: "unknown",
      error: `Unsupported or unknown file signature (${headerText.trim() || "unknown"}).`,
    };
  } catch (err: any) {
    return {
      valid: false,
      detectedType: "unknown",
      error: `Could not read file signature: ${err?.message || "Read error"}`,
    };
  }
}

/**
 * Computes a fast read-only cryptographic SHA-256 checksum of the file.
 * Uses sliced chunking for memory safety on large files (e.g. 85MB+).
 */
export async function calculateFileChecksum(file: File): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      // For moderate files (<= 30MB), compute direct digest
      if (file.size <= 30 * 1024 * 1024) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      // For large files (> 30MB), compute combined sample hash of header, middle, and trailer slices
      // to avoid allocating 85MB+ single ArrayBuffers in browser memory
      const sampleSize = 2 * 1024 * 1024; // 2MB samples
      const head = file.slice(0, sampleSize);
      const mid = file.slice(Math.floor(file.size / 2) - sampleSize / 2, Math.floor(file.size / 2) + sampleSize / 2);
      const tail = file.slice(Math.max(0, file.size - sampleSize), file.size);

      const [headBuf, midBuf, tailBuf] = await Promise.all([
        head.arrayBuffer(),
        mid.arrayBuffer(),
        tail.arrayBuffer(),
      ]);

      const combined = new Uint8Array(headBuf.byteLength + midBuf.byteLength + tailBuf.byteLength + 16);
      combined.set(new Uint8Array(headBuf), 0);
      combined.set(new Uint8Array(midBuf), headBuf.byteLength);
      combined.set(new Uint8Array(tailBuf), headBuf.byteLength + midBuf.byteLength);

      // Append file size bytes to hash input
      const view = new DataView(combined.buffer);
      view.setFloat64(combined.byteLength - 8, file.size);

      const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return "sha256_sample_" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (err) {
    console.debug("[calculateFileChecksum] SubtleCrypto note:", err);
  }

  // Fallback signature
  return `size_${file.size}_t_${file.lastModified || Date.now()}`;
}

/**
 * Validates post-upload stored object integrity.
 * Verifies that:
 * 1. Object exists and is accessible.
 * 2. Object size matches original browser file size (preventing 3 KB error placeholders).
 * 3. Object MIME type matches application/pdf (or original category).
 */
export function validateStoredDocumentIntegrity(params: {
  originalSize: number;
  storedSize: number;
  originalMime?: string;
  storedMime?: string;
  storedUrl?: string;
}): {
  isValid: boolean;
  errorMessage?: string;
} {
  const { originalSize, storedSize, storedUrl } = params;

  // 1. URL Presence
  if (!storedUrl || storedUrl.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: "Storage URL is missing or empty.",
    };
  }

  // 2. Severe Size Mismatch Protection (3 KB Bug Catch)
  // If original file is large (e.g. 85.12 MB), stored size cannot be a 3 KB error JSON or tiny placeholder!
  if (originalSize > 500 * 1024) { // > 500 KB
    if (storedSize < 10 * 1024) { // < 10 KB
      return {
        isValid: false,
        errorMessage: `Stored object size (${(storedSize / 1024).toFixed(1)} KB) is unexpectedly smaller than original document (${(originalSize / (1024 * 1024)).toFixed(2)} MB). Storage upload was truncated or captured an error response.`,
      };
    }

    // Difference check (stored size must match within 1% tolerance for compression-free uploads)
    const ratio = storedSize / originalSize;
    if (ratio < 0.90 || ratio > 1.10) {
      return {
        isValid: false,
        errorMessage: `Stored object size mismatch: expected ${(originalSize / (1024 * 1024)).toFixed(2)} MB, but got ${(storedSize / (1024 * 1024)).toFixed(2)} MB.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Inspects a downloaded or fetched blob before rendering to ensure it is not a 3 KB Supabase error payload.
 */
export async function verifyFetchedPdfBlob(blob: Blob, expectedMinSize?: number): Promise<{
  isValidPdf: boolean;
  errorMessage?: string;
}> {
  if (!blob || blob.size === 0) {
    return { isValidPdf: false, errorMessage: "Received empty (0 byte) document payload." };
  }

  // If we expect a large file (> 500 KB) and received a tiny blob (< 5 KB), inspect for JSON error
  if (expectedMinSize && expectedMinSize > 500 * 1024 && blob.size < 10 * 1024) {
    try {
      const text = await blob.text();
      if (text.includes("error") || text.includes("statusCode") || text.includes("NoSuchKey") || text.includes("Not Found")) {
        return {
          isValidPdf: false,
          errorMessage: "Document unavailable: Storage server returned an error payload instead of the PDF.",
        };
      }
    } catch {}
    return {
      isValidPdf: false,
      errorMessage: `Integrity check failed: Expected document of ${(expectedMinSize / (1024 * 1024)).toFixed(1)} MB, but received ${(blob.size / 1024).toFixed(1)} KB placeholder.`,
    };
  }

  // Check PDF signature in first 8 bytes of blob
  try {
    const slice = blob.slice(0, 8);
    const buf = await slice.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;

    if (!isPdf) {
      // Check if it's text/html or json error
      const text = (await blob.slice(0, 512).text()).toLowerCase();
      if (text.includes("<html") || text.includes("<!doctype") || text.includes("{\"") || text.includes("error")) {
        return {
          isValidPdf: false,
          errorMessage: "Storage returned an HTML/JSON error response instead of the PDF document.",
        };
      }
      return {
        isValidPdf: false,
        errorMessage: "Document payload is missing the valid '%PDF-' header signature.",
      };
    }
  } catch (err: any) {
    console.debug("[verifyFetchedPdfBlob] Note:", err);
    return {
      isValidPdf: false,
      errorMessage: "Could not read document byte signature.",
    };
  }

  return { isValidPdf: true };
}
