import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { serviceCategories } from "../config/services";
import { Search, X, Filter } from "lucide-react";

interface ServiceSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}) => {
  const { language, t } = useLanguage();

  return (
    <section className="relative -mt-8 z-20 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 transition-all">
        {/* Title */}
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="service-search-input" className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center">
            <Search className="w-4 h-4 mr-1.5 text-blue-900" />
            <span>{t.search.title}</span>
          </label>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-red-600 font-semibold hover:underline flex items-center"
            >
              <X className="w-3.5 h-3.5 mr-0.5" />
              <span>{t.search.resetSearch}</span>
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div className="relative mb-4">
          <input
            id="service-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-all placeholder:text-slate-400 shadow-inner"
          />
          <Search className="w-6 h-6 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
              aria-label="Clear search text"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm">
          <span className="text-slate-400 font-semibold flex items-center shrink-0 pr-1">
            <Filter className="w-3.5 h-3.5 mr-1" /> Category:
          </span>

          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 ${
              selectedCategory === "all"
                ? "bg-blue-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.search.allCategories}
          </button>

          {serviceCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-blue-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.name[language]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
