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
        <div className="rounded-card border border-line bg-gradient-to-r from-red-600 via-red-700 to-blue-900 p-6 sm:p-10 shadow-card text-white text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            {language === "hi"
              ? "प्रिंटिंग, फोटो या ऑनलाइन सेवा के लिए आज ही संपर्क करें"
              : "Need Printing, Photo or Online Form Work Done Today?"}
          </h2>

          <p className="text-red-100 text-base sm:text-lg max-w-2xl mx-auto">
            {language === "hi"
              ? "ब्लॉक गेट चकिया के पास हमारे केंद्र पर आएँ या हमें फोन/व्हाट्सएप पर तुरंत संपर्क करें।"
              : "Visit our center near Block Gate, Chakia or contact us instantly via call or WhatsApp."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="w-full sm:w-auto px-8 py-4 rounded-pill bg-white text-red-700 font-extrabold shadow-card hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 text-base"
            >
              <Phone className="w-5 h-5 fill-red-700" />
              <span>Call {businessConfig.phoneNumbers.displayPrimary}</span>
            </a>

            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20get%20service.`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-pill bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-card transition-all flex items-center justify-center space-x-2 text-base"
            >
              <MessageSquare className="w-5 h-5 fill-white" />
              <span>WhatsApp Us</span>
            </a>

            <button
              onClick={onOpenRequestModal}
              className="w-full sm:w-auto px-8 py-4 rounded-pill bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-card transition-all flex items-center justify-center space-x-2 text-base border border-slate-700 cursor-pointer"
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
