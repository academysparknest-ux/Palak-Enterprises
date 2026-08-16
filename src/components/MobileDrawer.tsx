import React, { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { businessConfig } from "../config/business";
import { X, Phone, MessageSquare, MapPin, Eye, FileText, Globe } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRequestModal: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, onOpenRequestModal }) => {
  const { language, setLanguage, t } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useAccessibility();

  useEffect(() => {
    if (!isOpen) return;

    // Prevent body background scroll while drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Close on Escape keypress
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={language === "hi" ? "नेविगेशन मेनू" : "Navigation Menu"}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Top Bar */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{businessConfig.name}</h2>
              <p className="text-xs text-red-600 font-semibold">{businessConfig.associatedName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900"
              aria-label={language === "hi" ? "मेनू बंद करें" : "Close menu"}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Links Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Language & Accessibility Bar */}
            <div className="bg-slate-100 p-3 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center">
                  <Globe className="w-4 h-4 mr-1 text-blue-900" /> Language / भाषा
                </span>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      language === "en" ? "bg-blue-900 text-white" : "text-slate-700"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage("hi")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      language === "hi" ? "bg-blue-900 text-white" : "text-slate-700"
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              <button
                onClick={toggleSeniorMode}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition-colors ${
                  seniorMode
                    ? "bg-amber-500 text-slate-950 border-amber-600"
                    : "bg-white text-slate-800 border-slate-200"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{seniorMode ? t.footer.normalMode : t.footer.seniorMode}</span>
              </button>
            </div>

            {/* Nav List */}
            <nav className="flex flex-col space-y-2 text-base font-semibold text-slate-800">
              <a
                href="#home"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.home}
              </a>
              <a
                href="#services"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.services}
              </a>
              <a
                href="#business-printing"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.businessPrinting}
              </a>
              <a
                href="#website-dev"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.websiteDev}
              </a>
              <a
                href="#about"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.about}
              </a>
              <a
                href="#gallery"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.gallery}
              </a>
              <a
                href="#contact"
                onClick={onClose}
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t.nav.contact}
              </a>
            </nav>

            {/* Quick Service Action Button */}
            <button
              onClick={() => {
                onClose();
                onOpenRequestModal();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-900 text-white font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-blue-800 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>{t.requestForm.submitButton}</span>
            </button>
          </div>

          {/* Bottom Call & WhatsApp CTAs */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="w-full py-3 px-4 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center space-x-2 shadow-sm hover:bg-red-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>
                {t.nav.callNow}: {businessConfig.phoneNumbers.primary}
              </span>
            </a>

            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center space-x-2 shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{t.nav.whatsapp}</span>
            </a>

            <a
              href={businessConfig.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-800 font-semibold flex items-center justify-center space-x-2 text-xs hover:bg-slate-300 transition-colors"
            >
              <MapPin className="w-4 h-4 text-red-600" />
              <span>{t.nav.getDirections}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
