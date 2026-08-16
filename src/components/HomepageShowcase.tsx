import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { galleryData } from "../config/gallery";
import { ArrowRight, Sparkles, ImageOff } from "lucide-react";

export const HomepageShowcase: React.FC = () => {
  const { language } = useLanguage();
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  const featuredSamples = galleryData.filter((item) => item.featuredOnHome).slice(0, 8);

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-800" />
              <span>{language === "hi" ? "सैंपल डिज़ाइन प्रदर्शनी" : "Design Inspiration"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {language === "hi" ? "प्रिंटिंग एवं डिज़ाइन के नमूने" : "Printing & Design Samples"}
            </h2>
            <p className="text-slate-600 mt-1 max-w-2xl text-sm sm:text-base">
              {language === "hi"
                ? "हमारी प्रिंटिंग, स्टेशनरी और डिजिटल सेवाओं के नमूने देखें जो हम आपके लिए बना सकते हैं।"
                : "Explore examples of printing, stationery, and digital services we can help you create."}
            </p>
          </div>

          <a
            href="#gallery"
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 font-bold text-blue-900 hover:text-blue-700 text-sm group shrink-0"
          >
            <span>{language === "hi" ? "सभी नमूने देखें" : "View All Samples"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* 6-8 Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredSamples.map((sample) => {
            const hasFailed = failedImageIds[sample.id];

            return (
              <a
                key={sample.id}
                href="#gallery"
                className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 bg-white flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                  {!hasFailed ? (
                    <img
                      src={sample.imageUrl}
                      alt={sample.imageAlt[language]}
                      loading="lazy"
                      onError={() => handleImageError(sample.id)}
                      className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${sample.colorTheme} p-4 flex flex-col justify-between text-white`}
                    >
                      <ImageOff className="w-4 h-4 opacity-75" />
                      <h4 className="font-bold text-sm line-clamp-2">{sample.title[language]}</h4>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs border border-white/50">
                      {sample.badge[language]}
                    </span>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-extrabold text-sm text-white line-clamp-1 group-hover:translate-x-0.5 transition-transform">
                      {sample.title[language]}
                    </h3>
                  </div>
                </div>

                <div className="p-4 bg-white flex items-center justify-between">
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {sample.subtitle[language]}
                  </p>
                  <span className="text-[11px] font-bold text-blue-900 flex items-center shrink-0 ml-2">
                    {language === "hi" ? "नमूना" : "Sample"}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Bottom CTA Bar */}
        <div className="mt-10 text-center">
          <a
            href="#gallery"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <span>{language === "hi" ? "सभी 18+ नमूने व डिज़ाइन देखें →" : "Explore All 18+ Samples →"}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
