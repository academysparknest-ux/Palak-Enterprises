import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Phone, MessageSquare } from "lucide-react";

export const FloatingActions: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col space-y-2.5 pointer-events-auto">
      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
        target="_blank"
        rel="noreferrer"
        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        title={language === "hi" ? "व्हाट्सएप पर संपर्क करें" : "Chat on WhatsApp"}
        aria-label={language === "hi" ? "व्हाट्सएप पर चैट करें" : "Chat on WhatsApp"}
      >
        <MessageSquare className="w-5 h-5 fill-white" />
      </a>

      {/* Floating Call Button */}
      <a
        href={`tel:${businessConfig.phoneNumbers.primary}`}
        className="w-12 h-12 rounded-full bg-[#123B70] hover:bg-[#0c274c] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
        title={language === "hi" ? "पालक इंटरप्राइजेज को कॉल करें" : "Call Palak Enterprises"}
        aria-label={language === "hi" ? "अभी कॉल करें" : "Call Now"}
      >
        <Phone className="w-5 h-5" />
      </a>
    </div>
  );
};

export default FloatingActions;
