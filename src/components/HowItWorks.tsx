import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { MousePointerClick, PhoneCall, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

export const HowItWorks: React.FC = () => {
  const { lang, language, t } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const steps = [
    {
      number: "01",
      icon: MousePointerClick,
      title: { en: "Choose a Service", hi: "सेवा चुनें" },
      desc: {
        en: "Select the printing, photo, document, or online application you need.",
        hi: "अपनी आवश्यकता अनुसार प्रिंटिंग, फोटो या ऑनलाइन फॉर्म सेवा का चयन करें।",
      },
      color: "text-blue-400 bg-blue-600/20",
    },
    {
      number: "02",
      icon: PhoneCall,
      title: { en: "Contact or Visit Us", hi: "संपर्क करें या केंद्र पर आएँ" },
      desc: {
        en: "Call, message us on WhatsApp, or visit our center near Block Gate, Chakia.",
        hi: "कॉल करें, व्हाट्सएप पर जानकारी भेजें, या हमारे केंद्र पर पधारें।",
      },
      color: "text-amber-400 bg-amber-600/20",
    },
    {
      number: "03",
      icon: CheckCircle,
      title: { en: "Get Your Work Done", hi: "अपना काम पूरा करवाएँ" },
      desc: {
        en: "Receive your high-quality prints, photos, or completed applications smoothly.",
        hi: "उच्च गुणवत्ता वाले प्रिंट, फोटो या ऑनलाइन आवेदन का काम तुरंत प्राप्त करें।",
      },
      color: "text-emerald-400 bg-emerald-600/20",
    },
  ];

  return (
    <section className="py-16 bg-slate-900 text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3.5 py-1 rounded-full uppercase tracking-wider">
            {currentLang === "hi" ? "सरल 3 चरण" : "Simple 3 Steps"}
          </span>
          <h2
            className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-3",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi" ? "काम पूरा करवाने की आसान प्रक्रिया" : "How It Works"}
          </h2>
          <p
            className={cn(
              "text-slate-300 mt-2 text-sm sm:text-base",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* 3 Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-7 relative hover:border-slate-600 transition-all group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black text-slate-600 select-none">
                    {step.number}
                  </span>
                </div>

                <h3
                  className={cn(
                    "text-xl font-bold text-white mb-2",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {step.title[currentLang]}
                </h3>
                <p
                  className={cn(
                    "text-slate-300 text-sm leading-relaxed",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {step.desc[currentLang]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
