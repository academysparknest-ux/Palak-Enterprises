import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Home, Layers, Phone, MessageSquare, FileUp } from "lucide-react";
import { cn } from "../lib/utils";

interface MobileBottomNavProps {
  onOpenRequestModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-lg"
      aria-label="Mobile Navigation Bar"
    >
      <div className="flex items-center justify-around text-center">
        {/* Home */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] transition-colors",
            location.pathname === "/" ? "text-navy font-bold" : "text-slate-600 hover:text-navy"
          )}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">{currentLang === "hi" ? "होम" : "Home"}</span>
        </Link>

        {/* Services */}
        <Link
          to="/services"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] transition-colors",
            location.pathname.startsWith("/services") ? "text-navy font-bold" : "text-slate-600 hover:text-navy"
          )}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-none">{currentLang === "hi" ? "सेवाएँ" : "Services"}</span>
        </Link>

        {/* Center Primary Action: Request */}
        <Link
          to="/request"
          className="flex flex-col items-center justify-center py-0.5 px-2 min-w-[56px] text-navy font-bold transition-transform active:scale-95"
          aria-label={currentLang === "hi" ? "सेवा अनुरोध" : "Request a Service"}
        >
          <div className="w-10 h-10 rounded-full bg-brandred text-white flex items-center justify-center shadow-md mb-0.5 -mt-3 border-2 border-white">
            <FileUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-navy leading-none">
            {currentLang === "hi" ? "अनुरोध" : "Request"}
          </span>
        </Link>

        {/* Call */}
        <a
          href={`tel:${businessConfig.phoneNumbers.primary}`}
          className="flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] text-brandred hover:text-red-700 transition-colors"
          aria-label={currentLang === "hi" ? "कॉल करें" : "Call Now"}
        >
          <Phone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">{currentLang === "hi" ? "कॉल" : "Call"}</span>
        </a>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] text-emerald-600 hover:text-emerald-700 transition-colors"
          aria-label={currentLang === "hi" ? "व्हाट्सएप चैट" : "WhatsApp Chat"}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none">{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
        </a>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
