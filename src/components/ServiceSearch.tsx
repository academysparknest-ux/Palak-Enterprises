import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { servicesData, serviceCategories, type ServiceItem } from "../config/services";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import { cn } from "../lib/utils";

interface ServiceSearchProps {
  onSelectService?: (service: ServiceItem) => void;
  isCompact?: boolean;
}

export const ServiceSearch: React.FC<ServiceSearchProps> = ({ isCompact = false }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Filter across ALL 30+ services
  const matchingServices = servicesData.filter((service) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    const nameEn = service.name.en.toLowerCase();
    const nameHi = service.name.hi.toLowerCase();
    const descEn = service.description.en.toLowerCase();
    const descHi = service.description.hi.toLowerCase();
    const tagsMatch = service.tags.some((tag) => tag.toLowerCase().includes(q));

    return (
      nameEn.includes(q) ||
      nameHi.includes(q) ||
      descEn.includes(q) ||
      descHi.includes(q) ||
      tagsMatch
    );
  });

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (serviceId: string) => {
    setIsFocused(false);
    navigate(`/services/${serviceId}`);
  };

  const quickPopularTerms = [
    { en: "Passport Photo", hi: "पासपोर्ट फोटो", id: "passport-photo" },
    { en: "Aadhaar Print", hi: "आधार प्रिंट", id: "aadhaar-print" },
    { en: "Lamination", hi: "लैमिनेशन", id: "lamination" },
    { en: "Visiting Card", hi: "विजिटिंग कार्ड", id: "visiting-cards" },
    { en: "Online Form", hi: "ऑनलाइन फॉर्म", id: "online-forms" },
    { en: "Pension", hi: "पेंशन", id: "pension-schemes" },
    { en: "Website", hi: "वेबसाइट", id: "website-development" },
  ];

  return (
    <section className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div
        ref={searchRef}
        className={cn(
          "bg-white rounded-2xl shadow-xl border border-slate-200 transition-all relative",
          isCompact ? "p-4" : "p-5 sm:p-7"
        )}
      >
        {/* Title */}
        <div className="flex items-center justify-between mb-3">
          <label
            htmlFor="service-search-input"
            className={cn(
              "text-xs sm:text-sm font-bold text-navy uppercase tracking-wide flex items-center gap-2",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <Search className="w-4 h-4 text-brandred" />
            <span>
              {currentLang === "hi" ? "आपको कौन-सी सेवा चाहिए?" : "What do you need?"}
            </span>
          </label>

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-brandred font-semibold hover:underline flex items-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5 mr-0.5" />
              <span>{currentLang === "hi" ? "हटाएँ" : "Clear"}</span>
            </button>
          )}
        </div>

        {/* Input Box */}
        <div className="relative">
          <input
            id="service-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            placeholder={
              currentLang === "hi"
                ? "सेवा खोजें... (जैसे: पासपोर्ट फोटो, आधार, लैमिनेशन, फॉर्म, विजिटिंग कार्ड)"
                : "Search services... (e.g. Passport Photo, Aadhaar, Lamination, Online Form, Visiting Card)"
            }
            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all placeholder:text-slate-400 shadow-inner"
          />
          <Search className="w-6 h-6 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer"
              aria-label="Clear search text"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-3 pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-semibold flex items-center shrink-0 pr-1">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            {currentLang === "hi" ? "सुझाव:" : "Popular:"}
          </span>
          {quickPopularTerms.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setQuery(item[currentLang]);
                setIsFocused(true);
              }}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors shrink-0 cursor-pointer"
            >
              {item[currentLang]}
            </button>
          ))}
        </div>

        {/* Live Search Results Dropdown Overlay */}
        {isFocused && query.trim() !== "" && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-h-96 overflow-y-auto z-50">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-500">
              <span>
                {matchingServices.length}{" "}
                {currentLang === "hi" ? "सेवाएँ मिलीं" : "matching services found"}
              </span>
              <button
                type="button"
                onClick={() => setIsFocused(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {matchingServices.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-sm font-semibold">
                  {currentLang === "hi"
                    ? `"${query}" के लिए कोई सेवा नहीं मिली।`
                    : `No services found matching "${query}".`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {currentLang === "hi"
                    ? "कृपया अलग शब्द से खोजें या हमारी संपूर्ण सेवा सूची देखें।"
                    : "Try searching another term or browse our complete directory."}
                </p>
                <div className="mt-3">
                  <Link
                    to="/services"
                    onClick={() => setIsFocused(false)}
                    className="inline-flex items-center text-xs font-bold text-navy hover:underline"
                  >
                    <span>{currentLang === "hi" ? "सभी सेवाएँ देखें →" : "View All Services →"}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {matchingServices.map((service) => {
                  const cat = serviceCategories.find((c) => c.id === service.categoryId);
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleSelect(service.id)}
                      className="py-3 px-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-colors shrink-0">
                          <DynamicIcon name={service.iconName} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-navy">
                            {service.name[currentLang]}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {cat ? cat.name[currentLang] : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy group-hover:text-brandred hidden sm:inline">
                          {currentLang === "hi" ? "देखें" : "View"}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brandred group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceSearch;
