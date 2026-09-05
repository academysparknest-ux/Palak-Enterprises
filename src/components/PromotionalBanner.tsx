import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight, Tag, MessageCircle, Eye } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { getWhatsAppLink } from "../config/business";

interface PromoData {
  heading?: string;
  description?: string;
  image?: string;
  is_active: boolean;
}

const POPUP_SEEN_KEY = "palak_promo_popup_seen";

export const PromotionalBanner: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPromo = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("website_content")
          .select("*")
          .eq("section", "promo")
          .single();

        if (error) {
          console.debug("[PromotionalBanner] Fetch notice:", error.message);
          if (isMounted) setLoading(false);
          return;
        }

        if (data && data.is_active && isMounted) {
          const content = data.content || {};
          const promoItem: PromoData = {
            heading: content.heading || "",
            description: content.description || "",
            image: content.image || "",
            is_active: Boolean(data.is_active),
          };
          setPromo(promoItem);

          // If image is present and user hasn't closed popup in this session, trigger popup
          if (promoItem.image && sessionStorage.getItem(POPUP_SEEN_KEY) !== "true") {
            setTimeout(() => {
              if (isMounted) {
                setShowPopup(true);
              }
            }, 600);
          }
        }
      } catch (err) {
        console.warn("[PromotionalBanner] Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPromo();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
    try {
      sessionStorage.setItem(POPUP_SEEN_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (loading || !promo || !promo.is_active) {
    return null;
  }

  const hasHeading = Boolean(promo.heading?.trim());
  const hasDescription = Boolean(promo.description?.trim());
  const hasImage = Boolean(promo.image?.trim());

  if (!hasHeading && !hasDescription && !hasImage) {
    return null;
  }

  const promoMessage = `Namaste Palak Enterprises, I would like to inquire about the special offer: "${promo.heading || "Printing Offer"}"`;
  const whatsappUrl = getWhatsAppLink(promoMessage);

  return (
    <>
      {/* =========================================================================
          1. POPUP MODAL (Triggers automatically if promotional graphic is active)
         ========================================================================= */}
      {showPopup && hasImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-300"
          onClick={handleClosePopup}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl sm:rounded-3xl bg-white overflow-hidden shadow-2xl border-2 border-amber-300/90 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleClosePopup}
              aria-label="Close promotion popup"
              className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Banner Image Container */}
            <div className="relative bg-slate-950 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={promo.image}
                alt={promo.heading || "Special Offer"}
                className="w-full max-h-[55vh] object-contain"
                loading="eager"
              />
            </div>

            {/* Modal Bottom Content */}
            <div className="p-4 sm:p-5 bg-linear-to-b from-amber-50/60 to-white border-t border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-400/40">
                  <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>{currentLang === "hi" ? "विशेष ऑफर" : "Special Offer"}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {currentLang === "hi" ? "सीमित समय के लिए" : "Limited Time"}
                </span>
              </div>

              {hasHeading && (
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  {promo.heading}
                </h3>
              )}

              {hasDescription && (
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                  {promo.description}
                </p>
              )}

              <div className="pt-1 flex items-center gap-2.5">
                <Link
                  to="/printing"
                  onClick={handleClosePopup}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0e2f5a] text-white py-2.5 px-3 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95"
                >
                  <Tag className="h-4 w-4" />
                  <span>{currentLang === "hi" ? "ऑर्डर करें" : "Order Now"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3.5 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. INLINE HOMEPAGE BANNER CARD (Always displayed on Homepage)
         ========================================================================= */}
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

        <div className="relative flex flex-col md:flex-row items-center gap-5 sm:gap-6 justify-between">
          {/* Banner Graphic Preview */}
          {hasImage && (
            <div
              onClick={() => setShowPopup(true)}
              className="w-full md:w-5/12 lg:w-4/12 shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white/80 p-1.5 shadow-xs border border-amber-200 cursor-pointer group hover:border-amber-400 transition-colors"
              title="Click to view full banner"
            >
              <img
                src={promo.image}
                alt={promo.heading || "Special Offer"}
                className="max-h-[180px] sm:max-h-[200px] w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1 space-y-2 text-center md:text-left pr-0 md:pr-4">
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

              {hasImage && (
                <button
                  type="button"
                  onClick={() => setShowPopup(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/80 hover:bg-white text-slate-700 px-3 py-2 text-xs font-semibold shadow-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-[#123B70]" />
                  <span>{currentLang === "hi" ? "बैनर देखें" : "View Banner"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
