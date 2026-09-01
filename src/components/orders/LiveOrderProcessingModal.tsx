import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  RotateCw,
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useScrollLock } from "../../hooks/useScrollLock";
import { cn } from "../../lib/utils";
import {
  STATE_METADATA_MAP,
  formatByteSize,
  formatTimestamp,
} from "../../lib/orders/orderSubmissionStateMachine";
import type {
  OrderSubmissionState,
  FileProgressInfo,
  UploadProgressSummary,
  StateTimelineEntry,
} from "../../lib/orders/orderSubmissionStateMachine";

export interface LiveOrderProcessingModalProps {
  isOpen: boolean;
  submissionId: string;
  orderCode?: string;
  currentState: OrderSubmissionState;
  paymentMethod: "pay_at_store" | "upi_online" | "pay_online";
  timeline: StateTimelineEntry[];
  filesProgress: FileProgressInfo[];
  uploadSummary?: UploadProgressSummary;
  orderSummary: {
    totalDocuments: number;
    totalPrintedPages: number;
    totalPhysicalSheets: number;
    colorBreakdownText: string;
    duplexText: string;
    paperSizeText: string;
    copies: number;
    grandTotal: number;
    serviceName?: string;
    docTypeLabel?: string;
  };
  errorMessage?: string | null;
  onCancelRequest: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export const LiveOrderProcessingModal: React.FC<LiveOrderProcessingModalProps> = ({
  isOpen,
  submissionId,
  orderCode,
  currentState,
  paymentMethod,
  timeline,
  filesProgress,
  uploadSummary,
  orderSummary,
  errorMessage,
  onCancelRequest,
  onRetry,
  onClose,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFileDetails, setShowFileDetails] = useState(true);
  const [isProlongedWait, setIsProlongedWait] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setShowCancelConfirm(false);
      setIsProlongedWait(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (currentState === "ORDER_CREATING") {
      timer = setTimeout(() => {
        setIsProlongedWait(true);
      }, 3500);
    } else {
      setIsProlongedWait(false);
    }
    return () => clearTimeout(timer);
  }, [currentState]);

  if (!isOpen || typeof document === "undefined") return null;

  const meta = STATE_METADATA_MAP[currentState] || STATE_METADATA_MAP.IDLE;
  const isOnlinePayment = paymentMethod === "upi_online" || paymentMethod === "pay_online";
  const isFailed = currentState === "FAILED";
  const isCancelled = currentState === "CANCELLED";
  const isCompleted = currentState === "COMPLETED";

  // Format short display submission ID (e.g. REQ-8F21)
  const shortSubmissionId = submissionId
    ? submissionId.replace("PE-DOC-", "REQ-").slice(0, 14)
    : "REQ-LIVE";

  // Milestones definition
  const milestones = [
    {
      id: "received",
      labelEn: "Order details received",
      labelHi: "ऑर्डर विवरण प्राप्त",
      stepIndex: 0,
      activeIf: ["SUBMITTING"],
      completedIf: [
        "VALIDATING",
        "UPLOADING",
        "PROCESSING",
        "ORDER_CREATING",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "COMPLETED",
      ],
    },
    {
      id: "validated",
      labelEn: "Documents & settings validated",
      labelHi: "दस्तावेज व सेटिंग्स सत्यापित",
      stepIndex: 1,
      activeIf: ["VALIDATING"],
      completedIf: [
        "UPLOADING",
        "PROCESSING",
        "ORDER_CREATING",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "COMPLETED",
      ],
    },
    {
      id: "uploading",
      labelEn: "Uploading documents",
      labelHi: "दस्तावेज अपलोड",
      stepIndex: 2,
      activeIf: ["UPLOADING"],
      completedIf: [
        "PROCESSING",
        "ORDER_CREATING",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "COMPLETED",
      ],
    },
    {
      id: "processing",
      labelEn: "Processing document settings",
      labelHi: "प्रिंट सेटिंग्स प्रोसेसिंग",
      stepIndex: 3,
      activeIf: ["PROCESSING"],
      completedIf: [
        "ORDER_CREATING",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "COMPLETED",
      ],
    },
    {
      id: "creating",
      labelEn: "Creating your production order",
      labelHi: "प्रोडक्शन ऑर्डर बनाया जा रहा है",
      stepIndex: 4,
      activeIf: ["ORDER_CREATING", "RECOVERING"],
      completedIf: [
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "COMPLETED",
      ],
    },
    {
      id: "payment",
      labelEn: isOnlinePayment ? "Payment confirmation" : "Payment: Pay at Counter",
      labelHi: isOnlinePayment ? "ऑनलाइन भुगतान सत्यापन" : "भुगतान: दुकान पर (Pay at Counter)",
      stepIndex: 5,
      activeIf: ["PAYMENT_PENDING", "PAYMENT_PROCESSING"],
      completedIf: ["COMPLETED"],
    },
  ];

  const getMilestoneTimestamp = (milestoneId: string): string => {
    const entry = timeline.find((t) => {
      if (milestoneId === "received") return t.state === "SUBMITTING";
      if (milestoneId === "validated") return t.state === "VALIDATING";
      if (milestoneId === "uploading") return t.state === "UPLOADING";
      if (milestoneId === "processing") return t.state === "PROCESSING";
      if (milestoneId === "creating") return t.state === "ORDER_CREATING";
      if (milestoneId === "payment") return t.state === "PAYMENT_PENDING" || t.state === "COMPLETED";
      return false;
    });
    return entry ? formatTimestamp(entry.timestamp) : "";
  };

  const getCancelDialogText = () => {
    if (currentState === "UPLOADING") {
      return currentLang === "hi"
        ? "आपके दस्तावेज वर्तमान में अपलोड हो रहे हैं। यदि आप अभी रद्द करते हैं, तो अपलोड सुरक्षित रूप से रुक जाएगा और कोई ऑर्डर नहीं बनाया जाएगा।"
        : "Your documents are currently uploading. If you cancel now, the upload will stop immediately and no order will be recorded.";
    }
    if (currentState === "PROCESSING") {
      return currentLang === "hi"
        ? "आपकी प्रिंट सेटिंग्स प्रोसेस की जा रही हैं। रद्द करने पर प्रक्रिया तुरंत समाप्त हो जाएगी।"
        : "Your document settings are currently being processed. Cancelling now will stop the submission safely.";
    }
    if (currentState === "PAYMENT_PENDING") {
      return currentLang === "hi"
        ? "आपका भुगतान प्रयास वर्तमान में पेंडिंग है। यदि आप रद्द करते हैं, तो आप दुकान पर काउंटर पर भुगतान चुन सकते हैं।"
        : "Your payment attempt is currently open. If you cancel, your order will not be charged and you can pay at pickup.";
    }
    return currentLang === "hi"
      ? "क्या आप वाकई यह सबमिशन रद्द करना चाहते हैं?"
      : "Are you sure you want to cancel this submission?";
  };

  return createPortal(
    <div
      tabIndex={-1}
      className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-processing-title"
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[min(92vh,860px)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Pinned Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-[#123B70] text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10 border border-white/20 text-amber-300">
              {isFailed ? (
                <AlertTriangle className="h-5 w-5 text-rose-300" />
              ) : isCancelled ? (
                <X className="h-5 w-5 text-slate-300" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ) : (
                <RotateCw className="h-5 w-5 animate-spin text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="live-processing-title" className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  {currentLang === "hi" ? "ऑर्डर लाइव प्रोसेसिंग" : "Processing Your Order"}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/15 border border-white/25 text-amber-300 font-bold">
                  {shortSubmissionId}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/80 truncate">
                {currentLang === "hi" ? meta.titleHi : meta.titleEn}
              </p>
            </div>
          </div>

          {/* Close button only enabled when terminal (Failed, Cancelled, Completed) */}
          {(isFailed || isCancelled || isCompleted) && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ─── Pinned Live Status Strip ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                isFailed
                  ? "bg-rose-100 text-rose-900 border-rose-200"
                  : isCancelled
                  ? "bg-slate-100 text-slate-800 border-slate-300"
                  : isCompleted
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-amber-100 text-amber-950 border-amber-300"
              )}
            >
              {!isFailed && !isCancelled && !isCompleted && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              )}
              <span>
                {isFailed
                  ? currentLang === "hi" ? "त्रुटि (Error)" : "Submission Error"
                  : isCancelled
                  ? currentLang === "hi" ? "रद्द (Cancelled)" : "Cancelled"
                  : isCompleted
                  ? currentLang === "hi" ? "पूर्ण (Confirmed)" : "Confirmed"
                  : currentLang === "hi" ? meta.titleHi : meta.titleEn}
              </span>
            </span>

            {orderCode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#123B70] border border-blue-200 font-mono">
                ID: {orderCode}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentLang === "hi" ? "कृपया विंडो खुली रखें" : "Please keep window open"}</span>
          </div>
        </div>

        {/* ─── Scrollable Modal Body ─────────────────────────────────── */}
        <div
          ref={modalScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs text-slate-700"
        >
          {/* Main Status Subtext Banner */}
          <div
            className={cn(
              "rounded-xl p-3 sm:p-3.5 border text-xs leading-relaxed flex items-start gap-2.5",
              isFailed
                ? "bg-rose-50/80 border-rose-200 text-rose-900"
                : isCancelled
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : isCompleted
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-blue-50/70 border-blue-200 text-slate-800"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {isFailed ? (
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              ) : isCancelled ? (
                <X className="h-4 w-4 text-slate-600" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-[#123B70]" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {errorMessage ||
                  (isProlongedWait && currentState === "ORDER_CREATING"
                    ? currentLang === "hi"
                      ? "ऑर्डर दर्ज हो रहा है... आपका ऑर्डर सुरक्षित रूप से पूरा किया जा रहा है। कृपया दोबारा सबमिट न करें।"
                      : "Still working... Your order is being securely finalized. Please don't submit again."
                    : currentLang === "hi"
                    ? meta.subtextHi
                    : meta.subtextEn)}
              </p>
              {currentState === "ORDER_CREATING" && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentLang === "hi"
                    ? "डेटाबेस में ऑर्डर सुरक्षित रूप से दर्ज किया जा रहा है। डुप्लीकेट प्रविष्टि से बचने के लिए कृपया प्रतीक्षा करें।"
                    : "Finalizing immutable order registration in print database. Protection active against duplication."}
                </p>
              )}
            </div>
          </div>

          {/* Real Upload Progress Section (Visible during and after UPLOADING) */}
          {(currentState === "UPLOADING" ||
            filesProgress.some((f) => f.loaded > 0) ||
            (uploadSummary && uploadSummary.totalBytes > 0)) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#123B70]" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {currentLang === "hi" ? "दस्तावेज फाइल अपलोड" : "Document Files Upload"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFileDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#123B70] hover:underline cursor-pointer"
                >
                  <span>
                    {filesProgress.length} {filesProgress.length === 1 ? "file" : "files"}
                  </span>
                  {showFileDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Aggregated Progress Bar */}
              {uploadSummary && uploadSummary.totalBytes > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>
                      {uploadSummary.percent >= 100
                        ? currentLang === "hi" ? "✓ सभी फाइलें अपलोड हो गईं" : "✓ All files uploaded"
                        : currentLang === "hi"
                        ? `अपलोड हो रहा है (${uploadSummary.completedFiles}/${uploadSummary.totalFiles} फाइलें)`
                        : `Uploading (${uploadSummary.completedFiles}/${uploadSummary.totalFiles} files)`}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatByteSize(uploadSummary.loadedBytes)} / {formatByteSize(uploadSummary.totalBytes)} ({uploadSummary.percent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        uploadSummary.percent >= 100 ? "bg-emerald-500" : "bg-[#123B70]"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, uploadSummary.percent))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Per-File Status Checklist */}
              {showFileDetails && filesProgress.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-200/80">
                  {filesProgress.map((file) => {
                    const isDone = file.status === "completed" || file.percent >= 100;
                    const isUploading = file.status === "uploading";
                    const isFileFailed = file.status === "failed";

                    return (
                      <div
                        key={file.index}
                        className="rounded-lg bg-white p-2.5 border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {isDone ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : isUploading ? (
                              <RotateCw className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" />
                            ) : isFileFailed ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>

                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {formatByteSize(file.size)}
                          </span>
                        </div>

                        {isUploading && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-200"
                              style={{ width: `${Math.min(100, Math.max(0, file.percent))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Status Timeline Checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              {currentLang === "hi" ? "सबमिशन समयरेखा (Live Progress)" : "Submission Milestones"}
            </h4>

            <div className="space-y-2.5">
              {milestones.map((m) => {
                const isCurrent = m.activeIf.includes(currentState);
                const isCompletedStep = m.completedIf.includes(currentState);
                const timestamp = getMilestoneTimestamp(m.id);

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors text-xs",
                      isCurrent
                        ? "bg-amber-50/80 border border-amber-200"
                        : isCompletedStep
                        ? "bg-slate-50/60"
                        : "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isCompletedStep ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <RotateCw className="h-4 w-4 text-amber-600 animate-spin" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                        )}
                      </div>

                      <div>
                        <span
                          className={cn(
                            "font-bold block",
                            isCurrent
                              ? "text-amber-950"
                              : isCompletedStep
                              ? "text-slate-800"
                              : "text-slate-500"
                          )}
                        >
                          {currentLang === "hi" ? m.labelHi : m.labelEn}
                        </span>

                        {isCurrent && (
                          <span className="text-[11px] text-amber-800 font-medium block mt-0.5">
                            {currentLang === "hi" ? meta.subtextHi : meta.subtextEn}
                          </span>
                        )}
                      </div>
                    </div>

                    {timestamp && (
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 font-medium">
                        {timestamp}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verified Order Snapshot Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {orderSummary.serviceName || "Document Printing"}
              </span>
              <span className="rounded-md bg-blue-100 text-[#123B70] px-2 py-0.5 font-bold text-[10px] shrink-0">
                {orderSummary.docTypeLabel || "Standard Document"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "दस्तावेज" : "Documents"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.totalDocuments}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "कुल पेज" : "Total Pages"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.totalPrintedPages}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "शीट संख्या" : "Physical Sheets"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.totalPhysicalSheets}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "कलर" : "Color Mode"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.colorBreakdownText}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "साइड्स" : "Sides"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.duplexText}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                <span className="text-slate-500 block text-[10px]">
                  {currentLang === "hi" ? "प्रतियां" : "Copies"}
                </span>
                <span className="font-bold text-slate-800">{orderSummary.copies}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs sm:text-sm font-extrabold text-slate-900">
              <div className="flex items-center gap-1.5">
                {isOnlinePayment ? (
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Building2 className="h-4 w-4 text-blue-600" />
                )}
                <span>
                  {isOnlinePayment
                    ? currentLang === "hi" ? "ऑनलाइन भुगतान" : "Online Payment (UPI/Card)"
                    : currentLang === "hi" ? "दुकान पर भुगतान (Pay on Pickup)" : "Pay on Pickup"}
                </span>
              </div>
              <span className="text-sm sm:text-base text-[#123B70] font-black">
                ₹{orderSummary.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Pinned Modal Footer ───────────────────────────────────── */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
          {/* Active processing: Cancel button if cancellable */}
          {!isFailed && !isCancelled && !isCompleted && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {meta.canCancel
                  ? currentLang === "hi"
                    ? "जरूरत पड़ने पर आप सबमिशन रोक सकते हैं"
                    : "You can safely cancel if needed"
                  : currentLang === "hi"
                  ? "ऑर्डर डेटाबेस में दर्ज हो रहा है..."
                  : "Finalizing order transaction..."}
              </span>

              {meta.canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {currentLang === "hi" ? meta.cancelButtonLabelHi : meta.cancelButtonLabelEn}
                </button>
              )}
            </div>
          )}

          {/* Failed State Actions */}
          {isFailed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>{currentLang === "hi" ? "पुनः प्रयास करें" : "Retry Submission"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                {currentLang === "hi" ? "फॉर्म पर वापस जाएं" : "Return to Form"}
              </button>
            </div>
          )}

          {/* Cancelled State Actions */}
          {isCancelled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {currentLang === "hi" ? "फॉर्म पर वापस जाएं" : "Return to Form"}
              </button>
            </div>
          )}
        </div>

        {/* ─── Sub-Modal: Cancellation Confirmation Dialog ───────────── */}
        {showCancelConfirm && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{currentLang === "hi" ? "सबमिशन रद्द करें?" : "Cancel this submission?"}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {getCancelDialogText()}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  {currentLang === "hi" ? "प्रोसेसिंग जारी रखें" : "Keep Processing"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    onCancelRequest();
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {currentLang === "hi" ? "सबमिशन रद्द करें" : "Cancel Submission"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default LiveOrderProcessingModal;
