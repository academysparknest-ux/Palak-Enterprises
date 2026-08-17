import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { type CardStyle } from "../../lib/storage/catalogData";
import { STYLES_LIST } from "./weddingConstants";
import { cn } from "../../lib/utils";

interface StyleCollectionsProps {
  selectedStyle: string;
  onSelectStyle: (style: CardStyle | "all") => void;
}

export const StyleCollections: React.FC<StyleCollectionsProps> = ({
  selectedStyle,
  onSelectStyle,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {currentLang === "hi" ? "स्टाइल के अनुसार फ़िल्टर करें" : "Find Your Style"}
        </span>
        {selectedStyle !== "all" && (
          <button
            onClick={() => onSelectStyle("all")}
            className="text-[11px] font-bold text-[#881337] hover:underline cursor-pointer"
          >
            {currentLang === "hi" ? "रीसेट करें" : "Clear style filter"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STYLES_LIST.map((st) => {
          const isSelected = selectedStyle === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStyle(st.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                isSelected
                  ? "bg-[#881337] text-white shadow-xs scale-105"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span>{st.icon}</span>
              <span>{currentLang === "hi" ? st.nameHi : st.nameEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StyleCollections;
