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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-xs overscroll-contain animate-in fade-in duration-200"
          onClick={handleClose}
        >
          {/* Centered Modal Card: Generous width, responsive max height */}
          <div
            className="relative w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-visible border-2 border-amber-400/90 animate-in zoom-in-95 duration-250 flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prominent Floating Close Button (Overlapping Top-Right Corner) */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close popup"
              className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 z-[100000] flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl ring-4 ring-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
            </button>

            {/* Flyer Image Container */}
            <div className="relative w-full bg-slate-950 rounded-t-2xl sm:rounded-t-3xl overflow-hidden flex items-center justify-center">
              <Link
                to="/printing"
                onClick={handleClose}
                className="block w-full cursor-pointer group"
                title="Click to view all printing products"
              >
                <img
                  src={promo.image}
                  alt={promo.heading || "Special Promotional Offer"}
                  className="w-full h-auto max-h-[75vh] object-contain mx-auto block group-hover:opacity-95 transition-opacity"
                  loading="eager"
                />
              </Link>
            </div>

            {/* Bottom Action Strip */}
            <div className="bg-linear-to-r from-amber-50 via-white to-amber-50 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-amber-200 rounded-b-2xl sm:rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-amber-900 bg-amber-200/90 px-3 py-1 rounded-full border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>{currentLang === "hi" ? "विशेष ऑफर" : "Special Offer"}</span>
                </span>
                {promo.description && (
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 hidden sm:inline truncate max-w-[320px]">
                    {promo.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <Link
                  to="/printing"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] hover:bg-[#0c2a52] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{currentLang === "hi" ? "अभी ऑर्डर करें" : "Shop Now"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
                </a>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  {currentLang === "hi" ? "बंद करें" : "Close"}
                </button>
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
          className="fixed bottom-20 left-4 z-[9990] inline-flex items-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xl ring-2 ring-white/90 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-300"
          title="Click to view special promotional offer"
        >
          <Sparkles className="w-4 h-4 text-amber-100 animate-pulse" />
          <span>{currentLang === "hi" ? "विशेष ऑफर देखें" : "Special Offer"}</span>
        </button>
      )}
    </>,
    document.body
  );
};
