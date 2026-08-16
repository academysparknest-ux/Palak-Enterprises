import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Phone, MessageSquare, ArrowRight } from "lucide-react";

interface ContactCTAProps {
  onOpenRequestModal: () => void;
}

export const ContactCTA: React.FC<ContactCTAProps> = ({ onOpenRequestModal }) => {
  const { language } = useLanguage();

  return (
    <section className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-6 sm:p-10 shadow-raised text-white text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {language === "hi"
              ? "प्रिंटिंग, फोटो या ऑनलाइन सेवा के लिए आज ही संपर्क करें"
              : "Need Printing, Photo or Online Form Work Done Today?"}
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {language === "hi"
              ? "ब्लॉक गेट चकिया के पास हमारे केंद्र पर आएँ या हमें फोन/व्हाट्सएप पर तुरंत संपर्क करें।"
              : "Visit our center near Block Gate, Chakia or contact us instantly via call or WhatsApp."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="w-full sm:w-auto px-7 py-3.5 rounded-pill bg-brandred hover:bg-red-800 text-white font-bold shadow-card transition-all flex items-center justify-center space-x-2 text-base"
            >
              <Phone className="w-5 h-5 fill-current" />
              <span>{language === "hi" ? "कॉल करें: " : "Call: "}{businessConfig.phoneNumbers.displayPrimary}</span>
            </a>

            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20get%20service.`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-pill bg-leaf hover:bg-emerald-800 text-white font-bold shadow-card transition-all flex items-center justify-center space-x-2 text-base"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              <span>{language === "hi" ? "व्हाट्सएप करें" : "WhatsApp Us"}</span>
            </a>

            <button
              onClick={onOpenRequestModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-pill bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold shadow-card transition-all flex items-center justify-center space-x-2 text-base border border-slate-600 cursor-pointer"
            >
              <span>{language === "hi" ? "ऑनलाइन अनुरोध भेजें" : "Submit Online Request"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
