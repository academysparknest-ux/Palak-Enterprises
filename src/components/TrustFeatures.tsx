import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { Sparkles, CheckCircle2, Languages, MapPin, Briefcase } from "lucide-react";
import { cn } from "../lib/utils";

export const TrustFeatures: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const benefits = [
    {
      icon: Sparkles,
      title: { en: "Easy Process", hi: "सरल प्रक्रिया" },
      desc: {
        en: "Simple, friendly guidance for senior citizens, students, and local customers.",
        hi: "वरिष्ठ नागरिकों, विद्यार्थियों और ग्राहकों के लिए सरल और सहज कार्य प्रक्रिया।",
      },
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      icon: CheckCircle2,
      title: { en: "Multiple Services", hi: "कई सेवाएँ एक ही जगह" },
      desc: {
        en: "From printing and passport photos to online applications and custom websites.",
        hi: "प्रिंटिंग व फोटो से लेकर सरकारी ऑनलाइन फॉर्म और वेबसाइट तक सभी सुविधाएँ।",
      },
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      icon: Languages,
      title: { en: "Bilingual Support", hi: "हिंदी और अंग्रेजी सहायता" },
      desc: {
        en: "Clear explanations and full service support in both Hindi and English.",
        hi: "हिंदी और अंग्रेजी दोनों भाषाओं में स्पष्ट जानकारी और संपूर्ण सहयोग।",
      },
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      icon: MapPin,
      title: { en: "Convenient Local Service", hi: "आसानी से उपलब्ध स्थानीय सेवा" },
      desc: {
        en: "Centrally located near Block Gate, Chakia, East Champaran, Bihar for quick access.",
        hi: "ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार में आसानी से पहुँचने योग्य केंद्र।",
      },
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      icon: Briefcase,
      title: { en: "Professional Work", hi: "प्रोफेशनल कार्य" },
      desc: {
        en: "Clean prints, sharp colors, accurate form filling, and attentive service.",
        hi: "साफ़ प्रिंटिंग, सटीक फॉर्म भरना और हर काम में पूरी निष्ठा व गुणवत्ता।",
      },
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
  ];

  return (
    <section className="py-16 bg-slate-50 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-navy bg-blue-100/70 border border-blue-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
            {currentLang === "hi" ? "पालक इंटरप्राइजेज की विशेषताएँ" : "Why Palak Enterprises"}
          </span>
          <h2
            className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-3",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi" ? "विश्वसनीय, सरल और स्थानीय सेवा" : "Simple, Reliable & Convenient"}
          </h2>
          <p
            className={cn(
              "text-slate-600 mt-2 text-sm sm:text-base",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi"
              ? "हम गुणवत्ता और ग्राहक संतुष्टि को प्राथमिकता देते हैं।"
              : "Quality printing craftsmanship combined with friendly local assistance."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-line bg-white hover:shadow-md transition-all flex items-start space-x-4"
              >
                <div className={`p-3 rounded-xl border shrink-0 ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3
                    className={cn(
                      "font-bold text-slate-900 text-lg mb-1",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {item.title[currentLang]}
                  </h3>
                  <p
                    className={cn(
                      "text-slate-600 text-sm leading-relaxed",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {item.desc[currentLang]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustFeatures;
