import React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { StatusHistoryLog } from "../lib/storage/store";
import { cn } from "../lib/utils";

interface OrderTimelineProps {
  currentStatus: string;
  historyLogs?: StatusHistoryLog[];
  entityType: "order" | "service_request" | "quote_request" | "design_request";
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  currentStatus,
  historyLogs = [],
  entityType,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const orderSteps = [
    { key: "NEW", labelEn: "Order Placed", labelHi: "ऑर्डर प्राप्त" },
    { key: "UNDER_REVIEW", labelEn: "File Review", labelHi: "फाइल जांच" },
    { key: "CONFIRMED", labelEn: "Confirmed", labelHi: "कन्फर्म" },
    { key: "IN_PRODUCTION", labelEn: "Printing", labelHi: "प्रिंटिंग जारी" },
    { key: "READY_FOR_PICKUP", labelEn: "Ready / Dispatch", labelHi: "तैयार / डिस्पैच" },
    { key: "COMPLETED", labelEn: "Fulfilled", labelHi: "पूर्ण" },
  ];

  const serviceSteps = [
    { key: "NEW", labelEn: "Request Received", labelHi: "अनुरोध प्राप्त" },
    { key: "DOCUMENTS_VERIFIED", labelEn: "Docs Verified", labelHi: "दस्तावेज जांच" },
    { key: "IN_PROCESSING", labelEn: "Portal Draft", labelHi: "पोर्टल ड्राफ्ट" },
    { key: "SUBMITTED_TO_PORTAL", labelEn: "Submitted", labelHi: "सरकारी पोर्टल सबमिट" },
    { key: "COMPLETED", labelEn: "Delivered", labelHi: "सफलतापूर्वक पूर्ण" },
  ];

  const steps = entityType === "service_request" ? serviceSteps : orderSteps;

  const currentIdx = steps.findIndex((s) => s.key === currentStatus);
  const activeStepIndex = currentIdx >= 0 ? currentIdx : 0;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(currentLang === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Steps on Desktop / Wrapped on Mobile */}
      <div className="relative">
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-slate-200" />
        <div
          className="hidden sm:block absolute top-4 left-6 h-0.5 bg-[#123B70] transition-all duration-500"
          style={{
            width: `${Math.min(100, (activeStepIndex / (steps.length - 1)) * 100)}%`,
          }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-1">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeStepIndex || currentStatus === "COMPLETED";
            const isCurrent = idx === activeStepIndex && currentStatus !== "COMPLETED";
            const isPending = idx > activeStepIndex;

            return (
              <div
                key={step.key}
                className={cn(
                  "relative flex flex-col items-center text-center p-2 rounded-xl sm:bg-transparent",
                  isCurrent && "bg-blue-50/60 sm:bg-transparent"
                )}
              >
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs",
                    isCompleted && "bg-emerald-600 text-white",
                    isCurrent && "bg-[#123B70] text-white ring-4 ring-blue-100 animate-pulse",
                    isPending && "bg-slate-100 text-slate-400 border border-slate-200"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-2">
                  <div
                    className={cn(
                      "text-xs font-bold",
                      isCurrent && "text-[#123B70]",
                      isCompleted && "text-slate-800",
                      isPending && "text-slate-400"
                    )}
                  >
                    {currentLang === "hi" ? step.labelHi : step.labelEn}
                  </div>
                  {isCurrent && (
                    <span className="inline-block mt-0.5 rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-bold text-[#123B70]">
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Status Logs */}
      {historyLogs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {currentLang === "hi" ? "गतिविधि टाइमलाइन" : "Activity Timeline"}
          </h4>

          <div className="space-y-3 divide-y divide-slate-200/60">
            {historyLogs.map((log) => (
              <div key={log.id} className="pt-2 first:pt-0 flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-[#123B70] mt-1.5 shrink-0" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {log.newStatus.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    {currentLang === "hi" && log.messageHi ? log.messageHi : log.messageEn}
                  </p>
                  <span className="text-[10px] text-slate-400">by {log.performedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
