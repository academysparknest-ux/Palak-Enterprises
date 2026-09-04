import React from "react";
import { Link } from "react-router-dom";
import { Home, Printer, FileText, Phone, ArrowLeft, MessageSquare } from "lucide-react";
import { SEO } from "../components/SEO";
import { useLanguage } from "../context/LanguageContext";
import { getWhatsAppLink } from "../config/business";

export const NotFoundPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:py-24">
      <SEO
        title={{
          en: "404 - Page Not Found",
          hi: "404 - पृष्ठ नहीं मिला",
        }}
        description={{
          en: "The page you are looking for might have been moved, removed, or is temporarily unavailable.",
          hi: "आप जिस पृष्ठ की तलाश कर रहे हैं, वह स्थानांतरित कर दिया गया है या अनुपलब्ध है।",
        }}
        noIndex={true}
      />

      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-amber-100 text-amber-600 font-display text-4xl font-extrabold shadow-inner ring-8 ring-amber-50">
            404
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {currentLang === "hi" ? "पृष्ठ नहीं मिला (Page Not Found)" : "Page Not Found"}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            {currentLang === "hi"
              ? "क्षमा करें, आप जिस लिंक पर आए हैं वह मौजूद नहीं है या बदल दिया गया है। कृपया नीचे दिए गए विकल्पों से सही पृष्ठ पर जाएँ।"
              : "Sorry, the page you are looking for does not exist or may have been moved. Please use the links below to find what you need."}
          </p>
        </div>

        {/* Quick Help Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
          <Link
            to="/"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#123B70] hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-[#123B70] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">
                {currentLang === "hi" ? "मुख्य पृष्ठ (Homepage)" : "Homepage"}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentLang === "hi" ? "शुरुआती स्क्रीन पर लौटें" : "Return to main catalog"}
              </div>
            </div>
          </Link>

          <Link
            to="/online-services/document-printing"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#123B70] hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">
                {currentLang === "hi" ? "दस्तावेज़ प्रिंटिंग" : "Document Printing"}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentLang === "hi" ? "ऑनलाइन PDF व फोटोकॉपी" : "Upload & print instantly"}
              </div>
            </div>
          </Link>

          <Link
            to="/online-services/passport-photo"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#123B70] hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">
                {currentLang === "hi" ? "पासपोर्ट फोटो सेवा" : "Passport Photos"}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentLang === "hi" ? "5 मिनट में तत्काल फोटो" : "Instant 5-minute prints"}
              </div>
            </div>
          </Link>

          <Link
            to="/contact"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#123B70] hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">
                {currentLang === "hi" ? "संपर्क केंद्र" : "Contact & Support"}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentLang === "hi" ? "दुकान का पता व फ़ोन" : "Call or visit our shop"}
              </div>
            </div>
          </Link>
        </div>

        {/* Fallback CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white px-5 py-2.5 text-xs font-bold transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentLang === "hi" ? "मुख्य पृष्ठ पर जाएं" : "Back to Home"}</span>
          </Link>

          <a
            href={getWhatsAppLink("Hello Palak Enterprises, I was browsing your website and encountered a page not found. Need help.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition-colors shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{currentLang === "hi" ? "व्हाट्सएप पर पूछें" : "Chat on WhatsApp"}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
