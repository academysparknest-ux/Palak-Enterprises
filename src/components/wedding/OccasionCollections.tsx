import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { type CardOccasion } from "../../lib/storage/catalogData";
import { OCCASIONS_LIST } from "./weddingConstants";
import { cn } from "../../lib/utils";

interface OccasionCollectionsProps {
  selectedOccasion: string;
  onSelectOccasion: (occasion: CardOccasion | "all") => void;
}

export const OccasionCollections: React.FC<OccasionCollectionsProps> = ({
  selectedOccasion,
  onSelectOccasion,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#881337]">
            {currentLang === "hi" ? "मांगलिक उत्सव के अनुसार" : "Shop By Occasion"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {currentLang === "hi" ? "कलेक्शन एक्सप्लोर करें" : "Explore Collections"}
          </h2>
        </div>
        <p className="text-xs text-slate-500 max-w-sm">
          {currentLang === "hi"
            ? "अपने आयोजन का चयन करें और उससे संबंधित सभी सुंदर कार्ड डिज़ाइन देखें।"
            : "Select your event to filter tailored invitation templates and finishes."}
        </p>
      </div>

      {/* Grid of Occasions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {OCCASIONS_LIST.map((occ) => {
          const isSelected = selectedOccasion === occ.id;
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => onSelectOccasion(occ.id)}
              className={cn(
                "group relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer",
                occ.colorBg,
                isSelected
                  ? "border-[#881337] ring-2 ring-[#881337]/30 bg-white shadow-md scale-[1.02]"
                  : "border-slate-200/90 hover:border-[#881337]/60 hover:bg-white hover:shadow-xs"
              )}
            >
              <div>
                <div className="text-2xl sm:text-3xl mb-2 group-hover:scale-110 transition-transform origin-left">
                  {occ.emoji}
                </div>
                <h3
                  className={cn(
                    "text-xs sm:text-sm font-bold line-clamp-1 leading-snug",
                    isSelected ? "text-[#881337]" : "text-slate-900 group-hover:text-[#881337]"
                  )}
                >
                  {currentLang === "hi" ? occ.nameHi : occ.nameEn}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-tight hidden sm:block">
                  {currentLang === "hi" ? occ.descHi : occ.descEn}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">
                  {occ.priceFrom}
                </span>
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#881337]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default OccasionCollections;
