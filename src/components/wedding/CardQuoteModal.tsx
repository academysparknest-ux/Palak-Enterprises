import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X, Sparkles, Send, CheckCircle2, AlertCircle, MessageSquare, ArrowRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { PalakDataStore } from "../../lib/storage/store";
import { type LocalProduct } from "../../lib/storage/catalogData";
import { getWhatsAppLink } from "../../config/business";
import { useScrollLock } from "../../hooks/useScrollLock";

interface CardQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LocalProduct | null;
}

export const CardQuoteModal: React.FC<CardQuoteModalProps> = ({
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

  const [quantity, setQuantity] = useState("100");
  const [printingRequirements, setPrintingRequirements] = useState<string[]>([
    "Hindi / Sanskrit Shloka Calligraphy",
    "Screen Print with Gold / Foil Finish",
  ]);
  const [eventDate, setEventDate] = useState("");
  const [fulfillmentPreference, setFulfillmentPreference] = useState<"pickup" | "delivery">("pickup");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuoteCode, setSubmittedQuoteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const quantityPresets = ["50", "100", "200", "300", "500", "1000"];

  const togglePrintingRequirement = (req: string) => {
    setPrintingRequirements((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!customerName.trim() || cleanPhone.length < 10) {
      setError(
        currentLang === "hi"
          ? "कृपया अपना नाम और 10 अंकों का वैध व्हाट्सएप नंबर दर्ज करें"
          : "Please enter your name and valid 10-digit mobile number"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const details = [
        `Card: ${product.name.en} (SKU: ${product.sku || product.id})`,
        `Card Type: ${product.cardType || "N/A"}`,
        `Selected Quantity: ${quantity} cards`,
        `Printing Requirements: ${printingRequirements.join(", ")}`,
        `Fulfillment: ${fulfillmentPreference === "pickup" ? "Chakia Store Pickup" : "Delivery"}`,
        eventDate ? `Event Date: ${eventDate}` : null,
        additionalNotes ? `Notes: ${additionalNotes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const result = await PalakDataStore.createQuoteRequest({
        serviceOrProductType: `Wedding Card: ${product.name.en} (${product.sku || product.id})`,
        quantity: `${quantity} Cards`,
        materialPreferences: product.material || "Standard Cardstock",
        requiredByDate: eventDate || undefined,
        designStatus: "need_design",
        additionalDetails: details,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
      });

      setSubmittedQuoteCode(result.quoteCode);
    } catch (err: any) {
      setError(err.message || "Failed to submit quote request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappFollowup = submittedQuoteCode
    ? getWhatsAppLink(
        `Hello Palak Enterprises, I submitted Wedding Card Quote Request *${submittedQuoteCode}* for *${product.name.en}* (SKU: ${product.sku || product.id}). Please provide final estimate.`
      )
    : "";

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
        className="relative flex flex-col w-full max-w-lg max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(90vh,820px)] rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#881337] to-[#4c0519] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">
                {currentLang === "hi" ? "कार्ड कोटेशन अनुरोध" : "Get a Wedding Card Quote"}
              </h3>
              <span className="text-[11px] text-amber-200 block">
                {product.sku} • {product.name[currentLang]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {submittedQuoteCode ? (
            <div className="text-center space-y-4 py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <h4 className="text-xl font-extrabold text-slate-900">
                {currentLang === "hi" ? "कोटेशन अनुरोध सफलतापूर्वक दर्ज हुआ!" : "Quote Request Received!"}
              </h4>

              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {currentLang === "hi"
                  ? "हमारी टीम आपकी चुनी हुई मात्रा और प्रिंटिंग विकल्पों की समीक्षा कर जल्द ही आपसे संपर्क करेगी।"
                  : "Palak printing team will review your specifications, calculate the best volume rate, and connect with you."}
              </p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 max-w-xs mx-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Quote Reference ID
                </span>
                <span className="text-lg font-black text-[#881337] tracking-wider block">
                  {submittedQuoteCode}
                </span>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={whatsappFollowup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold shadow-xs"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Talk on WhatsApp</span>
                </a>

                <Link
                  to={`/track-order?code=${submittedQuoteCode}`}
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 text-xs font-bold"
                >
                  <span>Track Status</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Product preview summary card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg object-contain bg-slate-900 shrink-0"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900">{product.name[currentLang]}</div>
                  <div className="text-slate-500">
                    Showroom Rate: Approx ₹{product.pricePerCard || product.startingPrice}/card
                  </div>
                </div>
              </div>

              {/* Quantity Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {currentLang === "hi" ? "कार्ड की संख्या (Quantity) *" : "Select Card Quantity *"}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                  {quantityPresets.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        quantity === qty
                          ? "bg-[#881337] text-white border-[#881337]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Or enter custom number e.g. 250"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                />
              </div>

              {/* Printing & Customization Options Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {currentLang === "hi" ? "प्रिंटिंग व कस्टमाइज़ेशन आवश्यकताएं" : "Printing & Customization Needs"}
                </label>
                <div className="space-y-1.5 text-xs">
                  {[
                    "Hindi / Sanskrit Shloka Calligraphy (मंत्र व श्लोक)",
                    "Gold Foil Hot Stamping (सुनहरे उभरे अक्षर)",
                    "Multi-color Inserts for Sangeet/Haldi (अलग इनसर्ट्स)",
                    "Matching Customized Envelopes (लिफाफे सहित)",
                  ].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={printingRequirements.includes(opt)}
                        onChange={() => togglePrintingRequirement(opt)}
                        className="rounded text-[#881337] focus:ring-[#881337]"
                      />
                      <span className="text-slate-800">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Date & Pickup Preference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "आयोजन की तारीख (वैकल्पिक)" : "Event / Wedding Date"}
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "प्राप्ति का माध्यम" : "Collection Preference"}
                  </label>
                  <select
                    value={fulfillmentPreference}
                    onChange={(e: any) => setFulfillmentPreference(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                  >
                    <option value="pickup">Chakia Store Pickup (दुकान से संग्रह)</option>
                    <option value="delivery">Local Courier / Home Delivery (होम डिलीवरी)</option>
                  </select>
                </div>
              </div>

              {/* Customer Contact Information */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "आपका नाम *" : "Your Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
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
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "ईमेल पता (वैकल्पिक)" : "Email Address (Optional)"}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. rajesh@example.com"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "विशेष निर्देश / श्लोक विवरण" : "Special Text or Design Instructions"}
                </label>
                <textarea
                  rows={2}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g. Bride & Groom names, specific shloka requirements, or rush deadline..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#881337] focus:outline-hidden"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#881337] hover:bg-[#700f2d] text-white py-3 text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? "Submitting Quote..."
                    : currentLang === "hi"
                    ? "कोटेशन अनुरोध भेजें"
                    : "Request Quotation & Rate"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CardQuoteModal;
