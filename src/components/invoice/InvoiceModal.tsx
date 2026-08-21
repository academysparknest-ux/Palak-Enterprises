import React, { useState, useEffect } from "react";
import type { StoredInvoice } from "../../lib/invoice/types";
import { InvoiceView } from "./InvoiceView";
import { downloadInvoicePDF, printInvoiceElement, getWhatsAppInvoiceShareLink } from "../../lib/invoice/pdfUtils";
import {
  X,
  Download,
  Printer,
  Share2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: StoredInvoice | null;
  isAdmin?: boolean;
  onRegenerate?: (reason?: string) => Promise<void>;
  loading?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  isAdmin = false,
  onRegenerate,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [regenerateReason, setRegenerateReason] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  // Isolate print view to ONLY this invoice while modal is open
  useEffect(() => {
    if (isOpen && invoice) {
      document.body.classList.add("palak-invoice-print-active");
      return () => {
        document.body.classList.remove("palak-invoice-print-active");
      };
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const targetInvoiceId = `invoice-modal-content-${invoice.orderCode}`;

  const handleDownloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await downloadInvoicePDF(invoice, targetInvoiceId);
      if (!res.success) {
        setDownloadError(res.error || "Failed to generate PDF. Please try browser print instead.");
      }
    } catch (e: any) {
      console.error("PDF download error:", e);
      setDownloadError(e?.message || "An unexpected error occurred generating PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    printInvoiceElement(invoice, targetInvoiceId);
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate(regenerateReason || undefined);
      setConfirmRegenerateOpen(false);
      setRegenerateReason("");
    } catch (e) {
      console.error("Regenerate error:", e);
    } finally {
      setRegenerating(false);
    }
  };

  const copyShareLink = async () => {
    const origin = typeof window !== "undefined" && !window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://palakenterprises.in";
    const link = `${origin}/track-order?code=${encodeURIComponent(invoice.orderCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 invoice-modal-overlay print:p-0 print:bg-white print:static print:z-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* ─── Top Modal Action Bar (Hidden on Print) ─────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Official Bill / Tax Invoice
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-900/70 border border-blue-400/30 text-blue-200 font-bold">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Order Ref: <span className="font-mono font-bold text-slate-300">{invoice.orderCode}</span> •{" "}
                {invoice.customerSnapshot.name || "Customer"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Primary Controls Toolbar (Hidden on Print) ─────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className={cn("h-3.5 w-3.5", downloading && "animate-bounce")} />
              <span>{downloading ? "Preparing A4 PDF..." : "Download Bill / PDF"}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Bill</span>
            </button>

            {/* Send WhatsApp */}
            <a
              href={getWhatsAppInvoiceShareLink(invoice)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share WhatsApp</span>
            </a>

            {/* Copy Tracking Link */}
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
            </button>
          </div>

          {/* Admin Regeneration Button */}
          {isAdmin && onRegenerate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmRegenerateOpen(true)}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Regenerate bill snapshot from latest order values"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
                <span>Regenerate Bill</span>
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {downloadError && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-rose-800 text-xs flex items-center justify-between print:hidden">
            <span>{downloadError}</span>
            <button
              onClick={() => setDownloadError(null)}
              className="text-rose-600 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ─── Confirmation Modal for Regenerate ───────────────────────────── */}
        {confirmRegenerateOpen && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 space-y-3 animate-in slide-in-from-top-2 print:hidden">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-amber-900">
                  Confirm Authoritative Bill Regeneration
                </h4>
                <p className="text-[11px] text-amber-800 leading-snug">
                  This will re-snapshot line items, pricing, discounts, and customer details from the current order record.
                  The invoice number (<strong>{invoice.invoiceNumber}</strong>) and original creation date will be preserved. An audit trail record will be logged.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={regenerateReason}
                onChange={(e) => setRegenerateReason(e.target.value)}
                placeholder="Reason for regeneration (e.g. Revised item quantity, discount applied)"
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400"
              />
              <div className="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmRegenerateOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {regenerating ? "Regenerating..." : "Confirm & Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Scrollable Invoice View Area ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none">
            <InvoiceView
              invoice={invoice}
              id={targetInvoiceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
