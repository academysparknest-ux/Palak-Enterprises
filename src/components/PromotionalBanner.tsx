import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight, Tag, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { getWhatsAppLink } from "../config/business";
import { cn } from "../lib/utils";

interface PromoData {
  heading?: string;
  description?: string;
  image?: string;
  is_active: boolean;
}

const DISMISS_KEY = "palak_promo_banner_dismissed";

export const PromotionalBanner: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") {
        setIsDismissed(true);
      }
    } catch {
      // ignore
    }

    const fetchPromo = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("website_content")
          .select("*")
          .eq("section", "promo")
          .single();

        if (error) {
          setLoading(false);
          return;
        }

        if (data && data.is_active) {
          const content = data.content || {};
          setPromo({
            heading: content.heading || "",
            description: content.description || "",
            image: content.image || "",
            is_active: Boolean(data.is_active),
          });
        }
      } catch (err) {
        console.warn("[PromotionalBanner] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (loading || isDismissed || !promo || !promo.is_active) {
    return null;
  }

  // Must have at least a heading, description, or image
  const hasHeading = Boolean(promo.heading?.trim());
  const hasDescription = Boolean(promo.description?.trim());
  const hasImage = Boolean(promo.image?.trim());

  if (!hasHeading && !hasDescription && !hasImage) {
    return null;
  }

  const promoMessage = `Namaste Palak Enterprises, I would like to inquire about the special offer: "${promo.heading || "Printing Offer"}"`;
  const whatsappUrl = getWhatsAppLink(promoMessage);

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-amber-300/80 bg-linear-to-r from-amber-500/10 via-amber-400/5 to-blue-500/10 p-4 sm:p-6 shadow-md transition-all duration-300">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-500/15 blur-2xl"
      />

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss promotional banner"
        className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Case 1: Image only banner */}
      {hasImage && !hasHeading && !hasDescription ? (
        <div className="relative flex flex-col items-center">
          <img
            src={promo.image}
            alt="Special Promotional Offer"
            className="w-full max-h-[380px] rounded-xl object-contain shadow-xs"
            loading="lazy"
          />
          <div className="mt-3 flex items-center gap-3">
            <Link
              to="/printing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0e2f5a] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95"
            >
              <span>{currentLang === "hi" ? "ऑफर का लाभ उठाएं" : "Claim Offer"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{currentLang === "hi" ? "व्हाट्सएप पूछताछ" : "WhatsApp Inquiry"}</span>
            </a>
          </div>
        </div>
      ) : (
        /* Case 2: Image + Text or Text Only */
        <div
          className={cn(
            "relative flex flex-col md:flex-row items-center gap-5 sm:gap-6",
            hasImage ? "justify-between" : "justify-between"
          )}
        >
          {/* Optional Promo Image Banner preview */}
          {hasImage && (
            <div className="w-full md:w-5/12 lg:w-4/12 shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white/70 p-1.5 shadow-xs border border-amber-200">
              <img
                src={promo.image}
                alt={promo.heading || "Special Offer"}
                className="max-h-[180px] sm:max-h-[200px] w-full object-contain rounded-lg transition-transform duration-300 hover:scale-[1.02]"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1 space-y-2 text-center md:text-left pr-6 sm:pr-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] sm:text-xs font-extrabold text-amber-900 border border-amber-400/40 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                {currentLang === "hi" ? "विशेष ऑफर एवं छूट" : "Special Promotional Offer"}
              </span>
            </div>

            {hasHeading && (
              <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                {promo.heading}
              </h3>
            )}

            {hasDescription && (
              <p className="text-xs sm:text-sm font-medium text-slate-700 max-w-2xl leading-relaxed">
                {promo.description}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
              <Link
                to="/printing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0e2f5a] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>{currentLang === "hi" ? "ऑर्डर करें" : "Order Now"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{currentLang === "hi" ? "व्हाट्सएप पर पूछें" : "WhatsApp"}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
