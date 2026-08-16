import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { businessConfig, business } from "../config/business";
import {
  X,
  Phone,
  MessageSquare,
  Eye,
  FileText,
  Globe,
  Printer,
  FileCheck,
  Briefcase,
  HelpCircle,
  Image as ImageIcon,
  Info,
  MapPin,
} from "lucide-react";
import { cn } from "../lib/utils";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRequestModal?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenRequestModal,
}) => {
  const { language, lang, setLanguage } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { seniorMode, toggleSeniorMode } = useAccessibility();
  const location = useLocation();

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const links = [
    { to: "/", label: { en: "Home", hi: "मुख्य पृष्ठ" } },
    { to: "/services", label: { en: "All Services Directory", hi: "संपूर्ण सेवा सूची" }, icon: FileText },
    { to: "/printing", label: { en: "Printing & Press", hi: "प्रिंटिंग व प्रेस" }, icon: Printer },
    { to: "/online-services", label: { en: "Online & Govt Services", hi: "ऑनलाइन सेवा सहायता" }, icon: FileCheck },
    { to: "/business", label: { en: "Business Solutions", hi: "बिजनेस सॉल्यूशंस" }, icon: Briefcase },
    { to: "/website-development", label: { en: "Website Development", hi: "वेबसाइट निर्माण" } },
    { to: "/work", label: { en: "Our Work & Gallery", hi: "हमारा काम व गैलरी" }, icon: ImageIcon },
    { to: "/about", label: { en: "About Palak Enterprises", hi: "हमारे बारे में" }, icon: Info },
    { to: "/faq", label: { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले सवाल" }, icon: HelpCircle },
    { to: "/contact", label: { en: "Contact & Location", hi: "संपर्क एवं केंद्र" }, icon: MapPin },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={currentLang === "hi" ? "नेविगेशन मेनू" : "Navigation Menu"}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Top Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <img
                src={business.logoPath}
                alt={business.name[currentLang]}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-saffron/40"
              />
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-navy leading-tight">
                  {business.name[currentLang]}
                </span>
                <span className="text-[11px] text-muted">{business.unit[currentLang]}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 focus:outline-none cursor-pointer"
              aria-label={currentLang === "hi" ? "मेनू बंद करें" : "Close menu"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links Body */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* Language & Accessibility Bar */}
            <div className="bg-slate-100 p-3 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center">
                  <Globe className="w-3.5 h-3.5 mr-1 text-navy" /> {currentLang === "hi" ? "भाषा" : "Language"}
                </span>
                <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      currentLang === "en" ? "bg-navy text-white" : "text-slate-700"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("hi")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      currentLang === "hi" ? "bg-navy text-white font-hindi" : "text-slate-700 font-hindi"
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSeniorMode}
                aria-pressed={seniorMode}
                className={cn(
                  "w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-all cursor-pointer",
                  seniorMode
                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-sm"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                )}
              >
                <Eye className={cn("w-4 h-4", seniorMode ? "text-slate-950" : "text-amber-500")} />
                <span>
                  {seniorMode
                    ? (currentLang === "hi" ? "सामान्य मोड" : "Normal Mode")
                    : (currentLang === "hi" ? "वरिष्ठ नागरिक मोड" : "Senior Citizen Mode")}
                </span>
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-800" aria-label="Mobile Navigation">
              {links.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={cn(
                      "px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors",
                      isActive
                        ? "bg-navy text-white"
                        : "hover:bg-slate-100 text-slate-800",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <span>{link.label[currentLang]}</span>
                    {link.icon && !isActive && (
                      <link.icon className="w-4 h-4 text-slate-400" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Primary Request Service Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenRequestModal) {
                    onOpenRequestModal();
                  }
                }}
                className={cn(
                  "w-full py-3 px-4 rounded-xl bg-brandred text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm hover:bg-red-700 transition-colors cursor-pointer",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                <FileText className="w-4 h-4" />
                <span>{currentLang === "hi" ? "सेवा अनुरोध फॉर्म भरें" : "Request a Service"}</span>
              </button>
            </div>
          </div>

          {/* Bottom Quick Contact Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${businessConfig.phoneNumbers.primary}`}
                className="py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{currentLang === "hi" ? "कॉल करें" : "Call Now"}</span>
              </a>

              <a
                href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
