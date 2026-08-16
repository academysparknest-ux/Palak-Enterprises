import React from "react";
import { useLanguage } from "../context/LanguageContext";
import type { ServiceItem } from "../config/services";
import { galleryData } from "../config/gallery";
import { DynamicIcon } from "./DynamicIcon";
import { ArrowRight, Star, AlertCircle, Eye } from "lucide-react";

interface ServiceCardProps {
  service: ServiceItem;
  onSelectService: (service: ServiceItem) => void;
  onViewSamples?: (serviceId: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onSelectService,
  onViewSamples,
}) => {
  const { language } = useLanguage();

  // Find related samples for this service
  const relatedSamples = galleryData.filter((g) =>
    g.relatedServiceIds?.includes(service.id)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between p-5 group relative">
      {/* Top Badges */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5">
        {service.popular && (
          <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center shadow-xs">
            <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
            {language === "hi" ? "लोकप्रिय" : "Popular"}
          </span>
        )}
      </div>

      <div>
        {/* Icon & Category Header */}
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-4 group-hover:bg-blue-900 group-hover:text-white transition-colors">
          <DynamicIcon name={service.iconName} className="w-6 h-6" />
        </div>

        {/* Bilingual Names */}
        <h3 className="font-extrabold text-slate-900 text-lg leading-snug group-hover:text-blue-900 transition-colors">
          {service.name[language]}
        </h3>

        {/* Secondary Name Language */}
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          {language === "en" ? service.name.hi : service.name.en}
        </p>

        {/* Short Description */}
        <p className="text-slate-600 text-sm mt-3 leading-relaxed">
          {service.description[language]}
        </p>

        {/* Disclaimer if present */}
        {service.disclaimer && (
          <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{service.disclaimer[language]}</span>
          </div>
        )}

        {/* Service-Specific Samples Badge/Link if available */}
        {relatedSamples.length > 0 && (
          <div className="mt-3">
            <a
              href="#gallery"
              onClick={(e) => {
                if (onViewSamples) {
                  e.preventDefault();
                  onViewSamples(service.id);
                }
              }}
              className="inline-flex items-center space-x-1 text-xs font-bold text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-blue-700" />
              <span>
                {language === "hi"
                  ? `${relatedSamples.length} सैंपल डिज़ाइन देखें`
                  : `View ${relatedSamples.length} Sample Designs`}
              </span>
            </a>
          </div>
        )}
      </div>

      {/* Card Action Button */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => onSelectService(service)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-blue-900 text-slate-800 hover:text-white font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 group-hover:bg-blue-900 group-hover:text-white shadow-xs cursor-pointer"
        >
          <span>{language === "hi" ? "सेवा अनुरोध करें" : "Get Service"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
