import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { cn } from "../lib/utils";
import { ArrowRight, Phone, MessageSquare } from "lucide-react";
import { businessConfig } from "../config/business";

interface PageHeroProps {
  breadcrumbs: BreadcrumbItem[];
  badge?: {
    en: string;
    hi: string;
  };
  title: {
    en: string;
    hi: string;
  };
  subtitle?: {
    en: string;
    hi: string;
  };
  primaryCta?: {
    label: {
      en: string;
      hi: string;
    };
    to?: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: {
      en: string;
      hi: string;
    };
    to?: string;
    onClick?: () => void;
  };
  showContactActions?: boolean;
}

export const PageHero: React.FC<PageHeroProps> = ({
  breadcrumbs,
  badge,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  showContactActions = true,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <section className="relative overflow-hidden bg-[#123B70] text-white pt-6 pb-12 sm:pb-16 border-b border-line">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
        }}
      />
      {/* Subtle geometric dot grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb row */}
        <div className="mb-4">
          <Breadcrumbs
            items={breadcrumbs}
            className="text-white/60 [&_a]:text-white/80 [&_a:hover]:text-white [&_span]:text-white"
          />
        </div>

        {/* Content Box */}
        <div className="max-w-3xl">
          {badge && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3.5 py-1 text-xs font-bold text-saffron-light ring-1 ring-white/20 mb-3",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {badge[currentLang]}
            </span>
          )}

          <h1
            className={cn(
              "font-display text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {title[currentLang]}
          </h1>

          {subtitle && (
            <p
              className={cn(
                "mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {subtitle[currentLang]}
            </p>
          )}

          {/* Action Row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {primaryCta && (
              primaryCta.to ? (
                <Link
                  to={primaryCta.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-saffron px-5 py-2.5 text-xs sm:text-sm font-bold text-navy shadow-raised transition-transform hover:scale-[1.03]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {primaryCta.label[currentLang]}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={primaryCta.onClick}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-saffron px-5 py-2.5 text-xs sm:text-sm font-bold text-navy shadow-raised transition-transform hover:scale-[1.03] cursor-pointer",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {primaryCta.label[currentLang]}
                  <ArrowRight size={16} aria-hidden />
                </button>
              )
            )}

            {secondaryCta && (
              secondaryCta.to ? (
                <Link
                  to={secondaryCta.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-white/10",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {secondaryCta.label[currentLang]}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={secondaryCta.onClick}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-white/10 cursor-pointer",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {secondaryCta.label[currentLang]}
                </button>
              )
            )}

            {showContactActions && (
              <div className="flex items-center gap-2 pl-1">
                <a
                  href={`tel:${businessConfig.phoneNumbers.primary}`}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-brandred px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
                  aria-label={currentLang === "hi" ? "पालक इंटरप्राइजेज को कॉल करें" : "Call Palak Enterprises"}
                >
                  <Phone size={14} />
                  <span className="hidden sm:inline">{currentLang === "hi" ? "कॉल" : "Call"}</span>
                </a>
                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-leaf px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                  aria-label={currentLang === "hi" ? "पालक इंटरप्राइजेज को व्हाट्सएप करें" : "WhatsApp Palak Enterprises"}
                >
                  <MessageSquare size={14} />
                  <span className="hidden sm:inline">{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageHero;
