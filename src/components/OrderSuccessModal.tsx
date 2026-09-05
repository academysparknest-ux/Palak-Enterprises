import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  ArrowRight,
  MapPin,
  X,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { business, businessConfig, getWhatsAppLink } from "../config/business";
import { useScrollLock } from "../hooks/useScrollLock";
import { cn } from "../lib/utils";

import type { OrderPrintSnapshot } from "../types/printJob";

export interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode: string;
  serviceName: string;
  documentType?: string;
  specifications?: Record<string, string>;
  finishingSelected?: string[];
  printSnapshot?: OrderPrintSnapshot;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  paymentStatus?: string;
  razorpayPaymentId?: string;
}

function getBindingLabel(type?: string): string {
  switch (type) {
    case "staple": return "Corner / Saddle Staple";
    case "spiral": return "Spiral Binding";
    case "comb": return "Comb Binding";
    case "soft": return "Soft Binding";
    case "hard": return "Hard Binding";
    case "none":
    default:
      return "None (Loose Sheets)";
  }
}

function getCoverLabel(type?: string): string {
  switch (type) {
    case "transparent": return "Transparent Plastic Sheet";
    case "white": return "Opaque White Sheet";
    case "black": return "Matte Black Sheet";
    case "color": return "Color Card Sheet";
    case "custom": return "Custom Cover Sheet";
    case "none":
    default:
      return "None";
  }
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderCode,
  serviceName,
  documentType,
  specifications = {},
  finishingSelected = [],
  printSnapshot,
  totalAmount,
  customerName,
  customerPhone,
  paymentMethod = "pay_at_shop",
  paymentStatus = "pending",
  razorpayPaymentId,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [copied, setCopied] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Save reference to previously active element for focus restoration
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // 2. Ensure modal starts at top and receives focus
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
      modalScrollRef.current.focus?.();
    }

    // 3. Escape key dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the trigger element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isOnlinePayment = paymentMethod === "upi_online" || paymentMethod === "pay_online";
  const isPaid = paymentStatus === "confirmed" || paymentStatus === "paid";
  const isPriority = isOnlinePayment && isPaid;

  // Optional WhatsApp support query (never contains private storage URLs)
  const waSupportMsg = `Hello Palak Enterprises,\n\nI have a question regarding my order.\n\nOrder ID: ${orderCode}\nService: ${serviceName}\nQueue: ${isPriority ? "Priority (Paid Online)" : "Normal (Send Document)"}\nCustomer: ${customerName} (${customerPhone})\n\nThank you!`;
  const waLink = getWhatsAppLink(waSupportMsg);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      tabIndex={-1}
      className="fixed inset-0 z-[150] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(92vh,860px)] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Pinned Top Action Bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
              isPriority ? "bg-amber-500/20 border-amber-400/30 text-amber-300" : "bg-blue-500/20 border-blue-400/30 text-blue-300"
            )}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  {isPriority
                    ? (currentLang === "hi" ? "ऑर्डर सफलतापूर्वक दर्ज" : "Order Confirmed")
                    : (currentLang === "hi" ? "दस्तावेज सफलतापूर्वक भेजा गया" : "Document Received")}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-900/70 border border-blue-400/30 text-blue-200 font-bold">
                  {orderCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {serviceName} • {customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Pinned Sub-Header Status Strip ─────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1",
              isPriority 
                ? "bg-amber-400 text-slate-950 border-amber-500 shadow-2xs" 
                : "bg-blue-100 text-blue-900 border-blue-200"
            )}>
              <span>{isPriority ? "🔥" : "📄"}</span>
              <span>{isPriority ? "Priority Printing Queue" : "Normal Printing Queue"}</span>
            </span>

            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md border",
              isPaid
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            )}>
              {isPaid
                ? (currentLang === "hi" ? "✓ भुगतान पूर्ण" : "✓ Paid Online")
                : (currentLang === "hi" ? "दुकान पर भुगतान (Pending)" : "Pay at Shop Counter")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied ID</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-500" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>

        {/* ─── Scrollable Modal Body ──────────────────────────────────────── */}
        <div
          ref={modalScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs text-slate-700"
        >
          {/* Main Success Announcement Card */}
          <div className="text-center space-y-2 py-2">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center mx-auto ring-4 animate-popIn",
              isPriority ? "bg-amber-100 text-amber-600 ring-amber-50" : "bg-blue-100 text-blue-600 ring-blue-50"
            )}>
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 id="order-success-title" className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {isPriority
                ? (currentLang === "hi" ? "🎉 आपका भुगतान सफल रहा!" : "🎉 Order Placed & Paid Successfully!")
                : (currentLang === "hi" ? "📄 दस्तावेज सफलतापूर्वक प्राप्त हुआ" : "📄 Order & Document Received")}
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {isPriority
                ? (currentLang === "hi"
                    ? "आपका ऑर्डर PRIORITY PRINTING QUEUE में है। हम आपके दस्तावेज प्राथमिकता से तैयार कर रहे हैं। दुकान पहुँचकर तैयार प्रिंट तुरंत प्राप्त करें।"
                    : "Your order is registered in our PRIORITY PRINTING QUEUE. Your prints will be processed first with zero waiting.")
                : (currentLang === "hi"
                    ? "आपके दस्तावेज सामान्य कतार में प्राप्त हो गए हैं। दुकान काउंटर पर आपकी मौजूदगी होते ही प्रिंट शुरू कर दिया जाएगा और आप काउंटर पर भुगतान करेंगे।"
                    : "Your documents are in the normal queue. Printing starts once confirmed at the counter, and you can pay at pickup.")}
            </p>
          </div>

          {/* Tracking ID & Queue Summary Box */}
          <div className="rounded-xl border-2 border-dashed border-[#123B70]/30 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-3.5 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {currentLang === "hi" ? "यूनिक ऑर्डर ट्रैकिंग आईडी" : "Official Order Tracking ID"}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-lg sm:text-xl font-mono font-black text-[#123B70] tracking-wide break-all">
                {orderCode}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              {currentLang === "hi"
                ? "दुकान काउंटर पर यह कोड दिखाकर अपना प्रिंट प्राप्त करें"
                : "Quote this ID at the shop counter to collect your ready prints"}
            </p>
          </div>

          {/* Status & Payment Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {currentLang === "hi" ? "ऑर्डर स्थिति" : "Order Status"}
              </span>
              <span className="font-bold text-[#123B70] flex items-center gap-1.5 text-xs sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                <span>{currentLang === "hi" ? "ऑर्डर प्राप्त (Order Received)" : "Order Received"}</span>
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {currentLang === "hi" ? "भुगतान विवरण" : "Payment Breakdown"}
              </span>
              <div className="flex items-center justify-between gap-1.5 text-xs">
                <span className="font-bold text-slate-800 truncate">
                  {isOnlinePayment
                    ? (currentLang === "hi" ? "ऑनलाइन भुगतान" : "Online Payment")
                    : (currentLang === "hi" ? "काउंटर पर भुगतान" : "Pay at Counter")}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white border border-slate-300 shrink-0 uppercase">
                  {isPaid ? (currentLang === "hi" ? "Paid" : "Paid") : (currentLang === "hi" ? "Pending" : "Pending")}
                </span>
              </div>
              {razorpayPaymentId && (
                <div className="flex items-center justify-between gap-1.5 pt-1 text-[11px] border-t border-slate-200/80 font-mono">
                  <span className="text-slate-500 font-sans text-[10px] font-bold uppercase tracking-wider">
                    {currentLang === "hi" ? "ट्रांजेक्शन नं. (Txn ID)" : "Payment Txn No"}
                  </span>
                  <span className="font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 select-all">
                    {razorpayPaymentId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Specifications & Print Requirements */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{serviceName}</span>
              {documentType && (
                <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 font-bold text-[10px] shrink-0">
                  {documentType}
                </span>
              )}
            </div>

            {printSnapshot?.documents && printSnapshot.documents.length > 0 ? (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {currentLang === "hi" ? "आपकी प्रिंट विनिर्देश (Specifications):" : "Your Print Specifications"}
                </span>

                {printSnapshot.documents.map((doc, idx) => {
                  const docFinishing = (doc.finishing || {}) as Record<string, boolean>;
                  const hasLami = Boolean(docFinishing.lamination);
                  const hasHole = Boolean(docFinishing.holePunching);
                  const hasBooklet = Boolean(docFinishing.bookletMode);

                  return (
                    <div key={idx} className="rounded-lg bg-white p-3 border border-slate-200 space-y-2 text-xs">
                      {printSnapshot.documents.length > 1 && (
                        <div className="font-bold text-slate-800 text-[11px] truncate pb-1 border-b border-slate-100">
                          File {idx + 1}: {doc.fileName}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {String(doc.paperSize || "A4").toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {doc.gsm || 75} GSM
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {doc.colorMode === "bw" ? "B/W" : doc.colorMode === "color" ? "Color" : "Mixed Color"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {doc.sides === "single" ? "Single-sided" : "Double-sided"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {doc.orientation === "landscape" ? "Landscape" : "Portrait"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 pt-1">
                        <div>
                          <span className="font-semibold text-slate-700">Binding:</span> {getBindingLabel(doc.binding)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Front Cover:</span> {getCoverLabel(doc.frontCover)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Back Cover:</span> {getCoverLabel(doc.backCover)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Copies:</span> {doc.copies || 1}
                        </div>
                      </div>

                      {(hasLami || hasHole || hasBooklet) && (
                        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-emerald-800 font-bold">
                          {hasLami && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              Thermal Lamination
                            </span>
                          )}
                          {hasHole && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              2/4 Hole Punching
                            </span>
                          )}
                          {hasBooklet && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              Booklet Fold & Saddle
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : Object.entries(specifications).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
                {Object.entries(specifications).map(([key, val]) => (
                  <div key={key} className="truncate">
                    <span className="font-semibold text-slate-700">{key}:</span> {val}
                  </div>
                ))}
              </div>
            ) : null}

            {finishingSelected.length > 0 && !printSnapshot?.documents && (
              <div className="pt-2 border-t border-slate-200 text-[11px]">
                <span className="font-bold text-slate-800 block mb-1">
                  {currentLang === "hi" ? "चयनित फिनिशिंग:" : "Selected Finishing:"}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-emerald-800 font-medium">
                  {finishingSelected.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs sm:text-sm font-extrabold text-slate-900">
              <span>{currentLang === "hi" ? "कुल अनुमानित राशि:" : "Estimated Total:"}</span>
              <span className="text-sm sm:text-base text-[#123B70] font-black">
                {totalAmount > 0 ? `₹${totalAmount}` : "Price upon review"}
              </span>
            </div>
          </div>

          {/* Shop Collection Guide */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-3.5 space-y-1.5 text-xs text-slate-800">
            <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
              <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{currentLang === "hi" ? "दुकान संग्रह पता:" : "Store Pickup Location:"}</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
              <strong>{business.name[currentLang]}</strong>: {businessConfig.address.fullAddress[currentLang]}.
            </p>
          </div>
        </div>

        {/* ─── Pinned Modal Footer ────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to={`/track-order?code=${encodeURIComponent(orderCode)}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer text-center"
            >
              <span>{currentLang === "hi" ? "ऑर्डर लाइव ट्रैक करें" : "Track Order Status"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              to="/account/orders"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-800 transition-colors text-center cursor-pointer"
            >
              <span>{currentLang === "hi" ? "मेरे ऑर्डर्स देखें" : "View My Orders"}</span>
            </Link>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs text-slate-500">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {currentLang === "hi" ? "नया ऑर्डर करें" : "Order More"}
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{currentLang === "hi" ? "मदद चाहिए? WhatsApp पर पूछें" : "Chat on WhatsApp"}</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrderSuccessModal;
