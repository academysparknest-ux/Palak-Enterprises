import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import {
  OCCASIONS_LIST,
  STYLES_LIST,
  CARD_TYPES,
  RELIGIONS,
  PRICE_RANGES,
  SORT_OPTIONS,
} from "./weddingConstants";
import { useScrollLock } from "../../hooks/useScrollLock";
import { cn } from "../../lib/utils";

export interface FilterState {
  searchQuery: string;
  occasion: string;
  style: string;
  cardType: string;
  religion: string;
  priceRange: string;
  sortBy: string;
}

interface CatalogueToolbarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  totalCount: number;
}

export const CatalogueToolbar: React.FC<CatalogueToolbarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useScrollLock(isMobileDrawerOpen);

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileDrawerOpen]);

  const hasActiveFilters =
    filters.occasion !== "all" ||
    filters.style !== "all" ||
    filters.cardType !== "all" ||
    filters.religion !== "all" ||
    filters.priceRange !== "all" ||
    Boolean(filters.searchQuery);

  return (
    <div className="space-y-4">
      {/* Main Bar: Search, Mobile Filter Trigger, Desktop Dropdowns & Sort */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder={
              currentLang === "hi"
                ? "कार्ड का नाम, SKU (जैसे PE-WED-001), थीम, श्लोक खोजें..."
                : "Search by card name, SKU (e.g. PE-WED-001), style, occasion..."
            }
            className="w-full pl-9.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#881337] focus:outline-hidden transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={cn(
              "md:hidden flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer",
              hasActiveFilters
                ? "bg-[#881337] text-white border-[#881337]"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{currentLang === "hi" ? "फ़िल्टर" : "Filters"}</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Desktop Filter Dropdowns */}
          <div className="hidden md:flex items-center gap-2">
            {/* Occasion Dropdown */}
            <select
              value={filters.occasion}
              onChange={(e) => onFilterChange({ occasion: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#881337] focus:outline-hidden cursor-pointer"
            >
              {OCCASIONS_LIST.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.emoji} {currentLang === "hi" ? o.nameHi : o.nameEn}
                </option>
              ))}
            </select>

            {/* Card Type Dropdown */}
            <select
              value={filters.cardType}
              onChange={(e) => onFilterChange({ cardType: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#881337] focus:outline-hidden cursor-pointer"
            >
              {CARD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {currentLang === "hi" ? t.labelHi : t.labelEn}
                </option>
              ))}
            </select>

            {/* Price Range Dropdown */}
            <select
              value={filters.priceRange}
              onChange={(e) => onFilterChange({ priceRange: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#881337] focus:outline-hidden cursor-pointer"
            >
              {PRICE_RANGES.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {currentLang === "hi" ? pr.labelHi : pr.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="h-4 w-4 text-slate-400 hidden sm:inline" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#881337] focus:outline-hidden cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {currentLang === "hi" ? s.labelHi : s.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Price Range Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold shrink-0 text-[11px] uppercase tracking-wider">
          {currentLang === "hi" ? "बजट:" : "Budget:"}
        </span>
        {PRICE_RANGES.map((pr) => {
          const isSelected = filters.priceRange === pr.id;
          return (
            <button
              key={pr.id}
              type="button"
              onClick={() => onFilterChange({ priceRange: pr.id })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-amber-500 text-slate-950 shadow-2xs font-extrabold"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {currentLang === "hi" ? pr.labelHi : pr.labelEn}
            </button>
          );
        })}
      </div>

      {/* Active Filter Badges & Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800">
            {totalCount} {currentLang === "hi" ? "कार्ड उपलब्ध हैं" : "invitations available"}
          </span>

          {hasActiveFilters && (
            <>
              <span className="text-slate-300">•</span>
              {filters.occasion !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-[#881337] border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold">
                  {OCCASIONS_LIST.find((o) => o.id === filters.occasion)?.nameEn || filters.occasion}
                  <button onClick={() => onFilterChange({ occasion: "all" })} className="hover:text-black">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.style !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold">
                  Style: {STYLES_LIST.find((s) => s.id === filters.style)?.nameEn || filters.style}
                  <button onClick={() => onFilterChange({ style: "all" })} className="hover:text-black">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.cardType !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold">
                  Type: {CARD_TYPES.find((t) => t.id === filters.cardType)?.labelEn || filters.cardType}
                  <button onClick={() => onFilterChange({ cardType: "all" })} className="hover:text-black">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.priceRange !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  Budget: {PRICE_RANGES.find((p) => p.id === filters.priceRange)?.labelEn}
                  <button onClick={() => onFilterChange({ priceRange: "all" })} className="hover:text-black">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold">
                  "{filters.searchQuery}"
                  <button onClick={() => onFilterChange({ searchQuery: "" })} className="hover:text-black">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              <button
                onClick={onResetFilters}
                className="text-[11px] font-bold text-[#881337] hover:underline ml-1 cursor-pointer"
              >
                {currentLang === "hi" ? "सभी हटाएं" : "Clear All"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal / Drawer */}
      {isMobileDrawerOpen && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentLang === "hi" ? "फ़िल्टर विकल्प" : "Filter Options"}
          className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[min(90vh,760px)] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#881337]" />
                <span>{currentLang === "hi" ? "फ़िल्टर विकल्प" : "Filter Options"}</span>
              </h3>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">

            {/* 1. Occasion */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "आयोजन / उत्सव" : "Occasion / Event"}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {OCCASIONS_LIST.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onFilterChange({ occasion: o.id })}
                    className={cn(
                      "p-2 rounded-xl text-left text-xs font-semibold border flex items-center justify-between",
                      filters.occasion === o.id
                        ? "bg-[#881337] text-white border-[#881337]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span className="truncate">{o.emoji} {currentLang === "hi" ? o.nameHi : o.nameEn}</span>
                    {filters.occasion === o.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "डिज़ाइन स्टाइल" : "Design Style"}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLES_LIST.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onFilterChange({ style: s.id })}
                    className={cn(
                      "p-2 rounded-xl text-left text-xs font-semibold border flex items-center justify-between",
                      filters.style === s.id
                        ? "bg-[#881337] text-white border-[#881337]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span>{s.icon} {currentLang === "hi" ? s.nameHi : s.nameEn}</span>
                    {filters.style === s.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Card Format */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "कार्ड का प्रकार / फॉर्मेट" : "Card Format"}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CARD_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onFilterChange({ cardType: t.id })}
                    className={cn(
                      "p-2 rounded-xl text-left text-xs font-semibold border flex items-center justify-between",
                      filters.cardType === t.id
                        ? "bg-[#881337] text-white border-[#881337]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span>{currentLang === "hi" ? t.labelHi : t.labelEn}</span>
                    {filters.cardType === t.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tradition / Religion */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "परंपरा / धर्म" : "Tradition / Ceremony"}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {RELIGIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onFilterChange({ religion: r.id })}
                    className={cn(
                      "p-2 rounded-xl text-left text-xs font-semibold border flex items-center justify-between",
                      filters.religion === r.id
                        ? "bg-[#881337] text-white border-[#881337]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span className="truncate">{currentLang === "hi" ? r.labelHi : r.labelEn}</span>
                    {filters.religion === r.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  onResetFilters();
                  setIsMobileDrawerOpen(false);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {currentLang === "hi" ? "रीसेट करें" : "Reset Filters"}
              </button>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[#881337] text-white text-xs font-bold hover:bg-[#700f2d] cursor-pointer"
              >
                {currentLang === "hi" ? `देखें (${totalCount} कार्ड)` : `Apply (${totalCount} Cards)`}
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

export default CatalogueToolbar;
