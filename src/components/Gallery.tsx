import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { extendedTranslations } from "../config/translations";
import type {
  SampleItem,
  SampleCategory,
} from "../config/samples";
import {
  sampleItems,
  sampleCategories,
} from "../config/samples";
import SampleImage from "./SampleImage";
import { getWhatsAppLink } from "../config/business";
import { useScrollLock } from "../hooks/useScrollLock";
import { cn } from "../lib/utils";

interface GalleryProps {
  selectedSample?: SampleItem | null;
  initialSample?: SampleItem | null;
  onCloseSelectedSample?: () => void;
  onClose?: () => void;
  onOpenRequestModal?: (serviceId?: string) => void;
}

export default function Gallery({
  selectedSample = null,
  initialSample = null,
  onCloseSelectedSample,
  onClose,
}: GalleryProps) {
  const effectiveSample = selectedSample || initialSample;
  const effectiveClose = onCloseSelectedSample || onClose;

  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const t = extendedTranslations.gallery;

  const [activeCategory, setActiveCategory] = useState<SampleCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Sync external sample selection (e.g. from homepage or service card) with lightbox
  useEffect(() => {
    if (effectiveSample) {
      setActiveCategory("all");
      setSearchQuery("");
      const allIdx = sampleItems.findIndex((item) => item.id === effectiveSample.id);
      setLightboxIndex(allIdx !== -1 ? allIdx : 0);
    }
  }, [effectiveSample]);

  // Filter logic
  const filteredItems = sampleItems.filter((item) => {
    const matchesCategory =
      activeCategory === "all" || item.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.en.toLowerCase().includes(q) ||
      item.title.hi.toLowerCase().includes(q) ||
      item.description.en.toLowerCase().includes(q) ||
      item.description.hi.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    if (effectiveClose) {
      effectiveClose();
    }
  }, [effectiveClose]);

  const prevLightbox = useCallback(() => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((prev) => (prev === 0 ? filteredItems.length - 1 : prev! - 1));
  }, [lightboxIndex, filteredItems.length]);

  const nextLightbox = useCallback(() => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((prev) => (prev === filteredItems.length - 1 ? 0 : prev! + 1));
  }, [lightboxIndex, filteredItems.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
      if (e.key === "ArrowRight") nextLightbox();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, closeLightbox, prevLightbox, nextLightbox]);

  const activeItem =
    lightboxIndex !== null && filteredItems[lightboxIndex]
      ? filteredItems[lightboxIndex]
      : null;

  useScrollLock(Boolean(activeItem));

  return (
    <section id="gallery" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-navy/10 px-3.5 py-1 text-xs font-bold text-navy">
          <Sparkles size={14} className="text-amber-500" />
          <span className={cn(currentLang === "hi" && "font-hindi")}>
            {currentLang === "hi" ? "सैंपल पोर्टफोलियो" : "Sample Portfolio"}
          </span>
        </div>
        <h2
          className={cn(
            "mt-3 font-display text-2xl font-extrabold text-navy sm:text-4xl",
            currentLang === "hi" && "font-hindi"
          )}
        >
          {t.heading[currentLang]}
        </h2>
        <p className={cn("mt-2.5 text-base text-slate-500 max-w-2xl mx-auto", currentLang === "hi" && "font-hindi")}>
          {t.sub[currentLang]}
        </p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="mt-10 flex flex-col items-center justify-between gap-4 lg:flex-row">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {sampleCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
                activeCategory === cat.id
                  ? "bg-navy text-white shadow-sm scale-[1.02]"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-navy",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {cat.name[currentLang]}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-xs sm:w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder[currentLang]}
            className={cn(
              "w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20",
              currentLang === "hi" && "font-hindi"
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Samples Portfolio Grid */}
      {filteredItems.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item, index) => {
            const message =
              currentLang === "hi"
                ? `नमस्ते, मैं आपके "${item.title.hi}" (सैंपल डिज़ाइन) के बारे में जानकारी चाहता हूँ।`
                : `Hello, I would like to inquire about "${item.title.en}" (Sample Design).`;

            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md"
              >
                {/* Image & Lightbox Trigger */}
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  <SampleImage
                    src={item.image}
                    alt={item.title[currentLang]}
                    title={item.title[currentLang]}
                    fallbackType={item.fallbackType}
                    width={500}
                    height={375}
                  />

                  {/* Badge */}
                  <span
                    className={cn(
                      "absolute top-3 left-3 rounded-full bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-xs border border-white/20",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {item.badge[currentLang]}
                  </span>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-navy/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-navy shadow-md">
                      {currentLang === "hi" ? "बड़ा करके देखें" : "Click to Enlarge"}
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="flex flex-1 flex-col p-4">
                  <h3
                    className={cn(
                      "font-display text-base font-bold text-navy line-clamp-1 group-hover:text-brandred transition-colors",
                      currentLang === "hi" && "font-hindi text-[1.05rem]"
                    )}
                  >
                    {item.title[currentLang]}
                  </h3>
                  <p
                    className={cn(
                      "mt-1.5 flex-1 text-xs text-slate-500 line-clamp-2 leading-relaxed",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {item.description[currentLang]}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className={cn(
                        "text-xs font-bold text-navy hover:text-brandred transition-colors cursor-pointer",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {currentLang === "hi" ? "ज़ूम देखें" : "View Zoom"}
                    </button>

                    <a
                      href={getWhatsAppLink(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-500 hover:text-white",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      <MessageSquare size={13} />
                      {currentLang === "hi" ? "पूछताछ" : "Inquire"}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className={cn("text-base text-slate-500", currentLang === "hi" && "font-hindi")}>
            {t.noSamples[currentLang]}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory("all");
              setSearchQuery("");
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white cursor-pointer"
          >
            {t.filterAll[currentLang]}
          </button>
        </div>
      )}

      {/* Legal & Sample Disclaimer Notice */}
      <div className="mt-12 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-center">
        <p className={cn("text-xs text-amber-900/90 font-medium leading-relaxed max-w-4xl mx-auto", currentLang === "hi" && "font-hindi")}>
          {t.disclaimer[currentLang]}
        </p>
      </div>

      {/* Lightbox Modal */}
      {activeItem && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title[currentLang]}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            aria-label={t.close[currentLang]}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/20 p-2.5 text-white backdrop-blur hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
          >
            <X size={24} />
          </button>

          {/* Previous button */}
          <button
            type="button"
            onClick={prevLightbox}
            aria-label={t.previous[currentLang]}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={nextLightbox}
            aria-label={t.next[currentLang]}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
          >
            <ChevronRight size={28} />
          </button>

          {/* Modal Card Box */}
          <div
            className="relative flex flex-col lg:flex-row max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(90vh,860px)] max-w-4xl w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div className="relative flex-1 bg-slate-900 min-h-[300px] lg:min-h-[450px] flex items-center justify-center p-2">
              <SampleImage
                src={activeItem.image}
                alt={activeItem.title[currentLang]}
                title={activeItem.title[currentLang]}
                fallbackType={activeItem.fallbackType}
                width={800}
                height={600}
                priority
                className="max-h-[65vh] w-auto max-w-full rounded object-contain"
              />

              <span
                className={cn(
                  "absolute top-4 left-4 rounded-full bg-slate-900/85 backdrop-blur px-3 py-1 text-xs font-bold text-amber-300 border border-white/20",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {activeItem.badge[currentLang]}
              </span>
            </div>

            {/* Information & Action Sidebar */}
            <div className="flex flex-col justify-between p-6 lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto overscroll-contain">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {currentLang === "hi" ? "नमूना डिज़ाइन" : "Sample Design"}
                </span>

                <h3
                  className={cn(
                    "mt-1 font-display text-xl font-bold text-navy",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {activeItem.title[currentLang]}
                </h3>

                <p
                  className={cn(
                    "mt-3 text-sm text-slate-500 leading-relaxed",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {activeItem.description[currentLang]}
                </p>

                {/* Source attribution */}
                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span>Source: {activeItem.source.name}</span>
                    <span className="font-semibold text-slate-600">{activeItem.source.license}</span>
                  </div>
                </div>
              </div>

              {/* Modal CTA */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <a
                  href={getWhatsAppLink(
                    currentLang === "hi"
                      ? `नमस्ते, मैं आपके "${activeItem.title.hi}" (सैंपल डिज़ाइन) के बारे में पूछना चाहता हूँ।`
                      : `Hello, I would like to inquire about "${activeItem.title.en}" (Sample Design).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-center gap-2 w-full rounded-full bg-brandred px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-navy hover:scale-[1.02]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <MessageSquare size={16} />
                  {t.inquireSample[currentLang]}
                </a>

                <p className={cn("mt-2 text-center text-[11px] text-slate-400", currentLang === "hi" && "font-hindi")}>
                  {currentLang === "hi" ? "कीबोर्ड: Arrow Keys से बदलें, Esc से बंद करें" : "Use ← → arrows to navigate, Esc to close"}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

export { Gallery };
