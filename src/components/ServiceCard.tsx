import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight, Eye } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { Service } from "../config/services";
import { categories, ctaLabels } from "../config/services";
import SampleImage from "./SampleImage";
import { cn } from "../lib/utils";

function ServiceIcon({ name }: { name: string }) {
  const Icon = (Icons as any)[name] ?? Icons.Sparkles;
  return <Icon size={20} aria-hidden />;
}

export interface ServiceCardProps {
  service: Service;
  onViewSamples?: (service: Service) => void;
  showCategoryBadge?: boolean;
  onSelectService?: (service: Service) => void;
}

export default function ServiceCard({
  service,
  onViewSamples,
  showCategoryBadge = true,
}: ServiceCardProps) {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const category = categories.find((c) => c.id === service.categoryId);
  const subcategory = category?.subcategories.find(
    (sub) => sub.id === service.subcategoryId
  );

  const cta = ctaLabels[service.ctaType] || {
    en: "View Details",
    hi: "विवरण देखें",
  };

  const detailHref = `/services/${service.categoryId}/${service.slug}`;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-navy/30 hover:shadow-lg">
      {/* Top Image Preview Header */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 border-b border-slate-100">
        <Link to={detailHref} className="block h-full w-full" tabIndex={-1}>
          <SampleImage
            src={service.image || ""}
            alt={service.name[currentLang]}
            title={service.name[currentLang]}
            fallbackType={service.sampleFallbackType as any}
            width={400}
            height={250}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Badges Overlay */}
        <div className="absolute top-2.5 right-2.5 flex flex-wrap items-center justify-end gap-1.5 pointer-events-none z-10">
          {showCategoryBadge && category && (
            <span
              className={cn(
                "rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow-xs border border-slate-200/60",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {category.shortName[currentLang]}
            </span>
          )}
          {service.featured && (
            <span
              className={cn(
                "rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold text-navy shadow-xs",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "लोकप्रिय" : "Popular"}
            </span>
          )}
        </div>

        {/* Category / Service Icon Floating Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-navy shadow-md backdrop-blur-xs border border-slate-200/80 transition-colors group-hover:bg-brandred group-hover:text-white">
          <ServiceIcon name={service.icon} />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Subcategory subtitle if present */}
          {subcategory && (
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider text-slate-500",
                currentLang === "hi" && "font-hindi text-xs"
              )}
            >
              {subcategory.name[currentLang]}
            </p>
          )}

          {/* English & Hindi Titles */}
          <h3 className="mt-1 font-display text-base font-bold text-slate-900 group-hover:text-navy transition-colors">
            <Link to={detailHref} className="focus:outline-none">
              <span className="block">{service.name.en}</span>
              <span
                className={cn(
                  "block text-sm font-semibold text-navy/80 mt-0.5",
                  currentLang === "hi" && "font-hindi text-[0.95rem] text-brandred font-bold"
                )}
              >
                {service.name.hi}
              </span>
            </Link>
          </h3>

          {/* 1-2 line concise description */}
          <p
            className={cn(
              "mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2",
              currentLang === "hi" && "font-hindi text-[13px]"
            )}
          >
            {service.shortDescription[currentLang]}
          </p>
        </div>

        {/* Action Footer */}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {onViewSamples && service.sampleFallbackType ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onViewSamples(service);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-navy hover:text-white cursor-pointer",
                currentLang === "hi" && "font-hindi"
              )}
            >
              <Eye size={13} aria-hidden />
              {currentLang === "hi" ? "सैंपल" : "Samples"}
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">
              {category?.shortName[currentLang]}
            </span>
          )}

          <Link
            to={detailHref}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-bold text-navy transition-all group-hover:bg-brandred group-hover:text-white",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <span>{cta[currentLang]}</span>
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export { ServiceCard };
