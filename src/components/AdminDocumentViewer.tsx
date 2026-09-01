import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Printer,
  Download,
  ExternalLink,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  ShieldCheck,
} from "lucide-react";
import {
  getFileCategory,
  resolveDocumentUrl,
  printDocumentFile,
  type FileCategory,
} from "../lib/documentUtils";
import {
  getVerifiedOriginalDocument,
  openOriginalDocumentInNewTab,
  downloadOriginalDocument,
} from "../lib/documents/originalDocumentResolver";
import { useScrollLock } from "../hooks/useScrollLock";
import { cn } from "../lib/utils";

export interface DocumentItem {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  orderCode?: string;
}

interface AdminFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
}

export const AdminFilePreviewModal: React.FC<AdminFilePreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isOpeningTab, setIsOpeningTab] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useScrollLock(isOpen && Boolean(doc));

  useEffect(() => {
    if (!isOpen || !doc) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, doc, onClose]);

  const category: FileCategory = doc
    ? getFileCategory(doc.name, doc.url, doc.mimeType)
    : "other";

  useEffect(() => {
    if (!isOpen || !doc) {
      setResolvedUrl("");
      setLoading(false);
      setError(null);
      return;
    }

    if (!doc.url) {
      setResolvedUrl("");
      setLoading(false);
      setError("Original document is temporarily unavailable. Please retry.");
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // If it's already a Data URL or Blob URL, load it immediately without async network calls
    if (doc.url.startsWith("data:") || doc.url.startsWith("blob:")) {
      setResolvedUrl(doc.url);
      setLoading(false);
      return;
    }

    let objectUrlToRevoke = "";

    // Use Authoritative Document Resolver
    if (category === "pdf") {
      getVerifiedOriginalDocument(doc.url, {
        fileName: doc.name,
        expectedMinSize: doc.size,
      })
        .then((result) => {
          if (!isMounted) return;
          if (result.ok && result.blobUrl) {
            objectUrlToRevoke = result.blobUrl;
            setResolvedUrl(result.blobUrl);
            setError(null);
          } else {
            setError(result.error || "The stored document failed integrity verification.");
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setError(err?.message || "Original document is temporarily unavailable. Please retry.");
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      // For non-PDF files: resolve signed URL directly (images, etc.)
      resolveDocumentUrl(doc.url, false, doc.name)
        .then((url) => {
          if (!isMounted) return;
          if (!url) {
            if (doc.url) {
              setResolvedUrl(doc.url);
            } else {
              setError("Unable to preview this document. The storage path could not be resolved.");
            }
          } else {
            setResolvedUrl(url);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Failed to resolve document preview:", err);
          if (doc.url) {
            setResolvedUrl(doc.url);
          } else {
            setError("Unable to preview this document. Please try again or download directly.");
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [isOpen, doc, onClose, retryCount, category]);

  if (!isOpen || !doc) return null;

  const handlePrint = async () => {
    if (!doc) return;
    setIsPrinting(true);
    try {
      if (category === "pdf" && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.focus();
          iframeRef.current.contentWindow.print();
        } catch {
          await printDocumentFile(resolvedUrl || doc.url, doc.name, doc.mimeType);
        }
      } else {
        await printDocumentFile(resolvedUrl || doc.url, doc.name, doc.mimeType);
      }
    } catch (err) {
      console.error("Print error:", err);
      if (resolvedUrl) {
        window.open(resolvedUrl, "_blank");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    setIsDownloading(true);
    try {
      await downloadOriginalDocument(doc.url, doc.name, doc.size);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenInTab = async () => {
    if (!doc) return;
    setIsOpeningTab(true);
    try {
      await openOriginalDocumentInNewTab(doc.url, doc.name, doc.size);
    } catch (err) {
      console.error("Open in new tab error:", err);
    } finally {
      setIsOpeningTab(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (!isOpen || !doc || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc ? doc.name : "Document Preview"}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in print:hidden"
    >
      <div 
        className="relative flex flex-col w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[92vh] h-full rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "p-2 rounded-lg text-white shrink-0",
              category === "pdf" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
              category === "image" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
              "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {category === "pdf" ? <FileText className="h-4 w-4" /> :
               category === "image" ? <ImageIcon className="h-4 w-4" /> :
               <FileCode className="h-4 w-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{doc.name || "Customer Document"}</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  category === "pdf" ? "bg-red-500/30 text-red-300" :
                  category === "image" ? "bg-blue-500/30 text-blue-300" :
                  "bg-slate-700 text-slate-300"
                )}>
                  {category.toUpperCase()}
                </span>
                {doc.orderCode && (
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    [{doc.orderCode}]
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {category === "pdf"
                  ? "Inline PDF Viewer — Direct Print & Customization Proofing"
                  : "Customer Attached Document Preview"}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Print Action (Supported for PDF and Images) */}
            {(category === "pdf" || category === "image") && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || !!error || isPrinting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Print directly without downloading to disk"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{isPrinting ? "Printing..." : category === "pdf" ? "Print PDF" : "Print"}</span>
              </button>
            )}

            {/* Download Button: Available for ALL file types including PDF */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !!error}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Download file to disk"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>

            {/* Open in New Tab (Inline Native Viewer) */}
            {doc.url && (
              <button
                type="button"
                onClick={handleOpenInTab}
                disabled={isOpeningTab}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                title="Open in new browser tab with full native viewer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isOpeningTab ? "Opening..." : "New Tab"}</span>
              </button>
            )}

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Security & Workflow Notification Banner */}
        <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {category === "pdf"
                ? "Secure Customer PDF • Byte-preserved original document."
                : "Secure Document Stream • Authorized Staff Session"}
            </span>
          </div>
          {category === "pdf" && (
            <span className="text-slate-500 hidden md:inline">
              Use Download button to save PDF to disk.
            </span>
          )}
        </div>

        {/* Modal Main Content / Viewer */}
        <div className="flex-1 bg-slate-900/5 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#123B70]" />
              <p className="text-xs font-semibold text-slate-600">Verifying authentic original document...</p>
            </div>
          ) : error ? (
            <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm border border-red-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Document Could Not Be Verified</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isDownloading ? "Downloading..." : "Download File"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : category === "pdf" ? (
            <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-inner border border-slate-300 flex flex-col relative">
              {resolvedUrl ? (
                <object
                  data={resolvedUrl}
                  type="application/pdf"
                  className="w-full flex-1 border-0"
                  title={doc.name}
                >
                  <iframe
                    ref={iframeRef}
                    src={resolvedUrl.startsWith("blob:") || resolvedUrl.startsWith("data:") ? resolvedUrl : `${resolvedUrl}#toolbar=1&navpanes=0`}
                    title={doc.name}
                    className="w-full flex-1 border-0"
                    onLoad={() => setLoading(false)}
                    onError={() => setError("Unable to preview this PDF inline. Please use 'Open in New Tab' or 'Download'.")}
                  >
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 gap-3">
                      <p>Inline PDF preview is not supported directly by your browser configuration.</p>
                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123B70] text-white font-semibold text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open PDF in New Tab</span>
                      </a>
                    </div>
                  </iframe>
                </object>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">PDF URL not loaded.</div>
              )}
            </div>
          ) : category === "image" ? (
            <div className="w-full h-full rounded-xl overflow-auto bg-slate-950/90 p-4 flex items-center justify-center shadow-inner">
              <img
                src={resolvedUrl}
                alt={doc.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                onError={() => setError("Unable to load image. Please download the image file directly.")}
              />
            </div>
          ) : (
            <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-blue-50 text-[#123B70]">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  This document format ({category.toUpperCase()}) is not supported for inline browser preview.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="truncate max-w-md">
            File: <strong>{doc.name}</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Format: {doc.mimeType || category.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface AdminFileActionsProps {
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  orderCode?: string;
  compact?: boolean;
  onOpenPreview?: (doc: DocumentItem) => void;
}

/**
 * File List Item with strict file-type-specific action buttons.
 *
 * Rules:
 * - PDF: [ Open PDF ] [ 🖨 Print ] (NO DOWNLOAD BUTTON)
 * - Image: [ Open ] [ Download ] [ 🖨 Print ]
 * - DOC/DOCX: [ Download ]
 * - Other: [ Download ]
 */
export const AdminFileActions: React.FC<AdminFileActionsProps> = ({
  fileName,
  fileUrl,
  mimeType,
  fileSize,
  orderCode,
  compact = false,
  onOpenPreview,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  if (!fileUrl && !fileName) {
    return <span className="text-[11px] text-slate-400 italic">No digital file uploaded</span>;
  }

  const name = fileName || "customer-file";
  const url = fileUrl || "";
  const category = getFileCategory(name, url, mimeType);

  const handleOpenInTab = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpening(true);
    try {
      const res = await openOriginalDocumentInNewTab(url, name, fileSize);
      if (!res.success && onOpenPreview) {
        onOpenPreview({ name, url, mimeType, size: fileSize, orderCode });
      }
    } catch (err) {
      console.error("Open in new tab error:", err);
      if (onOpenPreview) {
        onOpenPreview({ name, url, mimeType, size: fileSize, orderCode });
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleOpenPreviewModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenPreview) {
      onOpenPreview({ name, url, mimeType, size: fileSize, orderCode });
    } else {
      handleOpenInTab();
    }
  };

  const handleDirectPrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPrinting(true);
    try {
      await printDocumentFile(url, name, mimeType);
    } catch (err) {
      console.error("Print error:", err);
      if (onOpenPreview) {
        onOpenPreview({ name, url, mimeType, size: fileSize, orderCode });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDirectDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      await downloadOriginalDocument(url, name, fileSize);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedSize = fileSize
    ? fileSize > 1024 * 1024
      ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(fileSize / 1024)} KB`
    : null;

  if (compact) {
    const hasValidFile = Boolean(url && url.trim().length > 0);

    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn(
            "p-1.5 rounded-md shrink-0 flex items-center justify-center",
            category === "pdf" ? "bg-red-50 text-red-600" :
            category === "image" ? "bg-blue-50 text-blue-600" :
            category === "doc" ? "bg-amber-50 text-amber-600" :
            "bg-slate-100 text-slate-600"
          )}>
            {category === "pdf" ? <FileText className="h-3.5 w-3.5" /> :
             category === "image" ? <ImageIcon className="h-3.5 w-3.5" /> :
             <FileCode className="h-3.5 w-3.5" />}
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
            <span className="truncate font-semibold text-slate-800 text-[11px]" title={name}>
              {name}
            </span>
            <span className={cn(
              "px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap",
              category === "pdf" ? "bg-red-100 text-red-700" :
              category === "image" ? "bg-blue-100 text-blue-700" :
              category === "doc" ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            )}>
              {category.toUpperCase()}
            </span>
            {hasValidFile ? (
              <span className="shrink-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Attached
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ⚠️ Missing URL
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!hasValidFile ? (
            <span className="text-[10px] text-slate-400 italic">No stream</span>
          ) : category === "pdf" ? (
            <>
              <button
                type="button"
                onClick={handleOpenInTab}
                disabled={isOpening}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Open PDF directly in new tab"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{isOpening ? "..." : "Open"}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenPreviewModal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                title="Preview PDF inline"
              >
                <Eye className="h-3 w-3" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={handleDirectDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="h-3 w-3" />
                <span>{isDownloading ? "..." : "Download"}</span>
              </button>
              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={isPrinting}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Print PDF directly"
              >
                <Printer className="h-3 w-3" />
                <span>{isPrinting ? "..." : "Print"}</span>
              </button>
            </>
          ) : category === "image" ? (
            <>
              <button
                type="button"
                onClick={handleOpenPreviewModal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors cursor-pointer"
                title="Preview image"
              >
                <Eye className="h-3 w-3" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={handleDirectDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Download image"
              >
                <Download className="h-3 w-3" />
                <span>{isDownloading ? "..." : "Download"}</span>
              </button>
              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={isPrinting}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Print image"
              >
                <Printer className="h-3 w-3" />
                <span>{isPrinting ? "..." : "Print"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#123B70] hover:bg-[#0c274c] text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Download Document"
            >
              <Download className="h-3 w-3" />
              <span>{isDownloading ? "Downloading..." : "Download"}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full / Card Mode
  const hasValidFile = Boolean(url && url.trim().length > 0);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "p-2.5 rounded-xl shrink-0 flex items-center justify-center shadow-2xs",
          category === "pdf" ? "bg-red-100 text-red-700 border border-red-200" :
          category === "image" ? "bg-blue-100 text-blue-700 border border-blue-200" :
          category === "doc" ? "bg-amber-100 text-amber-700 border border-amber-200" :
          "bg-slate-200 text-slate-700 border border-slate-300"
        )}>
          {category === "pdf" ? <FileText className="h-5 w-5" /> :
           category === "image" ? <ImageIcon className="h-5 w-5" /> :
           <FileCode className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={name}>
            {name}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap",
              category === "pdf" ? "bg-red-100 text-red-800 border border-red-200" :
              category === "image" ? "bg-blue-100 text-blue-800 border border-blue-200" :
              category === "doc" ? "bg-amber-100 text-amber-800 border border-amber-200" :
              "bg-slate-200 text-slate-700 border border-slate-300"
            )}>
              {category.toUpperCase()}
            </span>

            {formattedSize && (
              <span className="text-[11px] font-semibold text-slate-500 shrink-0 whitespace-nowrap">
                {formattedSize}
              </span>
            )}

            {hasValidFile ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
                ✓ Original preserved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 whitespace-nowrap">
                ⚠️ Missing URL
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: If not a previewable stream or if other file format, SHOW ONLY DOWNLOAD OPTION */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 pt-1 md:pt-0">
        {!hasValidFile ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold border border-slate-200 cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unavailable</span>
          </button>
        ) : category === "pdf" ? (
          <>
            <button
              type="button"
              onClick={handleOpenInTab}
              disabled={isOpening}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Open PDF directly in new browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{isOpening ? "Opening..." : "Open PDF"}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPreviewModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Open inline preview modal"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Download PDF file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloading ? "..." : "Download"}</span>
            </button>
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Send directly to printer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isPrinting ? "Printing..." : "Print"}</span>
            </button>
          </>
        ) : category === "image" ? (
          <>
            <button
              type="button"
              onClick={handleOpenPreviewModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Open image preview and print dialog"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Download original image file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloading ? "..." : "Download"}</span>
            </button>
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Print image directly"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isPrinting ? "..." : "Print"}</span>
            </button>
          </>
        ) : (
          /* DOC / DOCX / Other / Fallback formats: SHOW ONLY DOWNLOAD OPTION */
          <button
            type="button"
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Download original file"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDownloading ? "Downloading..." : "Download"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

