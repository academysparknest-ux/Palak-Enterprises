import React, { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { navLinks } from "../config/navigation";
import { business, getCallLink } from "../config/business";
import LanguageSwitcher from "./LanguageSwitcher";
import { cn } from "../lib/utils";

interface HeaderProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] border-b border-line bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* Logo & Brand Identity */}
        <a href="#home" className="flex items-center gap-2.5 shrink-0 group">
          <img
            src={business.logoPath}
            alt="Palak Enterprises logo"
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-saffron/40 shadow-xs group-hover:scale-105 transition-transform"
            loading="eager"
          />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-display text-base font-bold text-navy tracking-tight">
              {business.name}
            </span>
            <span className={cn("text-xs text-muted font-medium", lang === "hi" && "font-hindi")}>
              {business.unit}
            </span>
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-semibold text-ink/80 transition-colors hover:text-brandred",
                lang === "hi" && "font-hindi"
              )}
            >
              {t.nav[link.labelKey] || link.labelKey}
            </a>
          ))}
        </nav>

        {/* Desktop Language Switcher & Call Button */}
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher compact />
          <a
            href={getCallLink()}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill bg-brandred px-4 py-2 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03]",
              lang === "hi" && "font-hindi"
            )}
          >
            <Phone size={16} aria-hidden />
            {t.nav.callNow}
          </a>
        </div>

        {/* Mobile Navigation Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-line p-2 text-navy hover:bg-canvas transition-colors cursor-pointer"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/50 backdrop-blur-xs w-full h-full border-none cursor-pointer"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-white p-6 shadow-raised animate-fadeUp flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={business.logoPath}
                    alt="Palak Enterprises"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-saffron/40"
                  />
                  <div className="flex flex-col">
                    <span className="font-display text-base font-bold text-navy leading-tight">
                      {business.name}
                    </span>
                    <span className="text-xs text-muted">{business.unit}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg border border-line p-2 text-navy hover:bg-canvas transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-3 text-base font-semibold text-ink hover:bg-canvas transition-colors",
                      lang === "hi" && "font-hindi"
                    )}
                  >
                    {t.nav[link.labelKey] || link.labelKey}
                  </a>
                ))}
              </nav>
            </div>

            <div className="pt-6 border-t border-line mt-6">
              <a
                href={getCallLink()}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-pill bg-brandred px-4 py-3 text-base font-bold text-white shadow-card transition-transform hover:scale-[1.02]",
                  lang === "hi" && "font-hindi"
                )}
              >
                <Phone size={18} aria-hidden />
                {t.nav.callNow}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
