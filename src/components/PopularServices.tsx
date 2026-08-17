import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { servicesData, type ServiceItem } from "../config/services";
import { DynamicIcon } from "./DynamicIcon";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

interface PopularServicesProps {
  onSelectService?: (service: ServiceItem) => void;
}

export const PopularServices: React.FC<PopularServicesProps> = ({ onSelectService }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Pick exactly 6 key popular services specified in requirements
  const popularServiceIds = [
    "passport-photo",
    "document-printing",
    "aadhaar-print",
    "lamination",
    "visiting-cards",
    "online-form",
  ];

  const popularServices = popularServiceIds
    .map((id) => servicesData.find((s) => s.id === id))
    .filter(Boolean) as ServiceItem[];

  // Fallback if any ID changed
  const displayServices =
    popularServices.length === 6
      ? popularServices
      : servicesData.filter((s) => s.popular || s.featured).slice(0, 6);

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brandred bg-red-50/70 border border-red-200/60 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentLang === "hi" ? "पालक इंटरप्राइजेज" : "Palak Enterprises"}</span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-black text-slate-900 tracking-tight",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "सर्वाधिक लोकप्रिय सेवाएँ" : "Popular Services"}
            </h2>
            <p
              className={cn(
                "text-slate-600 mt-1 max-w-2xl text-sm sm:text-base",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi"
                ? "हमारी सबसे ज्यादा उपयोग की जाने वाली मुख्य सेवाएँ — त्वरित और विश्वसनीय।"
                : "Fast, everyday printing and digital assistance trusted by local customers."}
            </p>
          </div>

          <Link
            to="/services"
            className={cn(
              "inline-flex items-center gap-1.5 font-bold text-navy hover:text-brandred text-sm group shrink-0",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <span>{currentLang === "hi" ? "सभी सेवाएँ देखें" : "View All Services"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 6 Popular Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-colors">
                    <DynamicIcon name={service.icon || service.iconName || "Sparkles"} className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    {currentLang === "hi" ? "लोकप्रिय" : "Popular"}
                  </span>
                </div>

                <h3
                  className={cn(
                    "font-bold text-slate-900 text-lg group-hover:text-navy transition-colors",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {service.name[currentLang]}
                </h3>

                <p
                  className={cn(
                    "text-slate-600 text-sm mt-2.5 line-clamp-2 leading-relaxed",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {service.description[currentLang]}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                <Link
                  to={`/services/${service.id}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-navy text-slate-700 hover:text-white text-xs font-bold text-center transition-colors"
                >
                  {currentLang === "hi" ? "विवरण देखें" : "View Service"}
                </Link>
                {onSelectService && (
                  <button
                    type="button"
                    onClick={() => onSelectService(service)}
                    className="py-2 px-3 rounded-xl bg-saffron hover:bg-amber-600 text-slate-950 text-xs font-bold transition-transform hover:scale-105 cursor-pointer"
                  >
                    {currentLang === "hi" ? "अनुरोध करें" : "Request"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Explore Link */}
        <div className="mt-10 text-center">
          <Link
            to="/services"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-navy hover:bg-navy/90 text-white font-bold text-sm shadow-md transition-all",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <span>{currentLang === "hi" ? "संपूर्ण सेवा सूची देखें →" : "View All Services Directory →"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
