import React, { useState, useMemo } from "react";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { faqData, faqCategories } from "../config/faqs";
import { businessConfig } from "../config/business";
import {
  ChevronDown,
  HelpCircle,
  Search,
  X,
  Phone,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

export const FAQPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(faqData[0]?.id || null);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredFaqs = useMemo(() => {
    return faqData.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;

      if (!searchQuery.trim()) return categoryMatch;

      const q = searchQuery.toLowerCase().trim();
      const qEn = item.question.en.toLowerCase();
      const qHi = item.question.hi.toLowerCase();
      const aEn = item.answer.en.toLowerCase();
      const aHi = item.answer.hi.toLowerCase();

      return categoryMatch && (qEn.includes(q) || qHi.includes(q) || aEn.includes(q) || aHi.includes(q));
    });
  }, [activeCategory, searchQuery]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.slice(0, 12).map((f) => ({
      "@type": "Question",
      "name": f.question.en,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer.en
      }
    }))
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Frequently Asked Questions (FAQ) | Palak Enterprises Chakia",
          hi: "अक्सर पूछे जाने वाले सवाल (FAQ) | पालक इंटरप्राइजेज चकिया",
        }}
        description={{
          en: "Find answers to frequently asked questions about printing, photocopy, passport photos, online RTPS certificate assistance, pensions, timings, and websites at Palak Enterprises Chakia.",
          hi: "पालक इंटरप्राइजेज चकिया में प्रिंटिंग, फोटोकॉपी, पासपोर्ट फोटो, जाति-आय-निवास फॉर्म, पेंशन योजना, समय और वेबसाइट से जुड़े सवालों के जवाब।",
        }}
        canonicalUrl="/faq"
        keywords="FAQ Palak Enterprises, printing press Chakia questions, CSC center Chakia timings, print rates Chakia"
        structuredData={faqSchema}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "FAQ", hi: "प्रश्न-उत्तर" }, path: "/faq" },
        ]}
        badge={{
          en: "Help & Common Questions",
          hi: "मदद एवं सामान्य सवाल",
        }}
        title={{
          en: "Frequently Asked Questions",
          hi: "अक्सर पूछे जाने वाले सवाल और जवाब (FAQ)",
        }}
        subtitle={{
          en: "Clear, helpful information about our printing processes, online government form assistance, business hours, and custom orders.",
          hi: "प्रिंटिंग, ऑनलाइन सरकारी फॉर्म प्रक्रिया, कार्य समय और ऑर्डर से जुड़े आम सवालों के स्पष्ट जवाब।",
        }}
        primaryCta={{
          label: { en: "Ask on WhatsApp", hi: "व्हाट्सएप पर पूछें" },
          to: `https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20have%20a%20question.`,
        }}
        secondaryCta={{
          label: { en: "Contact Center", hi: "केंद्र पर संपर्क करें" },
          to: "/contact",
        }}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Search & Category Filter */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-6 mb-8 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                currentLang === "hi"
                  ? "प्रश्न खोजें (जैसे: पासपोर्ट फोटो, समय, व्हाट्सएप, प्रमाण पत्र)..."
                  : "Search questions (e.g. passport photo, timings, WhatsApp, certificates)..."
              }
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy transition-all shadow-inner"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            {faqCategories.map((cat) => {
              const count =
                cat.id === "all"
                  ? faqData.length
                  : faqData.filter((f) => f.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-navy text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat.label[currentLang]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordions */}
        {filteredFaqs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">
              {currentLang === "hi" ? "कोई उत्तर नहीं मिला" : "No matching questions found"}
            </h3>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              {currentLang === "hi"
                ? "कृपया अलग शब्द से खोजें या सीधे हमारे फोन/व्हाट्सएप पर अपना सवाल पूछें।"
                : "Try a different search term or ask us directly via phone or WhatsApp."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-navy text-white font-bold text-xs"
            >
              {currentLang === "hi" ? "सभी सवाल देखें" : "View All Questions"}
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFaqs.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(item.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-bold text-slate-900 hover:text-navy text-base focus:outline-none cursor-pointer"
                  >
                    <span className="flex items-center space-x-3 pr-3">
                      <HelpCircle className="w-5 h-5 text-navy shrink-0" />
                      <span className={cn(currentLang === "hi" && "font-hindi")}>
                        {item.question[currentLang]}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-navy" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      className={cn(
                        "px-5 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 bg-slate-50/50",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {item.answer[currentLang]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Direct Inquiry Box */}
        <div className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-navy bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Support</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            {currentLang === "hi" ? "कोई अन्य सवाल है जो यहाँ नहीं मिला?" : "Have a Question Not Listed Here?"}
          </h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            {currentLang === "hi"
              ? "हमसे सीधे फोन या व्हाट्सएप पर संपर्क करें। हम आपकी पूरी सहायता करेंगे।"
              : "Feel free to call or message us directly on WhatsApp. We will be happy to assist you."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="px-5 py-2.5 rounded-pill bg-brandred hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center space-x-1.5"
            >
              <Phone className="w-4 h-4" />
              <span>Call {businessConfig.phoneNumbers.primary}</span>
            </a>
            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20have%20a%20question.`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-pill bg-leaf hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center space-x-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
