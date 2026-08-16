import React from "react";
import { Phone, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { business, getCallLink, getDirectionsLink } from "../config/business";
import { cn } from "../lib/utils";
import AnimatedBrandHeadline from "./AnimatedBrandHeadline";

interface HeroProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenRequestModal }) => {
  const { lang, t } = useLanguage();

  return (
    <section id="home" className="relative overflow-hidden bg-navy">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] animate-pulseSlow motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #F97316 0, transparent 40%), radial-gradient(circle at 85% 80%, #15803D 0, transparent 45%)",
        }}
      />

      {/* Subtle printing dot grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Subtle floating paper/card silhouettes for printing theme */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/4 h-52 w-52 rounded-2xl border border-white/10 bg-white/5 opacity-40 blur-[1px] animate-floatSlow motion-reduce:animate-none"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-12 bottom-1/4 h-40 w-40 rounded-2xl border border-white/10 bg-white/5 opacity-30 blur-[1px] animate-floatSlow [animation-delay:4s] motion-reduce:animate-none"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div className="animate-fadeUp">
          {/* Logo + CSC Badge - Logo visually dominant */}
          <div className="flex flex-wrap items-center gap-3.5">
            <img
              src={business.logoPath}
              alt="Palak Enterprises logo"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-saffron/60 shadow-md shrink-0"
              loading="eager"
            />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-saffron-light ring-1 ring-white/20 shadow-sm",
                lang === "hi" && "font-hindi"
              )}
            >
              <ShieldCheck size={14} aria-hidden />
              {t.hero.badge}
            </span>
          </div>

          {/* Primary Animated Brand Headline */}
          <AnimatedBrandHeadline
            items={t.hero.brandNames}
            isHindi={lang === "hi"}
            className="mt-5 sm:mt-6"
          />

          {/* Supporting Subtitle Tagline */}
          <h2
            className={cn(
              "mt-4 font-display text-lg font-bold text-saffron-light sm:mt-5 sm:text-xl md:text-2xl",
              lang === "hi" && "font-hindi"
            )}
          >
            {t.hero.headline}
          </h2>

          <p
            className={cn(
              "mt-2 max-w-xl text-sm text-white/80 sm:text-base leading-relaxed",
              lang === "hi" && "font-hindi"
            )}
          >
            {t.hero.subheadline}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#services"
              onClick={() => onOpenRequestModal?.()}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill bg-saffron px-6 py-3 text-sm font-bold text-navy shadow-raised transition-transform hover:scale-[1.03] sm:text-base cursor-pointer",
                lang === "hi" && "font-hindi"
              )}
            >
              {t.hero.ctaPrimary}
              <ArrowRight size={18} aria-hidden />
            </a>
            <a
              href={getCallLink()}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 text-sm font-bold text-navy shadow-card transition-transform hover:scale-[1.03] sm:text-base",
                lang === "hi" && "font-hindi"
              )}
            >
              <Phone size={18} aria-hidden />
              {t.hero.ctaSecondary}
            </a>
            <a
              href={getDirectionsLink()}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-pill border border-white/30 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:text-base",
                lang === "hi" && "font-hindi"
              )}
            >
              <MapPin size={18} aria-hidden />
              {t.hero.ctaDirections}
            </a>
          </div>
        </div>

        {/* Feature Cards Column */}
        <div className="relative animate-fadeUp [animation-delay:150ms]">
          <div className="rounded-card bg-white/95 p-5 shadow-raised sm:p-7 border border-white/20 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { en: "Printing", hi: "प्रिंटिंग", emoji: "🖨️" },
                { en: "Passport Photo", hi: "पासपोर्ट फोटो", emoji: "📸" },
                { en: "Online Forms", hi: "ऑनलाइन फॉर्म", emoji: "📝" },
                { en: "Aadhaar Print", hi: "आधार प्रिंट", emoji: "🪪" },
              ].map((item) => (
                <div
                  key={item.en}
                  className="flex flex-col items-center gap-2 rounded-xl border border-line bg-canvas p-4 text-center hover:border-saffron/40 hover:shadow-xs transition-all"
                >
                  <span className="text-2xl sm:text-3xl" aria-hidden>
                    {item.emoji}
                  </span>
                  <span
                    className={cn(
                      "text-sm sm:text-base font-semibold text-navy",
                      lang === "hi" && "font-hindi"
                    )}
                  >
                    {lang === "hi" ? item.hi : item.en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
