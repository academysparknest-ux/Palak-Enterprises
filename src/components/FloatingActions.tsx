import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Phone, MessageSquare } from "lucide-react";

export const FloatingActions: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col space-y-3 pointer-events-auto">
      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
        target="_blank"
        rel="noreferrer"
        className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        title={language === "hi" ? "व्हाट्सएप पर संपर्क करें" : "Chat on WhatsApp"}
        aria-label={language === "hi" ? "व्हाट्सएप पर चैट करें" : "Chat on WhatsApp"}
      >
        <MessageSquare className="w-6 h-6 fill-white" />
      </a>

      {/* Floating Call Button */}
      <a
        href={`tel:${businessConfig.phoneNumbers.primary}`}
        className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-red-300"
        title={language === "hi" ? "पालक इंटरप्राइजेज को कॉल करें" : "Call Palak Enterprises"}
        aria-label={language === "hi" ? "अभी कॉल करें" : "Call Now"}
      >
        <Phone className="w-6 h-6" />
      </a>
    </div>
  );
};
