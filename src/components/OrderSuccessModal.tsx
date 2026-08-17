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

  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isOnlinePayment = paymentMethod === "upi_online" || paymentMethod === "pay_online";
  const isPaid = paymentStatus === "confirmed" || paymentStatus === "paid";

  // Optional WhatsApp support query (never contains private storage URLs)
  const waSupportMsg = `Hello Palak Enterprises,\n\nI have a question regarding my order.\n\nOrder ID: ${orderCode}\nService: ${serviceName}\nCustomer: ${customerName} (${customerPhone})\n\nThank you!`;
  const waLink = getWhatsAppLink(waSupportMsg);

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
            {currentLang === "hi" ? "✓ ऑर्डर सफलतापूर्वक दर्ज हुआ!" : "✓ Order Submitted Successfully!"}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            {currentLang === "hi"
              ? "आपका ऑर्डर पालक एंटरप्राइजेज एडमिन पोर्टल पर प्राप्त हो गया है। तैयार होने पर आपको सूचित किया जाएगा।"
              : "Your order is registered in our production queue. We'll prepare your order and update its status when it is ready for pickup."}
          </p>
        </div>

        {/* Order ID Banner */}
        <div className="rounded-2xl border-2 border-dashed border-[#123B70]/30 bg-blue-50/50 p-4 text-center space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {currentLang === "hi" ? "यूनिक ऑर्डर ट्रैकिंग आईडी (Order ID)" : "Official Order Tracking ID"}
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

        {/* Status & Payment Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {currentLang === "hi" ? "ऑर्डर स्थिति" : "Order Status"}
            </span>
            <span className="font-bold text-[#123B70] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>{currentLang === "hi" ? "ऑर्डर प्राप्त (Order Received)" : "Order Received"}</span>
            </span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {currentLang === "hi" ? "भुगतान माध्यम एवं स्थिति" : "Payment Method"}
            </span>
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span>{isOnlinePayment ? "Pay Online" : "Pay at Shop"}</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-white border border-emerald-300">
                {isPaid ? "Paid" : "Pending"}
              </span>
            </span>
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
            <span className="text-base text-[#123B70]">
              {totalAmount > 0 ? `₹${totalAmount}` : "Price upon review"}
            </span>
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

        {/* Primary Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* Primary CTA: Track Order */}
          <Link
            to={`/order-status?code=${orderCode}`}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer"
          >
            <span>{currentLang === "hi" ? "ऑर्डर लाइव ट्रैक करें" : "Track Order Status"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/account/orders"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 transition-colors text-center cursor-pointer"
            >
              <span>{currentLang === "hi" ? "मेरे ऑर्डर्स देखें" : "View My Orders"}</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors text-center cursor-pointer"
            >
              {currentLang === "hi" ? "नया ऑर्डर करें" : "Order More"}
            </button>
          </div>

          {/* Secondary Support Option: Chat on WhatsApp */}
          <div className="pt-2 border-t border-slate-100 text-center">
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
  );
};
