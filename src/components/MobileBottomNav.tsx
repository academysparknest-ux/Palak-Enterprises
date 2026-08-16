import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Home, Layers, Phone, MessageSquare, FileUp } from "lucide-react";

interface MobileBottomNavProps {
  onOpenRequestModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenRequestModal }) => {
  const { language, t } = useLanguage();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-lg"
      aria-label="Mobile Navigation Bar"
    >
      <div className="flex items-center justify-around text-center">
        <a
          href="#home"
          className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[44px] text-slate-600 hover:text-blue-900 active:text-blue-900 transition-colors"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">{t.nav.home}</span>
        </a>

        <a
          href="#services"
          className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[44px] text-slate-600 hover:text-blue-900 active:text-blue-900 transition-colors"
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">{t.nav.services}</span>
        </a>

        <button
          onClick={onOpenRequestModal}
          className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] text-blue-900 font-bold transition-colors focus:outline-none"
          aria-label={language === "hi" ? "अनुरोध भेजें" : "Submit Request"}
        >
          <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-md mb-0.5 -mt-3 border-2 border-white">
            <FileUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-blue-950 leading-none">
            {language === "hi" ? "अनुरोध" : "Request"}
          </span>
        </button>

        <a
          href={`tel:${businessConfig.phoneNumbers.primary}`}
          className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[44px] text-red-600 hover:text-red-700 active:text-red-700 transition-colors"
          aria-label="Call Now"
        >
          <Phone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">{t.nav.callNow}</span>
        </a>

        <a
          href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[44px] text-emerald-600 hover:text-emerald-700 active:text-emerald-700 transition-colors"
          aria-label="Chat on WhatsApp"
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">WhatsApp</span>
        </a>
      </div>
    </nav>
  );
};
