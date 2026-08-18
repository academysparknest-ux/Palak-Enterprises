import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Home, Layers, Phone, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface MobileBottomNavProps {
  onOpenRequestModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const location = useLocation();

  const isServicesActive =
    location.pathname.startsWith("/services") ||
    location.pathname.startsWith("/online-services") ||
    location.pathname.startsWith("/printing") ||
    location.pathname.startsWith("/digital-services") ||
    location.pathname.startsWith("/wedding-events");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1 shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile Navigation Bar"
    >
      <div className="flex items-center justify-around text-center max-w-md mx-auto">
        {/* Home */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors rounded-lg",
            location.pathname === "/"
              ? "text-[#123B70] font-bold"
              : "text-slate-500 hover:text-[#123B70]"
          )}
        >
          <Home className={cn("w-5 h-5 mb-0.5", location.pathname === "/" && "text-[#123B70]")} />
          <span className="text-[10px] leading-none font-medium">{currentLang === "hi" ? "होम" : "Home"}</span>
        </Link>

        {/* Services */}
        <Link
          to="/services"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors rounded-lg",
            isServicesActive
              ? "text-[#123B70] font-bold"
              : "text-slate-500 hover:text-[#123B70]"
          )}
        >
          <Layers className={cn("w-5 h-5 mb-0.5", isServicesActive && "text-[#123B70]")} />
          <span className="text-[10px] leading-none font-medium">{currentLang === "hi" ? "सेवाएँ" : "Services"}</span>
        </Link>

        {/* Center Primary Action: Instant Document Print */}
        <Link
          to="/online-services/document-printing"
          onClick={(e) => {
            if (onOpenRequestModal) {
              e.preventDefault();
              onOpenRequestModal();
            }
          }}
          className="flex flex-col items-center justify-center py-0.5 px-2 min-w-[58px] text-[#123B70] font-bold transition-transform active:scale-95 group"
          aria-label={currentLang === "hi" ? "प्रिंट ऑर्डर" : "Print Order"}
        >
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md mb-0.5 -mt-3.5 border-2 border-white group-hover:bg-amber-400 transition-colors ring-2 ring-amber-300/50">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-[#123B70] leading-none">
            {currentLang === "hi" ? "प्रिंट" : "Print"}
          </span>
        </Link>

        {/* Call */}
        <a
          href={`tel:${businessConfig.phoneNumbers.primary}`}
          className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] text-slate-600 hover:text-[#123B70] transition-colors rounded-lg"
          aria-label={currentLang === "hi" ? "कॉल करें" : "Call Now"}
        >
          <Phone className="w-5 h-5 mb-0.5 text-[#123B70]" />
          <span className="text-[10px] font-medium leading-none">{currentLang === "hi" ? "कॉल" : "Call"}</span>
        </a>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg"
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

