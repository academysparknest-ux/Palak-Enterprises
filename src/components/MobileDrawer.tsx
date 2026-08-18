import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import { business, getWhatsAppLink, getCallLink } from "../config/business";
import {
  X,
  Phone,
  MessageSquare,
  Eye,
  Globe,
  Home,
  Zap,
  Printer,
  Heart,
  FileCheck,
  Sparkles,
  HelpCircle,
  Info,
  MapPin,
  Package,
  User,
  LogIn,
  LogOut,
  UserPlus,
  ChevronRight,
  ChevronDown,
  Layers,
  Palette,
  Laptop,
  Briefcase,
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
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const location = useLocation();

  // Separate state for Services submenu expansion (does not close drawer)
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);

  // Track pathname changes to close drawer ONLY upon actual route navigation
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Handle body scroll locking & ESC key
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

  const servicesSubmenu = [
    {
      to: "/services",
      label: { en: "All Services Directory", hi: "सभी 50+ सेवाएँ" },
      icon: Layers,
    },
    {
      to: "/printing",
      label: { en: "Printing & Press", hi: "प्रिंटिंग व प्रेस" },
      icon: Printer,
    },
    {
      to: "/online-services",
      label: { en: "Instant Online Print", hi: "तुरंत ऑनलाइन प्रिंट" },
      icon: Zap,
    },
    {
      to: "/digital-services",
      label: { en: "Digital & CSC Govt Services", hi: "डिजिटल व सरकारी सेवाएँ" },
      icon: FileCheck,
    },
    {
      to: "/wedding-events",
      label: { en: "Wedding & Ceremony Cards", hi: "शादी कार्ड व निमंत्रण" },
      icon: Heart,
    },
    {
      to: "/business",
      label: { en: "Business Solutions & Kits", hi: "बिजनेस सॉल्यूशंस" },
      icon: Briefcase,
    },
    {
      to: "/design-services",
      label: { en: "Graphic Design Studio", hi: "ग्राफिक डिज़ाइन स्टूडियो" },
      icon: Palette,
    },
    {
      to: "/website-development",
      label: { en: "Website Development", hi: "वेबसाइट डेवलपमेंट" },
      icon: Laptop,
    },
  ];

  const primaryNavLinks = [
    {
      to: "/wedding-events",
      label: { en: "Wedding & Events", hi: "शादी व मांगलिक कार्ड" },
      icon: Heart,
    },
    {
      to: "/online-services",
      label: { en: "Instant Online Print", hi: "तुरंत ऑनलाइन प्रिंट" },
      icon: Zap,
    },
    {
      to: "/business",
      label: { en: "Business Solutions", hi: "बिजनेस प्रिंटिंग व समाधान" },
      icon: Briefcase,
    },
    {
      to: "/track-order",
      label: { en: "Track Order / Status", hi: "ऑर्डर स्थिति ट्रैक करें" },
      icon: Package,
    },
    {
      to: "/about",
      label: { en: "About Us", hi: "हमारे बारे में" },
      icon: Info,
    },
    {
      to: "/contact",
      label: { en: "Contact & Location", hi: "संपर्क एवं केंद्र पता" },
      icon: MapPin,
    },
    {
      to: "/faq",
      label: { en: "FAQs & Help", hi: "अक्सर पूछे जाने वाले सवाल" },
      icon: HelpCircle,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={currentLang === "hi" ? "नेविगेशन मेनू" : "Navigation Menu"}
    >
      {/* Backdrop: Clicking overlay closes menu */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeUp"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 pointer-events-none">
        <div
          className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
              <img
                src={business.logoPath}
                alt={business.name[currentLang]}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400/60 shadow-xs"
              />
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold text-[#123B70] leading-tight">
                  {business.name[currentLang]}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">{business.unit[currentLang]}</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 focus:outline-hidden cursor-pointer"
              aria-label={currentLang === "hi" ? "मेनू बंद करें" : "Close navigation menu"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links Body */}
          <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5 flex-1">
            {/* Language & Accessibility Bar */}
            <div className="bg-slate-100/90 p-2.5 rounded-2xl space-y-2 border border-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#123B70]" />
                  <span>{currentLang === "hi" ? "भाषा / Language" : "Language"}</span>
                </span>
                <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    aria-pressed={currentLang === "en"}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      currentLang === "en"
                        ? "bg-[#123B70] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("hi")}
                    aria-pressed={currentLang === "hi"}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg font-hindi transition-all cursor-pointer",
                      currentLang === "hi"
                        ? "bg-[#123B70] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    हिन्दी
                  </button>
                </div>
              </div>

              {/* Senior citizen high contrast mode toggle */}
              <button
                type="button"
                onClick={toggleSeniorMode}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  seniorMode
                    ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#123B70]" />
                  <span>{currentLang === "hi" ? "आसान मोड (बड़ा टेक्स्ट)" : "Senior Citizen Mode"}</span>
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-bold",
                    seniorMode ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {seniorMode ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1" aria-label="Mobile menu navigation">
              {/* Home */}
              <Link
                to="/"
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all",
                  location.pathname === "/"
                    ? "bg-[#123B70] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Home className={cn("w-4 h-4 shrink-0", location.pathname === "/" ? "text-amber-300" : "text-slate-500")} />
                  <span className={cn("truncate", currentLang === "hi" && "font-hindi")}>
                    {currentLang === "hi" ? "मुख्य पृष्ठ (Home)" : "Home"}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>

              {/* ▾ Collapsible Services Item (Tapping expands submenu, does NOT close drawer) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsServicesExpanded((prev) => !prev)}
                  aria-expanded={isServicesExpanded}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-[#123B70] shrink-0" />
                    <span className={cn(currentLang === "hi" && "font-hindi")}>
                      {currentLang === "hi" ? "सेवाएँ (Services)" : "Services"}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      50+
                    </span>
                  </div>

                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-500 transition-transform duration-200",
                      isServicesExpanded && "rotate-180 text-amber-600"
                    )}
                  />
                </button>

                {/* Submenu links */}
                {isServicesExpanded && (
                  <div className="px-2 pb-2 pt-1 space-y-1 bg-white border-t border-slate-200/60 animate-fadeUp">
                    {servicesSubmenu.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        sub.to === "/services"
                          ? location.pathname === "/services"
                          : location.pathname.startsWith(sub.to);
                      return (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          onClick={onClose}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors",
                            isSubActive
                              ? "bg-[#123B70]/10 text-[#123B70] font-bold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <SubIcon className="w-3.5 h-3.5 text-[#123B70] shrink-0" />
                            <span className={cn(currentLang === "hi" && "font-hindi")}>
                              {sub.label[currentLang]}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Other Primary Links (All unique, no duplicate service links) */}
              {primaryNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(link.to);

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all",
                      isActive
                        ? "bg-[#123B70] text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-amber-300" : "text-slate-500"
                        )}
                      />
                      <span className={cn("truncate", currentLang === "hi" && "font-hindi")}>
                        {link.label[currentLang]}
                      </span>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Auth Quick Action Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
              {isAuthenticated ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email || `+91 ${user?.phone}`}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0 cursor-pointer"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>{currentLang === "hi" ? "लॉगआउट" : "Logout"}</span>
                    </button>
                  </div>

                  <Link
                    to="/account"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#123B70]" />
                    <span>{isStaff ? (currentLang === "hi" ? "स्टाफ ERP डैशबोर्ड" : "Staff ERP Dashboard") : (currentLang === "hi" ? "मेरा अकाउंट व ऑर्डर्स" : "My Account & Orders")}</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="flex-1 bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{currentLang === "hi" ? "लॉगिन करें" : "Sign In"}</span>
                  </Link>

                  <Link
                    to="/signup"
                    onClick={onClose}
                    className="flex-1 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{currentLang === "hi" ? "खाता बनाएं" : "Sign Up"}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Request & WhatsApp CTA Box */}
            <div className="bg-gradient-to-br from-[#123B70] to-slate-900 text-white p-3.5 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentLang === "hi" ? "तत्काल सहायता व कोटेशन" : "Instant Quote & Help"}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {currentLang === "hi"
                  ? "व्हाट्सएप पर अपनी फाइल भेजें या सीधे केंद्र पर कॉल करें।"
                  : "Send your files directly on WhatsApp or call our center for instant help."}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={getWhatsAppLink("Hello Palak Enterprises, I need help with services.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={getCallLink()}
                  className="flex-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{currentLang === "hi" ? "कॉल करें" : "Call"}</span>
                </a>
              </div>
            </div>

            {/* Quick Request Form Modal Trigger if passed */}
            {onOpenRequestModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRequestModal();
                }}
                className={cn(
                  "w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                <Sparkles size={14} />
                <span>{currentLang === "hi" ? "सेवा अनुरोध फॉर्म खोलें" : "Open Request Form"}</span>
              </button>
            )}
          </div>

          {/* Bottom Footer Info */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">{business.name[currentLang]}</p>
            <p>{business.address.landmark[currentLang]}, {business.address.city[currentLang]}</p>
            <p className="text-slate-400 mt-0.5">CSC ID: {business.registrations.cscId}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;

