import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { galleryData } from "../config/gallery";
import { ArrowRight, Sparkles, ImageOff } from "lucide-react";
import { cn } from "../lib/utils";

export const HomepageShowcase: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  // Pick exactly 6 featured preview samples for the homepage
  const previewSamples = galleryData.filter((item) => item.featuredOnHome).slice(0, 6);

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-navy bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-navy" />
              <span>{currentLang === "hi" ? "कार्य झलक" : "Portfolio Preview"}</span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-black text-slate-900 tracking-tight",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "हमारे कार्य की एक झलक" : "A Glimpse of Our Work"}
            </h2>
            <p
              className={cn(
                "text-slate-600 mt-1 max-w-2xl text-sm sm:text-base",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi"
                ? "हमारी प्रिंटिंग, कार्ड, फोटो एवं स्टेशनरी डिज़ाइन के कुछ प्रमुख नमूने।"
                : "A brief selection of our printing, cards, photos, and stationery samples."}
            </p>
          </div>

          <Link
            to="/work"
            className={cn(
              "inline-flex items-center gap-1.5 font-bold text-navy hover:text-brandred text-sm group shrink-0",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <span>{currentLang === "hi" ? "सभी कार्य देखें" : "View All Work"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 6 Preview Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {previewSamples.map((sample) => {
            const hasFailed = failedImageIds[sample.id];

            return (
              <Link
                key={sample.id}
                to="/work"
                className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:border-navy/30 transition-all bg-white flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                  {!hasFailed ? (
                    <img
                      src={sample.imageUrl}
                      alt={sample.imageAlt[currentLang]}
                      loading="lazy"
                      onError={() => handleImageError(sample.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${sample.colorTheme} p-4 flex flex-col justify-between text-white`}
                    >
                      <ImageOff className="w-4 h-4 opacity-75" />
                      <h4 className="font-bold text-sm line-clamp-2">{sample.title[currentLang]}</h4>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs border border-white/50">
                      {sample.badge[currentLang]}
                    </span>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-extrabold text-sm text-white line-clamp-1 group-hover:translate-x-0.5 transition-transform">
                      {sample.title[currentLang]}
                    </h3>
                  </div>
                </div>

                <div className="p-4 bg-white flex items-center justify-between">
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {sample.subtitle[currentLang]}
                  </p>
                  <span className="text-[11px] font-bold text-navy flex items-center shrink-0 ml-2 group-hover:text-brandred transition-colors">
                    {currentLang === "hi" ? "देखें →" : "View →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Link to Full Gallery */}
        <div className="mt-10 text-center">
          <Link
            to="/work"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-navy hover:bg-navy/90 text-white font-bold text-sm shadow-md transition-all",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <span>{currentLang === "hi" ? "संपूर्ण गैलरी व नमूने देखें (18+ डिज़ाइन) →" : "View Complete Work Gallery (18+ Designs) →"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomepageShowcase;
