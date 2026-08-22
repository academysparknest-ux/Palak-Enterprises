import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Edit3,
} from "lucide-react";
import type { StoredOrder } from "../../lib/storage/store";
import {
  type PrintJob,
  type PrintJobStatus,
  type DocumentPrintConfig,
  type OrderPrintSnapshot,
  type AdminPrintOverride,
} from "../../types/printJob";
import {
  getPrintJobByOrderCode,
  createOrUpdatePrintJob,
  updatePrintJobStatus,
  addPrintJobOverride,
} from "../../lib/supabase/database";
import { printDocumentFile, downloadFile } from "../../lib/documentUtils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { cn } from "../../lib/utils";

interface AdminPrintCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: StoredOrder | null;
  adminName?: string;
  onOrderUpdated?: () => void;
}

const STATUS_CONFIG: Record<
  PrintJobStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: { label: "Pending Print", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  READY_TO_PRINT: { label: "Ready to Print", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PRINTING: { label: "Printing in Progress", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  PRINTED: { label: "Printed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  QUALITY_CHECK: { label: "Quality Check", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  READY: { label: "Ready for Pickup", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  COMPLETED: { label: "Completed & Delivered", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  FAILED: { label: "Failed / Error", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" },
};

export const AdminPrintCenterModal: React.FC<AdminPrintCenterModalProps> = ({
  isOpen,
  onClose,
  order,
  adminName = "Admin Staff",
  onOrderUpdated,
}) => {
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [_loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"specs" | "overrides" | "audit">("specs");
  const [isPrintingAll, setIsPrintingAll] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  // Override Form Modal State
  const [overrideModalDoc, setOverrideModalDoc] = useState<DocumentPrintConfig | null>(null);
  const [overrideField, setOverrideField] = useState<string>("paperSize");
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [overrideSubmitting, setOverrideSubmitting] = useState<boolean>(false);

  useScrollLock(isOpen);
  useScrollLock(Boolean(overrideModalDoc));

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (overrideModalDoc) {
          setOverrideModalDoc(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, overrideModalDoc, onClose]);

  // Fetch or initialize PrintJob from order snapshot
  useEffect(() => {
    if (!isOpen || !order) {
      setPrintJob(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPrintJobByOrderCode(order.orderCode).then((job) => {
      if (!isMounted) return;
      if (job) {
        setPrintJob(job);
        setLoading(false);
      } else {
        // Synthesize print job from order snapshot or items
        const snapshot: OrderPrintSnapshot | undefined = order.printSnapshot;
        const docs: DocumentPrintConfig[] = snapshot?.documents || [];

        createOrUpdatePrintJob({
          orderId: order.id,
          orderCode: order.orderCode,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          status: "PENDING",
          items: docs.map((d) => ({
            id: d.documentId || `doc_${Date.now()}`,
            documentId: d.documentId || `doc_${Date.now()}`,
            fileName: d.fileName,
            storagePath: d.storagePath || "",
            fileUrl: d.fileUrl || "",
            pageCount: d.selectedPageCount,
            colorMode: d.colorMode,
            colorPages: d.colorPageCount,
            bwPages: d.bwPageCount,
            copies: d.copies,
            paperSize: d.paperSize,
            paperType: d.paperType,
            gsm: d.gsm,
            orientation: d.orientation,
            sides: d.sides,
            pagesPerSheet: d.pagesPerSheet,
            scaling: d.scaling,
            binding: d.binding,
            frontCover: d.frontCover,
            backCover: d.backCover,
            finishing: d.finishing || {},
            status: "QUEUED",
          })),
          createdByName: adminName,
        }).then((created) => {
          if (isMounted) {
            setPrintJob(created);
            setLoading(false);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, order, adminName]);

  if (!isOpen || !order) return null;

  const snapshot: OrderPrintSnapshot | undefined = order.printSnapshot;
  const documents: DocumentPrintConfig[] = snapshot?.documents || [];

  // Handle status transition
  const handleStatusChange = async (newStatus: PrintJobStatus, notes?: string) => {
    if (!printJob) return;
    setLoading(true);
    await updatePrintJobStatus(order.orderCode, newStatus, adminName, notes);
    const updated = await getPrintJobByOrderCode(order.orderCode);
    setPrintJob(updated);
    setLoading(false);
    if (onOrderUpdated) onOrderUpdated();
  };

  // Handle "PRINT ALL"
  const handlePrintAll = async () => {
    if (documents.length === 0) {
      alert("No documents attached to this order.");
      return;
    }

    setIsPrintingAll(true);
    setPrintFeedback("Preparing documents for printing...");

    try {
      // Mark as printing
      await handleStatusChange("PRINTING", `Operator ${adminName} triggered PRINT ALL for ${documents.length} document(s)`);

      const failedDocs: { name: string; error: string }[] = [];
      let printedCount = 0;

      // Sequentially print/open documents
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setPrintFeedback(`Dispatching document ${i + 1} of ${documents.length}: ${doc.fileName}...`);
        
        const urlToUse = doc.fileUrl || doc.storagePath;
        if (!urlToUse) {
          failedDocs.push({ name: doc.fileName, error: "Missing document file URL" });
          continue;
        }

        try {
          await printDocumentFile(urlToUse, doc.fileName, doc.mimeType);
          printedCount++;
        } catch (e: any) {
          console.warn(`Print failure for ${doc.fileName}:`, e);
          try {
            window.open(urlToUse, "_blank");
            printedCount++;
          } catch (winErr: any) {
            failedDocs.push({ name: doc.fileName, error: winErr?.message || e?.message || "Failed to open document stream" });
          }
        }
      }

      if (failedDocs.length === 0) {
        setPrintFeedback(`✓ All ${documents.length} document(s) sent to physical printer queue.`);
        await handleStatusChange("PRINTED", `All ${documents.length} document(s) printed by ${adminName}`);
      } else {
        const failureDetails = failedDocs.map((f) => `${f.name} (${f.error})`).join(", ");
        setPrintFeedback(`⚠️ Printed ${printedCount} of ${documents.length} documents. ${failedDocs.length} failed: ${failureDetails}`);
        await handleStatusChange("FAILED", `Print failed for ${failedDocs.length} file(s): ${failureDetails}`);
      }
    } catch (err: any) {
      setPrintFeedback(`Error while printing: ${err.message}`);
      await handleStatusChange("FAILED", `Print execution aborted: ${err.message}`);
    } finally {
      setIsPrintingAll(false);
    }
  };

  // Submit Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = overrideReason.trim();
    if (!overrideModalDoc || cleanReason.length < 3) {
      alert("Please provide a valid reason (at least 3 characters) for the override.");
      return;
    }

    setOverrideSubmitting(true);
    const reqVal = (overrideModalDoc as any)[overrideField];

    const overrideObj: AdminPrintOverride = {
      id: `ovr_${Date.now()}`,
      documentId: overrideModalDoc.documentId,
      fileName: overrideModalDoc.fileName,
      field: overrideField,
      requestedValue: reqVal,
      actualValue: overrideValue,
      changedBy: adminName,
      changedAt: new Date().toISOString(),
      reason: cleanReason,
    };

    const res = await addPrintJobOverride(order.orderCode, overrideObj, adminName);
    if (res.success) {
      const updated = await getPrintJobByOrderCode(order.orderCode);
      setPrintJob(updated);
      setOverrideModalDoc(null);
      setOverrideReason("");
      setOverrideValue("");
      if (onOrderUpdated) onOrderUpdated();
    } else {
      alert(res.error || "Failed to record override.");
    }
    setOverrideSubmitting(false);
  };

  const currentStatus = printJob?.status || "PENDING";
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-2.5 sm:p-4 md:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Print Center"
    >
      <div 
        className="flex flex-col w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B70] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white font-bold">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Admin Print Center</h2>
                <span className="rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-xs font-bold font-mono">
                  {order.orderCode}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Customer: <span className="font-bold text-white">{order.customerName}</span> ({order.customerPhone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold border",
                statusInfo.bg,
                statusInfo.text,
                statusInfo.border
              )}
            >
              {statusInfo.label}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
          {/* Quick Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("specs")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeTab === "specs"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              📄 Document Specifications ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab("overrides")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeTab === "overrides"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              ⚙️ Admin Overrides ({printJob?.overrides?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeTab === "audit"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              📋 Audit Trail ({printJob?.auditLogs?.length || 0})
            </button>
          </div>

          {/* Primary Action Button: PRINT ALL */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAll}
              disabled={isPrintingAll || documents.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{isPrintingAll ? "Printing Documents..." : "🖨️ PRINT ALL DOCUMENTS"}</span>
            </button>
          </div>
        </div>

        {printFeedback && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-xs font-bold text-[#123B70] flex items-center gap-2 animate-in fade-in">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{printFeedback}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          {/* Tab 1: Document Specifications */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              {/* Order Level Overview Card */}
              {snapshot && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Documents</span>
                    <span className="font-extrabold text-slate-900 text-sm">{snapshot.totalDocuments} file(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Printed Pages</span>
                    <span className="font-extrabold text-slate-900 text-sm">{snapshot.totalPrintedPages} pages</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">B/W vs Color</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ⚫ {snapshot.totalBwPages} / 🌈 {snapshot.totalColorPages}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Physical Sheets</span>
                    <span className="font-extrabold text-slate-900 text-sm">📑 {snapshot.totalPhysicalSheets} sheets</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Order Amount</span>
                    <span className="font-extrabold text-emerald-700 text-sm">₹{snapshot.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Document Breakdown List */}
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc, idx) => {
                    const overridesForDoc = printJob?.overrides?.filter((o) => o.documentId === doc.documentId) || [];

                    return (
                      <div
                        key={doc.documentId || idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                      >
                        {/* Doc Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#123B70] text-xs font-bold">
                              #{idx + 1}
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-md">
                              {doc.fileName}
                            </h3>
                            <span className="text-xs text-slate-400 font-normal">
                              ({(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.totalPages} doc pages)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.fileUrl && (
                              <button
                                onClick={() => printDocumentFile(doc.fileUrl!, doc.fileName, doc.mimeType)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#123B70] hover:bg-blue-100 text-xs font-bold transition-colors"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print Single</span>
                              </button>
                            )}
                            {doc.fileUrl && (
                              <button
                                onClick={() => downloadFile(doc.fileUrl!, doc.fileName)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setOverrideModalDoc(doc);
                                setOverrideField("paperSize");
                                setOverrideValue(doc.paperSize);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Override Settings</span>
                            </button>
                          </div>
                        </div>

                        {/* Specs Matrix */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Color Mode</span>
                            <span className="font-extrabold text-slate-900 capitalize">
                              {doc.colorMode === "bw"
                                ? "⚫ Black & White"
                                : doc.colorMode === "color"
                                ? "🌈 Full Color"
                                : `🎨 Mixed (${doc.colorPageCount} Color, ${doc.bwPageCount} B/W)`}
                            </span>
                            {doc.colorMode === "mixed" && doc.colorPagesRange && (
                              <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                                Color pages: {doc.colorPagesRange}
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Sides & Layout</span>
                            <span className="font-extrabold text-slate-900 capitalize">
                              {doc.sides === "single"
                                ? "1️⃣ Single-Sided"
                                : doc.sides === "double_long"
                                ? "🔄 Double (Long Edge)"
                                : "🔃 Double (Short Edge)"}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {doc.pagesPerSheet || 1} page(s) per sheet side
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Paper & Weight</span>
                            <span className="font-extrabold text-slate-900 uppercase">
                              {doc.paperSize} • {doc.gsm} GSM
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5 capitalize">
                              {doc.paperType} Paper • {doc.orientation}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Copies & Sheets</span>
                            <span className="font-extrabold text-slate-900">
                              {doc.copies} Copy/Copies
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                              📑 {doc.totalPhysicalSheets} sheets total
                            </span>
                          </div>
                        </div>

                        {/* Finishing & Covers */}
                        {(doc.binding !== "none" ||
                          doc.frontCover !== "none" ||
                          doc.backCover !== "none" ||
                          doc.finishing?.lamination ||
                          doc.finishing?.holePunching ||
                          doc.finishing?.bookletMode) && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-bold text-[11px]">FINISHING:</span>
                            {doc.binding !== "none" && (
                              <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-bold capitalize">
                                🔗 {doc.binding} Binding
                              </span>
                            )}
                            {doc.frontCover !== "none" && (
                              <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-bold capitalize">
                                📘 Front: {doc.frontCover}
                              </span>
                            )}
                            {doc.backCover !== "none" && (
                              <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-bold capitalize">
                                📙 Back: {doc.backCover}
                              </span>
                            )}
                            {doc.finishing?.lamination && (
                              <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-bold">
                                ✨ Thermal Lamination
                              </span>
                            )}
                            {doc.finishing?.holePunching && (
                              <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 font-bold">
                                ⚪ Hole Punching
                              </span>
                            )}
                            {doc.finishing?.bookletMode && (
                              <span className="rounded-md bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 font-bold">
                                📖 Booklet Fold
                              </span>
                            )}
                          </div>
                        )}

                        {/* Override Indicator */}
                        {overridesForDoc.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <span className="font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span>Active Admin Overrides for this document ({overridesForDoc.length}):</span>
                            </span>
                            {overridesForDoc.map((ovr) => (
                              <div key={ovr.id} className="text-[11px] pl-4">
                                • <span className="font-semibold">{ovr.field}</span>: Requested "
                                <span className="line-through text-slate-500">{String(ovr.requestedValue)}</span>" →
                                Set to "<span className="font-bold text-amber-950">{String(ovr.actualValue)}</span>"
                                (Reason: {ovr.reason} by {ovr.changedBy})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No structured document print snapshot attached. Standard order items are available in general orders view.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Admin Overrides */}
          {activeTab === "overrides" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Override Audit Log ({printJob?.overrides?.length || 0})
                </h3>
                <span className="text-xs text-slate-400">
                  All adjustments preserve the customer's original requested configuration.
                </span>
              </div>

              {printJob?.overrides && printJob.overrides.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {printJob.overrides.map((ovr) => (
                    <div key={ovr.id} className="p-4 bg-white hover:bg-slate-50 transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ovr.fileName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(ovr.changedAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Field: <span className="font-bold text-blue-900 font-mono">{ovr.field}</span> | Requested:{" "}
                        <span className="font-semibold text-slate-500 line-through">{String(ovr.requestedValue)}</span>{" "}
                        → Actual: <span className="font-bold text-emerald-700">{String(ovr.actualValue)}</span>
                      </div>
                      <div className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-semibold">Reason:</span> {ovr.reason} (by{" "}
                        <span className="font-bold text-slate-900">{ovr.changedBy}</span>)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No operator overrides have been recorded for this job. All settings match the customer's exact request.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Full Audit Trail */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Action & Lifecycle History ({printJob?.auditLogs?.length || 0})
              </h3>

              {printJob?.auditLogs && printJob.auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {printJob.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{log.notes}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Performed by: <span className="font-semibold text-slate-700">{log.performedBy}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No audit entries recorded yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Lifecycle Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Job Status Progression:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleStatusChange("READY_TO_PRINT", `Marked Ready to Print by ${adminName}`)}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
            >
              Ready to Print
            </button>
            <button
              onClick={() => handleStatusChange("PRINTED", `Marked Printed by ${adminName}`)}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
            >
              Mark Printed
            </button>
            <button
              onClick={() => handleStatusChange("QUALITY_CHECK", `Sent for QC by ${adminName}`)}
              className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors"
            >
              Quality Check Pass
            </button>
            <button
              onClick={() => handleStatusChange("READY", `Marked Ready for Customer Pickup by ${adminName}`)}
              className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors"
            >
              Ready for Pickup
            </button>
            <button
              onClick={() => handleStatusChange("COMPLETED", `Order Delivered / Completed by ${adminName}`)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Complete Order
            </button>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModalDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmitOverride}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Admin Setting Override</h3>
              <button
                type="button"
                onClick={() => setOverrideModalDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Override machine setting for: <span className="font-bold text-slate-900">{overrideModalDoc.fileName}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Field to Override</label>
                <select
                  value={overrideField}
                  onChange={(e) => {
                    setOverrideField(e.target.value);
                    setOverrideValue((overrideModalDoc as any)[e.target.value] || "");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-bold"
                >
                  <option value="paperSize">Paper Size (A4, A3, A5)</option>
                  <option value="gsm">Paper GSM (70, 75, 80, 100, 120)</option>
                  <option value="colorMode">Color Mode (bw, color, mixed)</option>
                  <option value="sides">Sides (single, double_long, double_short)</option>
                  <option value="binding">Binding (none, staple, spiral, comb)</option>
                  <option value="copies">Copies Count</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Value</label>
                <input
                  type="text"
                  required
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="e.g. 80, a4, spiral..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Override (Required) *</label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Machine 80 GSM paper tray selected per customer verbal request"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideModalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overrideSubmitting}
                className="px-4 py-2 rounded-xl bg-[#123B70] text-white text-xs font-bold hover:bg-[#0e2f5a] disabled:opacity-50"
              >
                {overrideSubmitting ? "Saving..." : "Save Override with Audit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
};
