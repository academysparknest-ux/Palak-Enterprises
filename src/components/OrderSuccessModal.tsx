import React from "react";
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
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Build clean WhatsApp message (no private storage URL)
  let waMsg = `Hello Palak Enterprises,\n\nI have submitted a print order.\n\nOrder ID: ${orderCode}\nService: ${serviceName}`;
  if (documentType) {
    waMsg += `\nDocument Type: ${documentType}`;
  }
  if (Object.keys(specifications).length > 0) {
    waMsg += `\nSpecifications:`;
    for (const [k, v] of Object.entries(specifications)) {
      waMsg += `\n- ${k}: ${v}`;
    }
  }
  if (finishingSelected.length > 0) {
    waMsg += `\nFinishing:\n${finishingSelected.map((f) => `✓ ${f}`).join("\n")}`;
  }
  if (totalAmount > 0) {
    waMsg += `\nEstimated Price: ₹${totalAmount}`;
  }
  waMsg += `\n\nCustomer: ${customerName} (${customerPhone})\nStatus: Order Received\n\nThank you.`;

  const waLink = getWhatsAppLink(waMsg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Icon Header */}
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {currentLang === "hi" ? "ऑर्डर सफलतापूर्वक प्राप्त हुआ!" : "Order Submitted Successfully!"}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            {currentLang === "hi"
              ? "पालक इंटरप्राइजेज आपका प्रिंट तैयार करेगा। ऑर्डर रेडी होने पर दुकान से कलेक्ट करें।"
              : "Palak Enterprises will process your print job. Collect it directly at the shop when ready."}
          </p>
        </div>

        {/* Order ID Banner */}
        <div className="rounded-2xl border-2 border-dashed border-[#123B70]/30 bg-blue-50/50 p-4 text-center space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {currentLang === "hi" ? "आपका यूनिक ऑर्डर आईडी (Order ID)" : "Your Order Tracking ID"}
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg sm:text-xl font-mono font-black text-[#123B70] tracking-wide">
              {orderCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-lg p-1.5 bg-white border border-blue-200 text-slate-700 hover:bg-blue-100 text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-xs transition-colors"
              title="Copy Order ID"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-700">Copied</span>
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

        {/* Order Quick Summary Box */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs text-slate-700">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-900">{serviceName}</span>
            {documentType && (
              <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 font-semibold text-[11px]">
                {documentType}
              </span>
            )}
          </div>

          {Object.entries(specifications).length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
              {Object.entries(specifications).map(([key, val]) => (
                <div key={key}>
                  <span className="font-semibold text-slate-700">{key}:</span> {val}
                </div>
              ))}
            </div>
          )}

          {finishingSelected.length > 0 && (
            <div className="pt-2 border-t border-slate-200 text-[11px]">
              <span className="font-bold text-slate-800">
                {currentLang === "hi" ? "चयनित फिनिशिंग:" : "Selected Finishing:"}
              </span>
              <ul className="mt-1 space-y-0.5 text-emerald-800 font-medium">
                {finishingSelected.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
            <span>{currentLang === "hi" ? "कुल अनुमानित राशि:" : "Estimated Total:"}</span>
            <span className="text-base text-[#123B70]">₹{totalAmount}</span>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-bold">
            <MapPin className="h-4 w-4 text-amber-700 shrink-0" />
            <span>{currentLang === "hi" ? "दुकान से पिकअप पता:" : "Collection Location:"}</span>
          </div>
          <p className="text-[11px] text-amber-800 pl-5">
            {business.address.line1[currentLang]}, {business.address.landmark[currentLang]}, {business.address.city[currentLang]}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{currentLang === "hi" ? "व्हाट्सएप पर ऑर्डर विवरण भेजें" : "Send Order Details on WhatsApp"}</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/order-status?code=${orderCode}`}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 transition-colors text-center"
            >
              <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors text-center cursor-pointer"
            >
              {currentLang === "hi" ? "नया ऑर्डर करें" : "Close / Order More"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
