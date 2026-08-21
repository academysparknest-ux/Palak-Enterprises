import { getSecureSignedUrl } from "./supabase/database";

export type FileCategory = "pdf" | "image" | "doc" | "other";

/**
 * Accurately determines the file category based on MIME type and/or file extension.
 * Correctly detects uppercase/lowercase extensions (.PDF, .pdf, .JPG, .PNG, etc.)
 */
export function getFileCategory(
  fileName?: string,
  fileUrl?: string,
  mimeType?: string
): FileCategory {
  // 1. Check verified MIME type if present
  if (mimeType) {
    const normalizedMime = mimeType.trim().toLowerCase();
    if (normalizedMime === "application/pdf") {
      return "pdf";
    }
    if (normalizedMime.startsWith("image/")) {
      return "image";
    }
    if (
      normalizedMime === "application/msword" ||
      normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalizedMime.includes("wordprocessingml") ||
      normalizedMime.includes("msword")
    ) {
      return "doc";
    }
  }

  // 2. Check Data URL or raw URL scheme signatures
  const candidate = (fileName || fileUrl || "").trim().toLowerCase();
  if (candidate.startsWith("data:application/pdf")) {
    return "pdf";
  }
  if (candidate.startsWith("data:image/")) {
    return "image";
  }
  if (candidate.startsWith("data:application/msword") || candidate.startsWith("data:application/vnd.openxmlformats-officedocument")) {
    return "doc";
  }

  // 3. Extract file extension safely (stripping query parameters and hash fragments)
  const cleanString = candidate.split("?")[0].split("#")[0];
  const parts = cleanString.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : "";

  if (ext === "pdf") {
    return "pdf";
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "tiff", "ico"].includes(ext || "")) {
    return "image";
  }
  if (["doc", "docx", "dot", "dotx", "rtf"].includes(ext || "")) {
    return "doc";
  }

  return "other";
}

/**
 * Resolves a storage path or raw URL to a signed browser-accessible URL.
 * - For PDF preview: creates an inline signed URL (download: false).
 * - For non-PDF download: creates an attachment signed URL (download: fileName).
 */
export async function resolveDocumentUrl(
  urlOrPath: string,
  forDownload: boolean = false,
  fileName?: string
): Promise<string> {
  if (!urlOrPath) return "";

  // Data URLs and Blob URLs are already local and directly usable
  if (urlOrPath.startsWith("data:") || urlOrPath.startsWith("blob:")) {
    return urlOrPath;
  }

  // External full HTTP/HTTPS URLs
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    // Detect Supabase Storage URLs (signed or public) and extract the path
    // so we generate a fresh signed URL instead of returning an expired one
    const supabaseStorageMatch = urlOrPath.match(
      /\/storage\/v1\/object\/(?:sign|public)\/customer-documents\/(.+?)(?:\?|$)/
    );
    if (supabaseStorageMatch && supabaseStorageMatch[1]) {
      const extractedPath = decodeURIComponent(supabaseStorageMatch[1]);
      try {
        const freshUrl = await getSecureSignedUrl(
          extractedPath,
          3600,
          forDownload ? { download: fileName || true } : { download: false }
        );
        if (freshUrl) return freshUrl;
      } catch (err) {
        console.error("Failed to re-sign extracted Supabase storage path:", err);
      }
    }
    return urlOrPath;
  }

  // Supabase Storage Path (e.g. "orders/PE-1234/123.pdf" or "customer-documents/...")
  try {
    const signedUrl = await getSecureSignedUrl(
      urlOrPath,
      3600, // 1 hour short-lived signed access for admin session
      forDownload ? { download: fileName || true } : { download: false }
    );
    return signedUrl || urlOrPath;
  } catch (err) {
    console.error("Error resolving secure signed document URL:", err);
    return urlOrPath;
  }
}

/**
 * Downloads any document file including PDFs.
 */
export async function downloadFile(
  urlOrPath: string,
  fileName?: string,
  _mimeType?: string
): Promise<void> {
  if (!urlOrPath) return;

  const safeName = fileName || `document-${Date.now()}`;
  const downloadUrl = await resolveDocumentUrl(urlOrPath, true, safeName);

  if (!downloadUrl) return;

  if (downloadUrl.startsWith("data:") || downloadUrl.startsWith("blob:")) {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = safeName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Converts a data URL (e.g. data:application/pdf;base64,...) into a local Blob URL
 * because modern browsers (Chrome/Edge) block direct top-level navigation to data: URLs.
 */
export function dataUrlToBlobUrl(dataUrl: string, defaultMime = "application/pdf"): string {
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : defaultMime;
    const isBase64 = parts[0].includes("base64");
    
    let byteArray: Uint8Array;
    if (isBase64) {
      const byteString = atob(parts[1]);
      byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }
    } else {
      const decoded = decodeURIComponent(parts[1]);
      byteArray = new TextEncoder().encode(decoded);
    }
    
    const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("dataUrlToBlobUrl conversion notice:", err);
    return dataUrl;
  }
}

/**
 * Opens any document (PDF, image, etc.) in a new browser tab with full native viewer support.
 * Automatically handles data: URLs, Supabase storage paths, signed URLs, and blobs.
 */
export async function openDocumentInNewTab(
  urlOrPath: string,
  fileName?: string,
  mimeType?: string
): Promise<void> {
  if (!urlOrPath) return;

  // 1. Data URLs: Convert to Blob URL so Chrome/Edge doesn't block top-level opening
  if (urlOrPath.startsWith("data:")) {
    const category = getFileCategory(fileName, urlOrPath, mimeType);
    const mime = mimeType || (category === "pdf" ? "application/pdf" : "image/png");
    const blobUrl = dataUrlToBlobUrl(urlOrPath, mime);
    window.open(blobUrl, "_blank");
    return;
  }

  // 2. Blob URLs
  if (urlOrPath.startsWith("blob:")) {
    window.open(urlOrPath, "_blank");
    return;
  }

  // 3. Supabase Storage Path or Remote URL
  try {
    const resolvedUrl = await resolveDocumentUrl(urlOrPath, false, fileName);
    if (!resolvedUrl) {
      window.open(urlOrPath, "_blank");
      return;
    }

    // If it's a PDF, try fetching as blob to provide instant inline opening without content-disposition issues
    const category = getFileCategory(fileName, urlOrPath, mimeType);
    if (category === "pdf") {
      try {
        const resp = await fetch(resolvedUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, "_blank");
          return;
        }
      } catch {
        // Fall back to opening signed URL directly
      }
    }

    window.open(resolvedUrl, "_blank");
  } catch (err) {
    console.error("openDocumentInNewTab error:", err);
    window.open(urlOrPath, "_blank");
  }
}

/** @deprecated Use downloadFile instead */
export const downloadNonPdfFile = downloadFile;

/**
 * Triggers clean in-browser printing for PDF or Image documents without saving to disk first.
 */
export async function printDocumentFile(
  urlOrPath: string,
  fileName?: string,
  mimeType?: string
): Promise<void> {
  if (!urlOrPath) return;

  const category = getFileCategory(fileName, urlOrPath, mimeType);
  const inlineUrl = await resolveDocumentUrl(urlOrPath, false, fileName);

  if (!inlineUrl) {
    throw new Error("Unable to preview this document for printing. Please try again or contact support.");
  }

  if (category === "image") {
    // Print Image directly via printable iframe window
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName || "Print Image"}</title>
            <style>
              @page { margin: 10mm; size: auto; }
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
              img { max-width: 100%; max-height: 95vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${inlineUrl}" alt="${fileName || "Image"}" onload="window.focus(); window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }

  // For PDF or other printable formats:
  // Create a dedicated hidden iframe to trigger the native browser print dialogue
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.src = inlineUrl;

    const cleanup = () => {
      setTimeout(() => {
        try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        } catch {
          // ignore
        }
        resolve();
      }, 2000);
    };

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // If cross-origin iframe print is restricted by browser security policies,
        // open the inline viewer in a popup/tab for direct print
        const win = window.open(inlineUrl, "_blank");
        win?.focus();
      }
      cleanup();
    };

    iframe.onerror = () => {
      cleanup();
      // Fallback: open inline tab
      const win = window.open(inlineUrl, "_blank");
      win?.focus();
    };

    document.body.appendChild(iframe);
  });
}
