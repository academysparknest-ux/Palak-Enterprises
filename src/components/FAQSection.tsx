import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { faqData } from "../config/faqs";
import { ChevronDown, HelpCircle } from "lucide-react";

export const FAQSection: React.FC = () => {
  const { language, t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(faqData[0].id);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider">
            {language === "hi" ? "सवाल और जवाब" : "Got Questions?"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            {t.faq.title}
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            {t.faq.subtitle}
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqData.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 hover:text-blue-900 text-base sm:text-lg focus:outline-none"
                >
                  <span className="flex items-center space-x-3">
                    <HelpCircle className="w-5 h-5 text-blue-900 shrink-0" />
                    <span>{item.question[language]}</span>
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-blue-900" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {item.answer[language]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
