import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { galleryCategories, galleryData } from "../config/gallery";
import { Maximize2, X, ChevronLeft, ChevronRight, Info, ExternalLink, Send, ImageOff } from "lucide-react";

interface GalleryProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ onOpenRequestModal }) => {
  const { language, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const filteredData =
    activeCategory === "all"
      ? galleryData
      : galleryData.filter((item) => item.category === activeCategory);

  const activeItem = activeItemIndex !== null ? filteredData[activeItemIndex] : null;

  const handlePrevItem = useCallback(() => {
    if (activeItemIndex === null || filteredData.length === 0) return;
    setActiveItemIndex((prev) => (prev === 0 ? filteredData.length - 1 : (prev as number) - 1));
  }, [activeItemIndex, filteredData.length]);

  const handleNextItem = useCallback(() => {
    if (activeItemIndex === null || filteredData.length === 0) return;
    setActiveItemIndex((prev) => (prev === filteredData.length - 1 ? 0 : (prev as number) + 1));
  }, [activeItemIndex, filteredData.length]);

  const handleOpenLightbox = (index: number, e: React.SyntheticEvent) => {
    lastFocusedElementRef.current = e.currentTarget as HTMLElement;
    setActiveItemIndex(index);
  };

  const handleCloseLightbox = () => {
    setActiveItemIndex(null);
    if (lastFocusedElementRef.current) {
      setTimeout(() => {
        lastFocusedElementRef.current?.focus();
      }, 50);
    }
  };

  // Lock scroll, manage focus & keyboard navigation for Lightbox
  useEffect(() => {
    if (activeItemIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus close button when modal opens
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseLightbox();
      } else if (e.key === "ArrowLeft") {
        handlePrevItem();
      } else if (e.key === "ArrowRight") {
        handleNextItem();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeItemIndex, handlePrevItem, handleNextItem]);

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section id="gallery" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-900 bg-blue-100 border border-blue-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
            {language === "hi" ? "सैंपल एवं रेफरेंस कार्य" : "Sample & Reference Showcase"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            {t.gallery.title}
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            {t.gallery.subtitle}
          </p>

          {/* Explicit Misrepresentation Disclaimer Banner */}
          <div className="mt-4 p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs font-medium inline-flex items-center space-x-2 text-left max-w-2xl">
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{t.gallery.sampleDisclaimer}</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 mb-10" role="tablist" aria-label="Sample Categories">
          {galleryCategories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveItemIndex(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer min-h-[44px] ${
                activeCategory === cat.id
                  ? "bg-blue-900 text-white shadow-md shadow-blue-950/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {language === "hi" ? cat.hi : cat.en}
            </button>
          ))}
        </div>

        {/* Samples Grid (4 columns desktop, 2-3 tablet, 1 mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredData.map((item, index) => {
            const hasFailed = failedImageIds[item.id];

            return (
              <div
                key={item.id}
                onClick={(e) => handleOpenLightbox(index, e)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenLightbox(index, e);
                  }
                }}
                aria-label={`View ${item.title[language]}`}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 bg-white flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                {/* Image Container with Aspect Ratio */}
                <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                  {!hasFailed ? (
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt[language]}
                      loading="lazy"
                      onError={() => handleImageError(item.id)}
                      className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none transition-transform duration-500"
                    />
                  ) : (
                    /* Local Gradient Fallback if remote URL fails */
                    <div
                      className={`w-full h-full bg-gradient-to-br ${item.colorTheme} p-4 flex flex-col justify-between text-white`}
                    >
                      <div className="flex items-center space-x-1 text-xs opacity-75">
                        <ImageOff className="w-4 h-4" />
                        <span>Sample Preview</span>
                      </div>
                      <h4 className="font-bold text-base line-clamp-2">{item.title[language]}</h4>
                    </div>
                  )}

                  {/* Gradient Overlay for Text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                    <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs border border-white/50">
                      {item.badge[language]}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-slate-900/60 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Bottom Image Title */}
                  <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                    <h3 className="font-extrabold text-sm sm:text-base text-white line-clamp-1 group-hover:translate-x-0.5 motion-reduce:transform-none transition-transform">
                      {item.title[language]}
                    </h3>
                  </div>
                </div>

                {/* Card Content & Footer */}
                <div className="p-4 flex flex-col justify-between flex-grow bg-white">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.subtitle[language]}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{item.source}</span>
                    <span className="font-bold text-blue-900 group-hover:underline shrink-0 ml-2">
                      {language === "hi" ? "विस्तार से देखें →" : "View Sample →"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Lightbox Modal */}
        {activeItem && activeItemIndex !== null && (
          <div
            className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
          >
            {/* Main Lightbox Container */}
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
              {/* Top Navigation Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-900 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-200">
                    {activeItem.badge[language]}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {language === "hi"
                      ? `नमूना ${activeItemIndex + 1} / ${filteredData.length}`
                      : `Sample ${activeItemIndex + 1} of ${filteredData.length}`}
                  </span>
                </div>

                {/* Close Button */}
                <button
                  ref={closeButtonRef}
                  onClick={handleCloseLightbox}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer min-w-[44px] min-h-[44px]"
                  aria-label={language === "hi" ? "पूर्वावलोकन बंद करें" : "Close preview"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lightbox Body: Image Preview + Details */}
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                {/* Image Stage with Controls */}
                <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center max-h-[50vh] sm:max-h-[60vh]">
                  {!failedImageIds[activeItem.id] ? (
                    <img
                      src={activeItem.imageUrl}
                      alt={activeItem.imageAlt[language]}
                      className="w-full h-full object-contain bg-slate-950"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${activeItem.colorTheme} p-8 text-white flex flex-col items-center justify-center text-center`}
                    >
                      <ImageOff className="w-12 h-12 mb-3 opacity-60" />
                      <h4 className="text-xl font-black">{activeItem.title[language]}</h4>
                      <p className="text-xs text-white/80 mt-1">{activeItem.subtitle[language]}</p>
                    </div>
                  )}

                  {/* Previous / Next Arrow Controls */}
                  <button
                    onClick={handlePrevItem}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white cursor-pointer min-w-[44px] min-h-[44px]"
                    aria-label="Previous sample"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleNextItem}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white cursor-pointer min-w-[44px] min-h-[44px]"
                    aria-label="Next sample"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Details Content */}
                <div>
                  <h3 id="lightbox-title" className="text-2xl font-black text-slate-900">
                    {activeItem.title[language]}
                  </h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                    {activeItem.subtitle[language]}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center space-x-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Source: <strong>{activeItem.source}</strong>
                      </span>
                    </span>
                    <span className="text-[11px] italic text-slate-400">
                      {language === "hi"
                        ? "पालक इंटरप्राइजेज डिज़ाइन एवं प्रिंटिंग क्षमता का नमूना"
                        : "Reference design sample by Palak Enterprises"}
                    </span>
                  </div>
                </div>

                {/* CTA Footer inside Lightbox */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    {language === "hi"
                      ? "क्या आपको ऐसा ही प्रिंटिंग या डिज़ाइन कार्य चाहिए?"
                      : "Looking for similar printing or custom design work?"}
                  </p>

                  <button
                    onClick={() => {
                      const relatedId = activeItem.relatedServiceIds?.[0];
                      handleCloseLightbox();
                      if (onOpenRequestModal) {
                        onOpenRequestModal(relatedId);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer min-h-[44px]"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {language === "hi" ? "इस प्रकार का ऑर्डर दें" : "Request Similar Print"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
