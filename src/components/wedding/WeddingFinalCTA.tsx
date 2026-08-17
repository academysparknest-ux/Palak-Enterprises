import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, ArrowUp } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getWhatsAppLink } from "../../config/business";

interface WeddingFinalCTAProps {
  onScrollToTop: () => void;
  onOpenCustomQuote?: () => void;
}

export const WeddingFinalCTA: React.FC<WeddingFinalCTAProps> = ({
  onScrollToTop,
  onOpenCustomQuote,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const waFinalUrl = getWhatsAppLink(
    "Hello Palak Enterprises, I am planning an upcoming ceremony and would like to discuss card design, pricing, and custom printing."
  );

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#881337] via-[#5b0e25] to-[#1e050c] p-8 sm:p-12 text-white shadow-xl text-center space-y-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-3 relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1 text-xs font-bold">
          <Sparkles className="h-4 w-4" />
          <span>{currentLang === "hi" ? "शुभ आरंभ, सुंदर आमंत्रण" : "Crafted With Care in Chakia"}</span>
        </span>

        <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
          {currentLang === "hi"
            ? "क्या आपके घर कोई मांगलिक उत्सव है?"
            : "Planning a Special Event?"}
        </h2>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl mx-auto">
          {currentLang === "hi"
            ? "हम आपके अवसर को और भी खास बनाने के लिए सुंदर, सुरुचिपूर्ण एवं किफायती कार्ड तैयार करने में आपकी पूरी सहायता करेंगे।"
            : "Let us help you create an invitation card that feels as special and auspicious as the sacred occasion itself."}
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4 relative z-10">
        <button
          type="button"
          onClick={onScrollToTop}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3.5 text-xs sm:text-sm font-extrabold shadow-md hover:scale-105 transition-all cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" />
          <span>{currentLang === "hi" ? "कार्ड्स ब्राउज़ करें" : "Browse Cards"}</span>
        </button>

        {onOpenCustomQuote ? (
          <button
            type="button"
            onClick={onOpenCustomQuote}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3.5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{currentLang === "hi" ? "कस्टम डिज़ाइन मांगें" : "Request Custom Design"}</span>
          </button>
        ) : (
          <Link
            to="/request-quote"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3.5 text-xs sm:text-sm font-bold text-white transition-colors"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{currentLang === "hi" ? "कस्टम डिज़ाइन मांगें" : "Request Custom Design"}</span>
          </Link>
        )}

        <a
          href={waFinalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3.5 text-xs sm:text-sm font-bold shadow-xs transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span>WhatsApp Us</span>
        </a>
      </div>
    </section>
  );
};

export default WeddingFinalCTA;
