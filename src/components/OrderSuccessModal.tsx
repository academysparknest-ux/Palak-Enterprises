import React, { useRef, useEffect, useState } from "react";
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
import { business, getWhatsAppLink } from "../config/business";
import { cn } from "../lib/utils";

export interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode: string;
  serviceName: string;
  documentType?: string;
  specifications?: Record<string, string>;
  finishingSelected?: string[];
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderCode,
  serviceName,
  documentType,
  specifications = {},
  finishingSelected = [],
  totalAmount,
  customerName,
  customerPhone,
  paymentMethod = "pay_at_shop",
  paymentStatus = "pending",
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [copied, setCopied] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture current scroll position before locking background
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // 2. Capture existing inline body styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    // 3. Freeze body firmly in place without visual jumping
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    // 4. Ensure modal itself starts strictly at top 0
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }

    // 5. Escape key dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      // 6. Clean up: restore original body styles and exact background scroll position
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", handleKeyDown);
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

  return (
    <div
      ref={modalScrollRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/80 backdrop-blur-xs animate-fadeIn focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
      onClick={onClose}
    >
      <div className="min-h-full min-h-[100dvh] w-full flex items-start justify-center p-3 sm:p-4 md:p-6 py-6 sm:py-10">
        <div
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6 text-left transition-all my-auto"
          style={{ animation: "scaleIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active-press transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success Icon Header */}
          <div className="text-center space-y-1.5 sm:space-y-2 pt-1 sm:pt-0">
            <div className={cn(
              "h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center mx-auto ring-4 sm:ring-8 animate-popIn",
              isPriority ? "bg-amber-100 text-amber-600 ring-amber-50" : "bg-blue-100 text-blue-600 ring-blue-50"
            )}>
              <CheckCircle2 className="h-7 w-7 sm:h-9 sm:w-9" />
            </div>

            <h2 id="order-success-title" className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {isPriority
              ? (currentLang === "hi" ? "🎉 भुगतान सफल! (Priority Print)" : "🎉 Payment Successful!")
              : (currentLang === "hi" ? "📄 दस्तावेज सफलतापूर्वक भेजा गया" : "📄 Document Sent Successfully")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            {isPriority
              ? (currentLang === "hi"
                  ? "आपका ऑर्डर PRIORITY PRINTING QUEUE में है। आपको सामान्य कतार में प्रतीक्षा नहीं करनी होगी। हम आपके दस्तावेज पहले तैयार करेंगे। दुकान पहुँचकर तैयार प्रिंट प्राप्त करें।"
                  : "Your order is in the PRIORITY PRINTING QUEUE. You don't need to wait in the normal queue. We'll prepare your documents first. Come to the shop and collect your ready prints.")
              : (currentLang === "hi"
                  ? "आपके दस्तावेज सामान्य कतार में प्राप्त हो गए हैं। दुकान काउंटर पर आपकी मौजूदगी/सत्यापन होते ही प्रिंट शुरू कर दिया जाएगा और आप काउंटर पर भुगतान करेंगे।"
                  : "Your documents have been received in the normal queue. Printing starts once your arrival/availability is confirmed at the shop counter, and you pay at pickup.")}
          </p>
        </div>

        {/* Queue Classification Alert Banner */}
        <div className={cn(
          "rounded-xl p-3 border text-xs flex items-center justify-between gap-3",
          isPriority
            ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950"
            : "bg-gradient-to-r from-slate-50 to-blue-50 border-slate-300 text-slate-900"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-base">{isPriority ? "🔥" : "📄"}</span>
            <div>
              <span className="font-extrabold uppercase tracking-wide block text-[11px]">
                {isPriority ? "PRIORITY PRINTING QUEUE" : "NORMAL PRINTING QUEUE"}
              </span>
              <span className="text-[10px] text-slate-600">
                {isPriority
                  ? (currentLang === "hi" ? "प्राथमिकता क्रम: पहले प्रिंट होगा" : "Express processing: printed ahead of normal queue")
                  : (currentLang === "hi" ? "सामान्य क्रम: पहले आओ, पहले पाओ" : "Standard processing: first come, first served")}
              </span>
            </div>
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 border",
            isPriority ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-slate-200 text-slate-800 border-slate-300"
          )}>
            {isPriority ? "PRIORITY" : "NORMAL"}
          </span>
        </div>

        {/* Order ID Banner */}
        <div className="rounded-xl sm:rounded-2xl border-2 border-dashed border-[#123B70]/30 bg-blue-50/50 p-3 sm:p-4 text-center space-y-1.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            {currentLang === "hi" ? "यूनिक ऑर्डर ट्रैकिंग आईडी (Order ID)" : "Official Order Tracking ID"}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-base sm:text-xl font-mono font-black text-[#123B70] tracking-wide break-all">
              {orderCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-lg p-1.5 bg-white border border-blue-200 text-slate-700 hover:bg-blue-100 text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-xs transition-colors shrink-0"
              title="Copy Order ID"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Payment Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 sm:p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {currentLang === "hi" ? "ऑर्डर स्थिति" : "Order Status"}
            </span>
            <span className="font-bold text-[#123B70] flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
              <span>{currentLang === "hi" ? "ऑर्डर प्राप्त (Order Received)" : "Order Received"}</span>
            </span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {currentLang === "hi" ? "भुगतान माध्यम एवं स्थिति" : "Payment Details"}
            </span>
            <div className="flex items-center justify-between gap-1.5 text-xs sm:text-sm">
              <span className="font-bold text-emerald-900 truncate">
                {isOnlinePayment
                  ? (currentLang === "hi" ? "ऑनलाइन भुगतान" : "Paid Online")
                  : (currentLang === "hi" ? "दस्तावेज भेजा • दुकान पर भुगतान" : "Send Document (Pay at Shop)")}
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white border border-emerald-300 shrink-0 uppercase">
                {isPaid ? (currentLang === "hi" ? "भुगतान पूर्ण" : "Paid") : (currentLang === "hi" ? "बाकी (Pending)" : "Pending")}
              </span>
            </div>
          </div>
        </div>

        {/* Order Quick Summary Box */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2 sm:space-y-2.5 text-xs text-slate-700">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 gap-2">
            <span className="font-bold text-slate-900 truncate">{serviceName}</span>
            {documentType && (
              <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 font-semibold text-[10px] sm:text-[11px] shrink-0">
                {documentType}
              </span>
            )}
          </div>

          {Object.entries(specifications).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
              {Object.entries(specifications).map(([key, val]) => (
                <div key={key} className="truncate">
                  <span className="font-semibold text-slate-700">{key}:</span> {val}
                </div>
              ))}
            </div>
          )}

          {finishingSelected.length > 0 && (
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

        {/* Clear Shop Pickup & Express Zero-Wait Queue Notice */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-blue-50/70 border-2 border-emerald-500/40 p-3 sm:p-4 space-y-2 sm:space-y-2.5 text-xs text-slate-800 shadow-xs">
          <div className="flex items-center gap-2 font-black text-emerald-950 text-xs sm:text-sm">
            <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{currentLang === "hi" ? "📍 दुकान से संग्रह (Shop Collection):" : "📍 Collect Order at Our Shop (Store Pickup):"}</span>
          </div>

          <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
            <strong>{business.name[currentLang]}</strong>: {business.address.line1[currentLang]}, {business.address.landmark[currentLang]}, {business.address.city[currentLang]} (Near Block Gate).
          </p>

          <div className="rounded-lg sm:rounded-xl bg-white/90 border border-emerald-200 p-2 sm:p-2.5 text-[11px] text-slate-700 space-y-1">
            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
              <span>⚡ {currentLang === "hi" ? "ऑनलाइन ऑर्डर का फायदा (Zero Waiting):" : "Why Ordering Online Saves Your Time:"}</span>
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {currentLang === "hi"
                ? "दुकान पर फ़ाइल भेजने या प्रिंटिंग के लिए लाइन में इंतज़ार नहीं करना पड़ेगा! आपका प्रिंट पहले से तैयार व पैक रहेगा — बस दुकान पहुँचकर ऑर्डर आईडी बताएं और तुरंत प्राप्त करें।"
                : "No need to wait in line or wait for your turn to send files via WhatsApp/Bluetooth! Your documents are pre-printed and packed. Just show your Order ID at the counter and collect in seconds!"}
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 sm:space-y-3 pt-1">
          {/* Primary CTA: Track Order */}
          <Link
            to={`/order-status?code=${orderCode}`}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer"
          >
            <span>{currentLang === "hi" ? "ऑर्डर लाइव ट्रैक करें" : "Track Order Status"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to="/account/orders"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 sm:py-2.5 text-xs font-bold text-slate-800 transition-colors text-center cursor-pointer"
            >
              <span>{currentLang === "hi" ? "मेरे ऑर्डर्स देखें" : "View My Orders"}</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2 sm:py-2.5 text-xs font-bold text-slate-700 transition-colors text-center cursor-pointer"
            >
              {currentLang === "hi" ? "नया ऑर्डर करें" : "Order More"}
            </button>
          </div>

          {/* Secondary Support Option: Chat on WhatsApp */}
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 text-center">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{currentLang === "hi" ? "मदद चाहिए? व्हाट्सएप पर पूछें" : "Need help? Chat on WhatsApp"}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
