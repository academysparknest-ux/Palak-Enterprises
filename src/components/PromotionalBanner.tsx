import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight, MessageCircle, ShoppingBag } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { getWhatsAppLink } from "../config/business";
import { useScrollLock } from "../hooks/useScrollLock";

interface PromoData {
  heading?: string;
  description?: string;
  image?: string;
  is_active: boolean;
}

const POPUP_DISMISS_KEY = "palak_promo_popup_dismissed_v4";

export const PromotionalBanner: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Bulletproof background scroll locking: freezes html + body scroll
  useScrollLock(isOpen);

  useEffect(() => {
    let isMounted = true;

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

          const isSessionDismissed = sessionStorage.getItem(POPUP_DISMISS_KEY) === "true";
          if (promoItem.image && !isSessionDismissed) {
            setTimeout(() => {
              if (isMounted) {
                setIsOpen(true);
              }
            }, 300);
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

  if (typeof document === "undefined") {
    return null;
  }

  // Use createPortal so the modal is mounted directly under document.body,
  // completely bypassing any CSS transform / filter traps on ancestor elements (like PageTransition).
  return createPortal(
    <>
      {/* =========================================================================
          LIGHTBOX POPUP MODAL (Attached to document.body, dead-center on viewport)
         ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={promo.heading || "Special Offer Popup"}
          className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden flex items-center justify-center p-3 pt-6 pb-6 sm:p-5 md:p-8 popup-backdrop-golden-glossy overscroll-contain animate-in fade-in duration-300"
          onClick={handleClose}
        >
          {/* Ambient Golden Glossy Radial Glow behind the popup */}
          <div
            className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <div className="w-[min(94vw,680px)] h-[min(94vw,680px)] rounded-full popup-ambient-glow animate-pulseSoft pointer-events-none" />
          </div>

          {/* Centered Modal Card: Standard ideal size (max-w 580px) with golden glossy premium frame */}
          <div
            className="relative w-fit max-w-[min(92vw,580px)] min-w-[min(90vw,310px)] sm:min-w-0 popup-card-golden-glossy rounded-2xl sm:rounded-3xl ring-1 ring-amber-300/80 overflow-visible animate-in zoom-in-95 duration-250 flex flex-col my-auto mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Standard Floating Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close popup"
              className="absolute -top-3 -right-3 sm:-top-3.5 sm:-right-3.5 z-[100000] flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl ring-2 sm:ring-3 ring-amber-300 hover:scale-110 active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              <X className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2.5]" />
            </button>

            {/* Flyer Image Container: Standard proportioned constraints */}
            <div className="relative w-fit max-w-full overflow-hidden rounded-t-2xl sm:rounded-t-3xl flex items-center justify-center bg-white mx-auto">
              <Link
                to="/printing"
                onClick={handleClose}
                className="block cursor-pointer group w-fit max-w-full"
                title="Click to view all printing products"
              >
                <img
                  src={promo.image}
                  alt={promo.heading || "Special Promotional Offer"}
                  className="block max-w-[min(90vw,580px)] max-h-[50dvh] sm:max-h-[55dvh] md:max-h-[460px] w-auto h-auto object-contain mx-auto group-hover:opacity-95 transition-opacity select-none"
                  loading="eager"
                />
              </Link>
            </div>

            {/* Bottom Action Strip: Balanced standard proportion */}
            <div className="bg-linear-to-r from-amber-100/95 via-amber-50/90 to-amber-100/95 p-3 sm:px-4.5 sm:py-3 border-t border-amber-300/80 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 w-full backdrop-blur-xs">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full sm:w-auto">
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-amber-950 bg-linear-to-r from-amber-400 via-amber-300 to-amber-500 px-2 py-0.5 sm:px-2.5 rounded-full border border-amber-300 shadow-xs shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-900" />
                  <span>{currentLang === "hi" ? "विशेष ऑफर" : "Special Offer"}</span>
                </span>
                {promo.description && (
                  <span
                    className="text-xs sm:text-sm font-semibold text-slate-700 truncate"
                    title={promo.description}
                  >
                    {promo.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto sm:ml-auto shrink-0">
                <Link
                  to="/printing"
                  onClick={handleClose}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0c2a52] text-white px-3.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{currentLang === "hi" ? "अभी ऑर्डर करें" : "Shop Now"}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Reopen Pill (stays fixed at bottom-left corner of the viewport) */}
      {!isOpen && hasDismissed && (
        <button
          type="button"
          onClick={handleOpen}
          className="floating-bottom-left-btn inline-flex items-center justify-center gap-1.5 sm:gap-2 w-auto min-w-fit shrink-0 whitespace-nowrap rounded-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold shadow-xl ring-2 ring-white/90 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-300 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:animate-none motion-reduce:transition-none motion-reduce:transform-none select-none z-[45]"
          title={currentLang === "hi" ? "विशेष प्रोमोशनल ऑफर देखें" : "Click to view special promotional offer"}
          aria-label={currentLang === "hi" ? "विशेष प्रोमोशनल ऑफर देखें" : "View special promotional offer"}
        >
          <Sparkles className="w-4 h-4 text-amber-100 animate-pulse motion-reduce:animate-none shrink-0" />
          <span className="whitespace-nowrap leading-none">{currentLang === "hi" ? "विशेष ऑफर देखें" : "Special Offer"}</span>
        </button>
      )}
    </>,
    document.body
  );
};
