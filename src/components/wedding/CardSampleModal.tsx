import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { type LocalProduct } from "../../lib/storage/catalogData";
import { getWhatsAppLink } from "../../config/business";
import { useScrollLock } from "../../hooks/useScrollLock";

interface CardSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LocalProduct | null;
}

export const CardSampleModal: React.FC<CardSampleModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  useScrollLock(isOpen && Boolean(product));

  useEffect(() => {
    if (!isOpen || !product) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, product, onClose]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [sampleType, setSampleType] = useState<"store_visit" | "courier">("store_visit");
  const [visitDate, setVisitDate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!customerName.trim() || cleanPhone.length < 10) {
      setError(
        currentLang === "hi"
          ? "कृपया अपना नाम और 10 अंकों का वैध फोन नंबर दर्ज करें"
          : "Please enter your name and valid 10-digit mobile number"
      );
      return;
    }

    setSubmitted(true);
  };

  const whatsappVisitLink = getWhatsAppLink(
    `Hello Palak Enterprises, I would like to request a physical sample / schedule a showroom viewing for *${product.name.en}* (SKU: ${product.sku || product.id}).
Customer: ${customerName} (${customerPhone})
Preference: ${sampleType === "store_visit" ? "In-Store Viewing at Chakia" : "Courier Sample"}`
  );

  if (!isOpen || !product || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative flex flex-col w-full max-w-md max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(90vh,760px)] rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#123B70] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-300" />
            <h3 className="text-sm font-bold">
              {currentLang === "hi" ? "फिजिकल सैंपल / स्टोर विज़िट" : "Request Sample / Store Viewing"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {submitted ? (
            <div className="text-center space-y-4 py-3">
              <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                {currentLang === "hi" ? "अनुरोध दर्ज हुआ!" : "Sample Request Registered!"}
              </h4>
              <p className="text-xs text-slate-600">
                {currentLang === "hi"
                  ? "आप चकिया स्थित हमारे स्टोर पर पधारकर इस कार्ड का पेपर, फॉयल और बनावट प्रत्यक्ष देख सकते हैं।"
                  : "You are welcome to visit our Chakia store (Near Block Gate) to feel the paper texture, foil embossing, and explore 500+ physical samples."}
              </p>
              <div className="pt-2">
                <a
                  href={whatsappVisitLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-xs font-bold shadow-xs"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Confirm on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs">
                <span className="text-slate-400 block text-[10px]">Requested Card</span>
                <span className="font-bold text-slate-900">{product.name[currentLang]}</span>
                <span className="text-[11px] text-[#881337] font-semibold block">{product.sku}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "सैंपल देखने का माध्यम" : "Viewing Preference"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSampleType("store_visit")}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      sampleType === "store_visit"
                        ? "bg-blue-50 border-[#123B70] text-[#123B70] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    Chakia Store Visit (चकिया दुकान)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSampleType("courier")}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      sampleType === "courier"
                        ? "bg-blue-50 border-[#123B70] text-[#123B70] font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    Courier Sample (कूरियर सैंपल)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "आपका नाम *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "व्हाट्सएप मोबाइल नंबर *" : "WhatsApp Mobile Number *"}
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9905238015"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "अनुमानित विज़िट की तारीख (वैकल्पिक)" : "Expected Visit Date (Optional)"}
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {currentLang === "hi" ? "सैंपल अनुरोध भेजें" : "Submit Sample Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CardSampleModal;
