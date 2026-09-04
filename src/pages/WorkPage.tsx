import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { galleryCategories, galleryData } from "../config/gallery";
import {
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageSquare,
  ImageOff,
} from "lucide-react";
import { businessConfig } from "../config/business";
import { useScrollLock } from "../hooks/useScrollLock";

interface WorkPageProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const WorkPage: React.FC<WorkPageProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useScrollLock(activeItemIndex !== null);

  const filteredData =
    activeCategory === "all"
      ? galleryData
      : galleryData.filter((item) => item.category === activeCategory);

  const activeItem = activeItemIndex !== null ? filteredData[activeItemIndex] : null;

  const handleOpenLightbox = (index: number, e: React.MouseEvent) => {
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

  const handlePrevItem = useCallback(() => {
    if (activeItemIndex === null) return;
    setActiveItemIndex((prev) => (prev! === 0 ? filteredData.length - 1 : prev! - 1));
  }, [activeItemIndex, filteredData.length]);

  const handleNextItem = useCallback(() => {
    if (activeItemIndex === null) return;
    setActiveItemIndex((prev) => (prev! === filteredData.length - 1 ? 0 : prev! + 1));
  }, [activeItemIndex, filteredData.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (activeItemIndex === null) return;

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
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeItemIndex, handlePrevItem, handleNextItem]);

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Our Work & Design Gallery | Palak Enterprises Chakia",
          hi: "हमारा काम एवं डिज़ाइन गैलरी | पालक इंटरप्राइजेज चकिया",
        }}
        description={{
          en: "Explore our complete portfolio of printed visiting cards, wedding invitation cards, PVC smart ID cards, stationery, bill books, and flex banners in Chakia, Bihar.",
          hi: "पालक इंटरप्राइजेज चकिया के विजिटिंग कार्ड, शादी आमंत्रण कार्ड, पीवीसी स्मार्ट आईडी कार्ड, बिल बुक व फ्लेक्स बैनर के नमूनों की संपूर्ण गैलरी देखें।",
        }}
        canonicalUrl="/work"
        keywords="printing portfolio Chakia, printing samples Bihar, wedding card samples Chakia, banner design portfolio, Palak Enterprises work"
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Our Work", hi: "हमारा काम" }, path: "/work" },
        ]}
        badge={{
          en: "Interactive Portfolio & Samples Showcase",
          hi: "डिज़ाइन एवं प्रिंटिंग नमूना गैलरी",
        }}
        title={{
          en: "Printing, Cards & Design Portfolio",
          hi: "प्रिंटिंग, कार्ड एवं डिज़ाइन के नमूने",
        }}
        subtitle={{
          en: "Explore reference samples across visiting cards, invitations, photos, banners, and business stationery.",
          hi: "विजिटिंग कार्ड, शादी-उत्सव निमंत्रण, फोटो, बैनर एवं व्यावसायिक स्टेशनरी के सभी संदर्भ नमूने।",
        }}
        primaryCta={{
          label: { en: "Order Similar Work", hi: "ऐसा काम ऑर्डर करें" },
          to: "/request",
        }}
        secondaryCta={{
          label: { en: "WhatsApp Inquiry", hi: "व्हाट्सएप पूछताछ" },
          to: `https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20saw%20your%20work%20gallery%20and%20want%20to%20order%20similar%20design.`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Sample Disclaimer Banner */}
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-8 flex items-start space-x-3 text-xs sm:text-sm text-blue-950">
          <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <p>
            <strong className="font-bold">
              {currentLang === "hi" ? "संदर्भ सूचना:" : "Reference Notice:"}{" "}
            </strong>
            {currentLang === "hi"
              ? "नीचे दिखाए गए सभी नमूने हमारी प्रिंटिंग, डिज़ाइन और फिनिशिंग क्षमताओं को दर्शाने वाले संदर्भ उदाहरण हैं। आपके ऑर्डर के लिए आपकी आवश्यकता अनुसार नया और अनुकूलित डिज़ाइन तैयार किया जाता है।"
              : "All visuals displayed in this gallery are reference sample designs demonstrating our paper quality, layout typography, and printing craftsmanship. Every actual customer order is customized to your specific requirements."}
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto mb-10 text-xs sm:text-sm scrollbar-none">
          {galleryCategories.map((cat) => {
            const count =
              cat.id === "all"
                ? galleryData.length
                : galleryData.filter((item) => item.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-navy text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat[currentLang]} ({count})
              </button>
            );
          })}
        </div>

        {/* Portfolio Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredData.map((item, index) => {
            const hasFailed = failedImageIds[item.id];

            return (
              <div
                key={item.id}
                onClick={(e) => handleOpenLightbox(index, e)}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-navy/40 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                  {!hasFailed ? (
                    <img
                      src={item.imageUrl}
                      alt={item.imageAlt[currentLang]}
                      loading="lazy"
                      onError={() => handleImageError(item.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${item.colorTheme} p-4 flex flex-col justify-between text-white`}
                    >
                      <ImageOff className="w-4 h-4 opacity-75" />
                      <h4 className="font-bold text-sm line-clamp-2">{item.title[currentLang]}</h4>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs border border-white/50">
                      {item.badge[currentLang]}
                    </span>
                  </div>

                  {/* Zoom indicator */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-extrabold text-sm text-white line-clamp-1 group-hover:translate-x-0.5 transition-transform">
                      {item.title[currentLang]}
                    </h3>
                  </div>
                </div>

                <div className="p-4 bg-white flex flex-col justify-between flex-1">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.subtitle[currentLang]}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {item.source}
                    </span>
                    <span className="text-xs font-bold text-navy group-hover:text-brandred transition-colors">
                      {currentLang === "hi" ? "बड़ा देखें" : "Enlarge"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible Lightbox Modal */}
      {activeItem && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title[currentLang]}
          onClick={handleCloseLightbox}
        >
          <div
            className="relative flex flex-col w-full max-w-4xl max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(90vh,860px)] bg-slate-900 text-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                  {activeItem.badge[currentLang]}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                  {activeItem.title[currentLang]}
                </h3>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleCloseLightbox}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Preview */}
            <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[55vh] overflow-hidden">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.imageAlt[currentLang]}
                className="max-h-[55vh] w-auto max-w-full object-contain"
              />

              {/* Prev / Next buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevItem();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextItem();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Footer Details & CTA */}
            <div className="p-6 bg-slate-950 space-y-4">
              <div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeItem.subtitle[currentLang]}
                </p>
                <p className="text-xs text-amber-400 mt-1 font-semibold">
                  Source: {activeItem.source}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}?text=${encodeURIComponent(
                    `Hello Palak Enterprises, I am interested in getting similar work made as seen in your gallery: *${activeItem.title.en}* (${activeItem.title.hi}).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-leaf hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Inquiry for this Sample</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    handleCloseLightbox();
                    onOpenRequestModal(activeItem.relatedServiceIds?.[0]);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-saffron hover:bg-saffron-light text-navy font-bold text-xs shadow-md cursor-pointer transition-transform hover:scale-105"
                >
                  {currentLang === "hi" ? "इस प्रकार का कार्य ऑर्डर करें" : "Request This Design / Product"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorkPage;
