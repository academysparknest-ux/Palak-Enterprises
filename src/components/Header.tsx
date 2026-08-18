import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Phone,
  Package,
  Sparkles,
  Clock,
  MapPin,
  ChevronDown,
  Printer,
  FileText,
  Camera,
  Heart,
  FileCheck,
  ClipboardList,
  MonitorSmartphone,
  Zap,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { business, businessConfig } from "../config/business";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { MobileDrawer } from "./MobileDrawer";
import { cn } from "../lib/utils";

interface HeaderProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { itemCount } = useCart();
  const { user, isAuthenticated, isStaff } = useAuth();
  const location = useLocation();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  // Close mega menu & drawer on route change
  useEffect(() => {
    setServicesMenuOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  // Close mega menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setServicesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut (Ctrl+K or Cmd+K) to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setServicesMenuOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setServicesMenuOpen(false);
    }, 150);
  };

  const isServicesActive = location.pathname.startsWith("/services");

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all shadow-2xs">
        {/* Top Minimal Info Bar (Desktop & Tablet) */}
        <div className="bg-[#123B70] text-slate-100 py-1 px-4 text-xs hidden md:block">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[11px] text-slate-200 shrink-0">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-300" />
                <span>{business.address.city[currentLang]}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{businessConfig.openingHours[currentLang]}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-300 font-semibold">CSC ID: {business.registrations.cscId}</span>
            </div>

            <div className="flex items-center gap-3.5 text-[11px] shrink-0">
              <Link
                to="/track-order"
                className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-medium"
              >
                <Package className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order"}</span>
              </Link>
              <span className="text-slate-400">|</span>
              <a
                href={`tel:${business.phones[0]}`}
                className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{business.phones[0]}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Navbar Bar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-2.5">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group min-w-0" aria-label="Palak Enterprises Home">
            <img
              src={business.logoPath}
              alt={business.name[currentLang]}
              width={40}
              height={40}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-amber-400/60 shadow-xs group-hover:scale-105 transition-transform shrink-0"
              loading="eager"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm sm:text-base md:text-lg font-black text-[#123B70] tracking-tight group-hover:text-amber-600 transition-colors truncate">
                {business.name[currentLang]}
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-500 font-medium -mt-0.5 truncate hidden xxs:block">
                {currentLang === "hi" ? "प्रिंटिंग एवं डिजिटल सेवा केंद्र" : "Printing & Digital Services"}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Central, Consolidated, Accessible) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main navigation">
            {/* Home Link */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              {currentLang === "hi" ? "होम" : "Home"}
            </NavLink>

            {/* Services Mega-Menu Dropdown */}
            <div
              ref={megaMenuRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <NavLink
                to="/services"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  isServicesActive || servicesMenuOpen
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )}
                onClick={() => setServicesMenuOpen((prev) => !prev)}
                aria-expanded={servicesMenuOpen}
                aria-haspopup="true"
              >
                <span>{currentLang === "hi" ? "सेवाएँ" : "Services"}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    servicesMenuOpen && "rotate-180 text-amber-600"
                  )}
                />
              </NavLink>

              {/* Exact 3001 Mega Menu Dropdown */}
              {servicesMenuOpen && (
                <div
                  className="absolute left-1/2 top-full -translate-x-1/2 mt-2 w-[calc(100vw-2rem)] sm:w-[600px] md:w-[760px] lg:w-[880px] max-w-[95vw] max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:p-6 shadow-2xl animate-fadeUp z-50 text-slate-800"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >

                  {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 py-2">
                    {/* Group 1: Printing & Stationery */}
                    <div className="space-y-4">
                      <div>
                        <Link
                          to="/services/printing"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <Printer size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "प्रिंटिंग सेवाएँ" : "Printing Services"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/printing/visiting-cards"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "विजिटिंग कार्ड्स" : "Visiting Cards"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/printing/flex-banners"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "फ्लेक्स बैनर व बोर्ड" : "Flex Banners & Boards"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/printing/pamphlets-flyers"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "पम्पलेट व फ्लायर्स" : "Pamphlets & Leaflets"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/printing/photocopy-service"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "फोटोकॉपी व ज़ेरॉक्स" : "High-Speed Photocopy"}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <Link
                          to="/services/stationery"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <FileText size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "स्टेशनरी व बिल बुक" : "Stationery & Office"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/stationery/bill-books"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "बिल बुक व इनवॉइस" : "Bill Books & Memos"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/stationery/letterheads"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "लेटरहेड व पैड" : "Letterheads & Pads"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/stationery/pvc-id-cards"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "पीवीसी आईडी कार्ड्स" : "Staff & Student ID Cards"}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Group 2: Photo, ID, Wedding & Design */}
                    <div className="space-y-4">
                      <div>
                        <Link
                          to="/services/photo-id"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <Camera size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "फोटो व आईडी सेवाएँ" : "Photo & ID Studio"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/photo-id/instant-passport-photos"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "तत्काल पासपोर्ट फोटो (5 मिनट)" : "Instant Passport Photos"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/photo-id/photo-printing-enlargements"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "स्टूडियो फोटो प्रिंटिंग" : "Studio Photo Prints"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/photo-id/document-scanning-pdf"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "स्कैनिंग व पीडीएफ निर्माण" : "Scanning & PDF Services"}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <Link
                          to="/design-services"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <Sparkles size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "ग्राफिक व क्रिएटिव डिज़ाइन" : "Creative Graphic Design"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/design/business-logo-design"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "व्यावसायिक लोगो डिज़ाइन" : "Business Logo Design"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/design/social-media-graphics"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "सोशल मीडिया पोस्ट" : "Social Media Creatives"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/design/resume-cv-design"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "प्रोफेशनल रिज्यूमे व सीवी" : "Professional Resumes"}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <Link
                          to="/wedding-events"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <Heart size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "शादी व मांगलिक कार्ड" : "Wedding & Invitations"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/wedding-events"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "शाही शादी कार्ड संग्रह" : "Royal Wedding Collection"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/online-services/invitation-cards"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "कस्टम निमंत्रण पत्र" : "Custom Invitation Cards"}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Group 3: Government, Online & Web Solutions */}
                    <div className="space-y-4">
                      <div>
                        <Link
                          to="/digital-services"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <FileCheck size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "सरकारी व प्रमाण पत्र सहायता" : "Government Assistance"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/government/caste-income-residence-assistance"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "जाति, आय, निवास प्रमाण पत्र" : "RTPS Certificates"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/government/aadhaar-download-pvc-print"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "आधार कार्ड डाउनलोड व पीवीसी" : "Aadhaar Card Download & PVC"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/government/pan-card-application-correction"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "पैन कार्ड आवेदन व सुधार" : "PAN Card Applications"}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <Link
                          to="/services/online-services"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <ClipboardList size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "ऑनलाइन फॉर्म व सरकारी योजना" : "Online Forms & Jobs"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/services/online-services/job-forms-application-filling"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "सरकारी नौकरी आवेदन" : "Job Application Filling"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/agriculture/pm-kisan-farmer-registration-dbt"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "किसान रजिस्ट्रेशन व पीएम किसान" : "Farmer & PM-Kisan"}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/services/land/dakhil-kharij-mutation-assistance"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "दाखिल-खारिज व भू-लगान" : "Land Mutation & Lagan"}
                            </Link>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <Link
                          to="/website-development"
                          onClick={() => setServicesMenuOpen(false)}
                          className="group/cat flex items-center gap-2 font-display text-sm font-bold text-navy hover:text-brandred transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover/cat:bg-brandred group-hover/cat:text-white transition-colors">
                            <MonitorSmartphone size={15} />
                          </div>
                          <span className={cn(currentLang === "hi" && "font-hindi")}>
                            {currentLang === "hi" ? "वेबसाइट व डिजिटल समाधान" : "Web & Digital Setup"}
                          </span>
                        </Link>
                        <ul className="mt-1.5 space-y-1 pl-9 text-xs text-slate-600">
                          <li>
                            <Link
                              to="/website-development"
                              onClick={() => setServicesMenuOpen(false)}
                              className="hover:text-brandred hover:underline block"
                            >
                              {currentLang === "hi" ? "स्कूल/दुकान वेबसाइट डेवलपमेंट" : "Custom Website Development"}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Instant Online Services Link (Separate Fast Workflow) */}
            <NavLink
              to="/online-services"
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentLang === "hi" ? "तुरंत सेवाएँ" : "Instant Print"}</span>
            </NavLink>

            {/* Wedding & Events Link */}
            <NavLink
              to="/wedding-events"
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>{currentLang === "hi" ? "शादी कार्ड" : "Wedding & Events"}</span>
            </NavLink>

            {/* Business Solutions Link */}
            <NavLink
              to="/business"
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              {currentLang === "hi" ? "बिजनेस प्रिंटिंग" : "Business Solutions"}
            </NavLink>

            {/* About Link */}
            <NavLink
              to="/about"
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              {currentLang === "hi" ? "हमारे बारे में" : "About"}
            </NavLink>

            {/* Contact Link */}
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                cn(
                  "px-2.5 py-1.5 xl:px-3 text-xs xl:text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                  isActive
                    ? "bg-[#123B70]/10 text-[#123B70] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#123B70] hover:bg-slate-100/80"
                )
              }
            >
              {currentLang === "hi" ? "संपर्क" : "Contact"}
            </NavLink>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-2 sm:px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
              title="Search services & products (Ctrl+K)"
              aria-label="Search catalog and services"
            >
              <Search className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="hidden sm:inline font-medium">
                {currentLang === "hi" ? "खोजें..." : "Search..."}
              </span>
              <kbd className="hidden md:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-[#123B70] transition-colors shadow-2xs shrink-0"
              title="View Shopping Cart"
              aria-label={`View Shopping Cart with ${itemCount} items`}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Account / Login (Desktop / Tablet) */}
            <Link
              to={isAuthenticated ? "/account" : "/login"}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs shrink-0"
              title={isAuthenticated ? (isStaff ? "ERP Admin" : "Account") : "Login"}
            >
              <User className="h-4 w-4 text-[#123B70]" />
              <span className="hidden xl:inline">
                {isAuthenticated
                  ? (isStaff ? "ERP Admin" : (user?.name?.split(" ")[0] || "Account"))
                  : (currentLang === "hi" ? "लॉगिन" : "Login")}
              </span>
            </Link>

            {/* Mobile Drawer Hamburger Button */}
            <button
              type="button"
              onClick={handleToggleDrawer}
              aria-label={drawerOpen ? (currentLang === "hi" ? "मेनू बंद करें" : "Close navigation menu") : (currentLang === "hi" ? "मेनू खोलें" : "Open navigation menu")}
              aria-expanded={drawerOpen}
              className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer shadow-2xs shrink-0"
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onOpenRequestModal={() => {
          handleCloseDrawer();
          onOpenRequestModal?.();
        }}
      />
    </>
  );
};
