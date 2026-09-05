import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight, MessageCircle, Tag } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { getWhatsAppLink } from "../config/business";

interface PromoData {
  heading?: string;
  description?: string;
  image?: string;
  is_active: boolean;
}

const POPUP_DISMISS_KEY = "palak_promo_popup_dismissed_v1";

export const PromotionalBanner: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Fetch promo content from Supabase
  useEffect(() => {
    let isMounted = true;

    // Check if dismissed in this browser session
    try {
      if (sessionStorage.getItem(POPUP_DISMISS_KEY) === "true") {
        setHasDismissed(true);
      }
    } catch {
      // ignore
    }

    const fetchPromo = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) return;

        const { data, error } = await supabase
          .from("website_content")
          .select("*")
          .eq("section", "promo")
          .single();

        if (error) {
          console.debug("[PromotionalPopup] Notice:", error.message);
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

          // Automatically open popup if active and image exists
          const isSessionDismissed = sessionStorage.getItem(POPUP_DISMISS_KEY) === "true";
          if (promoItem.image && !isSessionDismissed) {
            // Slight delay for smooth entrance after page paints
            setTimeout(() => {
              if (isMounted) {
                setIsOpen(true);
              }
            }, 500);
          }
        }
      } catch (err) {
        console.warn("[PromotionalPopup] Error loading promo:", err);
      }
    };

    fetchPromo();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHasDismissed(true);
    try {
      sessionStorage.setItem(POPUP_DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!promo || !promo.is_active || !promo.image) {
    return null;
  }

  const promoMessage = `Namaste Palak Enterprises, I would like to inquire about the special offer: "${promo.heading || "Printing Offer"}"`;
  const whatsappUrl = getWhatsAppLink(promoMessage);

  return (
    <>
      {/* =========================================================================
          LIGHTBOX POPUP MODAL (School / Notice Pop-Up Style like Roshni Public School)
         ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={promo.heading || "Special Offer Popup"}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClose}
        >
          {/* Centered Modal Card */}
          <div
            className="relative max-w-xl sm:max-w-2xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-400/90 animate-in zoom-in-95 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prominent Circular Floating Close Button (Top-Right) */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close popup"
              className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-30 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl ring-2 ring-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </button>

            {/* Clickable Banner Image */}
            <Link
              to="/printing"
              onClick={handleClose}
              className="block relative bg-slate-950 max-h-[72vh] overflow-hidden group cursor-pointer"
              title="Click to explore printing offers"
            >
              <img
                src={promo.image}
                alt={promo.heading || "Special Promotional Offer"}
                className="w-full h-auto max-h-[72vh] object-contain mx-auto block group-hover:opacity-95 transition-opacity"
                loading="eager"
              />
            </Link>

            {/* Bottom Action Strip */}
            <div className="bg-linear-to-r from-amber-50 via-white to-amber-50 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>{currentLang === "hi" ? "विशेष ऑफर" : "Special Offer"}</span>
                </span>
                {promo.heading && (
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[180px] sm:max-w-[260px]">
                    {promo.heading}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Link
                  to="/printing"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0c2a52] text-white px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{currentLang === "hi" ? "ऑर्डर करें" : "Order Now"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
                </a>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-bold transition-colors cursor-pointer"
                >
                  {currentLang === "hi" ? "बंद करें" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Floating Reopen Pill (Only shown if user dismissed the popup so they can reopen it)
         ========================================================================= */}
      {!isOpen && hasDismissed && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-20 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-2 text-xs font-bold shadow-lg ring-2 ring-white/80 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-300"
          title="Click to view special promotional offer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-100 animate-pulse" />
          <span>{currentLang === "hi" ? "विशेष ऑफर देखें" : "Special Offer"}</span>
        </button>
      )}
    </>
  );
};
