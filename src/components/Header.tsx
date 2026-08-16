import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  MessageCircle,
  Menu,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { business, getWhatsAppLink } from "../config/business";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { MobileDrawer } from "./MobileDrawer";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "../lib/utils";

interface HeaderProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { itemCount } = useCart();
  const { isAuthenticated, isStaff } = useAuth();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const whatsappUrl = getWhatsAppLink("Hello Palak Enterprises, I need assistance with printing / online services.");

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        {/* Top notice bar (Quick info) */}
        <div className="bg-[#123B70] text-white py-1 px-4 text-[11px] font-medium hidden md:block">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>📍 {business.address.city[currentLang]} ({business.address.landmark[currentLang]})</span>
              <span>•</span>
              <span>⚡ Fast Printing & Online Forms Center</span>
              <span>•</span>
              <span className="text-amber-300">CSC ID: {business.registrations.cscId}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/track-order" className="hover:underline flex items-center gap-1">
                <span>📦 {currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order / Status"}</span>
              </Link>
              <span>|</span>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-amber-300">
                💬 {business.phones[0]}
              </a>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src={business.logoPath}
              alt={business.name[currentLang]}
              width={42}
              height={42}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-amber-400/50 shadow-xs group-hover:scale-105 transition-transform"
              loading="eager"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base sm:text-lg font-black text-[#123B70] tracking-tight group-hover:text-amber-600 transition-colors">
                {business.name[currentLang]}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wide">
                {currentLang === "hi" ? "प्रिंटिंग • डिजिटल सेवाएँ • ऑनलाइन केंद्र" : "Printing • Digital Services • CSC Center"}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-5 xl:gap-6 lg:flex" aria-label="Main navigation">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "होम" : "Home"}
            </NavLink>

            <NavLink
              to="/printing"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70] flex items-center gap-1",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              <span>{currentLang === "hi" ? "प्रिंटिंग" : "Printing"}</span>
            </NavLink>

            <NavLink
              to="/digital-services"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "डिजिटल सेवाएँ" : "Digital Services"}
            </NavLink>

            <NavLink
              to="/business"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "बिजनेस" : "Business"}
            </NavLink>

            <NavLink
              to="/wedding-events"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "शादी कार्ड" : "Wedding & Events"}
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "उत्पाद" : "Products"}
            </NavLink>

            <NavLink
              to="/track-order"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "ट्रैक ऑर्डर" : "Track Order"}
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                cn(
                  "text-sm font-semibold transition-colors hover:text-[#123B70]",
                  isActive ? "text-[#123B70] font-bold" : "text-slate-700"
                )
              }
            >
              {currentLang === "hi" ? "हमारे बारे में" : "About"}
            </NavLink>
          </nav>

          {/* Right Action Icons: Search, WhatsApp, Cart, Account */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer"
              title="Search services & products (Ctrl+K)"
            >
              <Search className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">
                {currentLang === "hi" ? "खोजें..." : "Search..."}
              </span>
              <kbd className="hidden lg:inline-block rounded border border-slate-200 bg-white px-1 py-0.2 text-[10px] text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* WhatsApp Quick Action */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>

            {/* Language Switcher */}
            <LanguageSwitcher compact />

            {/* Cart Button with Count Badge */}
            <Link
              to="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              title="View Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Account / Admin Button */}
            <Link
              to="/account"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <User className="h-4 w-4 text-[#123B70]" />
              <span>
                {isAuthenticated ? (isStaff ? "ERP Admin" : "Account") : (currentLang === "hi" ? "लॉगिन" : "Login")}
              </span>
            </Link>

            {/* Request Quote Primary CTA */}
            <Link
              to="/request-quote"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-3.5 py-1.5 text-xs font-bold text-white shadow-card hover:bg-[#0c274c] transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentLang === "hi" ? "कोटेशन लें" : "Get Quote"}</span>
            </Link>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
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
        onClose={() => setDrawerOpen(false)}
        onOpenRequestModal={() => {
          setDrawerOpen(false);
          onOpenRequestModal?.();
        }}
      />
    </>
  );
};
