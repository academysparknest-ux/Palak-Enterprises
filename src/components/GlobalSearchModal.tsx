import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, X, Printer, Globe, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { faqData, type FAQItem } from "../config/faqs";
import { useScrollLock } from "../hooks/useScrollLock";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Products (Printing & Wedding Invitations)
  const products = PalakDataStore.getProducts().filter((p) => {
    if (!q) return false;
    return (
      p.name.en.toLowerCase().includes(q) ||
      p.name.hi.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      p.shortDesc.en.toLowerCase().includes(q) ||
      p.shortDesc.hi.toLowerCase().includes(q) ||
      (p.occasion && p.occasion.toLowerCase().includes(q)) ||
      (p.style && p.style.toLowerCase().includes(q)) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Search Digital Services
  const services = PalakDataStore.getDigitalServices().filter((s) => {
    if (!q) return false;
    return (
      s.name.en.toLowerCase().includes(q) ||
      s.name.hi.toLowerCase().includes(q) ||
      s.shortDesc.en.toLowerCase().includes(q) ||
      s.shortDesc.hi.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Search FAQs
  const faqs = faqData.filter((f: FAQItem) => {
    if (!q) return false;
    return (
      f.question.en.toLowerCase().includes(q) ||
      f.question.hi.toLowerCase().includes(q) ||
      f.answer.en.toLowerCase().includes(q) ||
      f.answer.hi.toLowerCase().includes(q)
    );
  });

  const popularPillQueries = [
    { label: currentLang === "hi" ? "विजिटिंग कार्ड" : "Visiting Cards", query: "visiting" },
    { label: currentLang === "hi" ? "पैन कार्ड" : "PAN Card", query: "pan" },
    { label: currentLang === "hi" ? "फ्लेक्स बैनर" : "Flex Banners", query: "banner" },
    { label: currentLang === "hi" ? "जाति/आय प्रमाण" : "RTPS Certificates", query: "rtps" },
    { label: currentLang === "hi" ? "शादी कार्ड" : "Wedding Cards", query: "wedding" },
    { label: currentLang === "hi" ? "बिल बुक" : "Bill Books", query: "bill" },
  ];

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  const hasResults = products.length > 0 || services.length > 0 || faqs.length > 0;

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 md:p-12 lg:p-20 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] md:max-h-[min(85vh,740px)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 shrink-0 bg-white">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              currentLang === "hi"
                ? "प्रिंटिंग, पैन, सरकारी फॉर्म, शादी कार्ड खोजें..."
                : "Search printing products, PAN, government forms, wedding cards..."
            }
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-hidden text-sm sm:text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 flex-1">
          {!query && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {currentLang === "hi" ? "लोकप्रिय खोजें" : "Popular Searches"}
              </p>
              <div className="flex flex-wrap gap-2">
                {popularPillQueries.map((pill) => (
                  <button
                    key={pill.query}
                    onClick={() => setQuery(pill.query)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>{pill.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <button
                  onClick={() => handleSelect("/printing")}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 text-left cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-[#123B70]" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {currentLang === "hi" ? "प्रिंटिंग कैटलॉग" : "Printing Catalog"}
                    </div>
                    <div className="text-[11px] text-slate-400">Visiting cards, banners</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect("/services")}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 text-left cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-[#123B70]" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {currentLang === "hi" ? "संपूर्ण सेवा कैटलॉग" : "Services Catalog"}
                    </div>
                    <div className="text-[11px] text-slate-400">PAN, RTPS, Print, Design</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {query && !hasResults && (
            <div className="text-center py-10">
              <p className="text-sm font-medium text-slate-700">
                {currentLang === "hi"
                  ? `"${query}" के लिए कोई परिणाम नहीं मिला`
                  : `No results found for "${query}"`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {currentLang === "hi"
                  ? "कृपया वर्तनी जांचें या कोई अन्य शब्द खोजें।"
                  : "Try checking your spelling or search for broader keywords like 'card' or 'form'."}
              </p>
              <button
                onClick={() => handleSelect("/request-quote")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B70] hover:underline cursor-pointer"
              >
                <span>{currentLang === "hi" ? "कस्टम कोटेशन मांगें →" : "Need custom printing? Request a quote →"}</span>
              </button>
            </div>
          )}

          {/* Product Results */}
          {products.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Printer className="h-3.5 w-3.5 text-[#123B70]" />
                <span>{currentLang === "hi" ? "प्रिंटिंग उत्पाद" : "Printing Products"} ({products.length})</span>
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                {products.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      handleSelect(
                        item.categoryType === "wedding" || item.categoryId === "wedding-events"
                          ? `/wedding-events/${item.slug}`
                          : `/printing/${item.slug}`
                      )
                    }
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 p-1 flex items-center justify-center shrink-0">
                        <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-[#123B70]">
                          {item.name[currentLang]}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {item.shortDesc[currentLang]}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-bold text-slate-900">
                        ₹{item.startingPrice}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Starting / {item.unit}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Digital Service Results */}
          {services.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#123B70]" />
                <span>{currentLang === "hi" ? "ऑनलाइन व डिजिटल सेवाएँ" : "Digital & CSC Services"} ({services.length})</span>
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                {services.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(`/services/${item.slug}`)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-[#123B70]">
                        {item.name[currentLang]}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {item.shortDesc[currentLang]}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#123B70] shrink-0 ml-2">
                      <span>{currentLang === "hi" ? "आवेदन करें" : "Start"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Results */}
          {faqs.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#123B70]" />
                <span>{currentLang === "hi" ? "अक्सर पूछे जाने वाले प्रश्न" : "Frequently Asked Questions"}</span>
              </p>
              <div className="space-y-1.5">
                {faqs.slice(0, 3).map((faq: FAQItem) => (
                  <button
                    key={faq.id}
                    onClick={() => handleSelect("/faq")}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs text-slate-700 cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900">{faq.question[currentLang]}</div>
                    <div className="text-slate-500 line-clamp-1 mt-0.5">{faq.answer[currentLang]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 flex items-center justify-between shrink-0">
          <span>
            {currentLang === "hi" ? "चकिया, पूर्वी चंपारण में त्वरित सेवा" : "Fast local delivery in Chakia & Bihar"}
          </span>
          <span className="hidden sm:inline text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
