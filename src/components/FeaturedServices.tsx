import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { servicesData, type ServiceItem } from "../config/services";
import { ServiceCard } from "./ServiceCard";
import { Sparkles, ArrowRight } from "lucide-react";

interface FeaturedServicesProps {
  onSelectService: (service: ServiceItem) => void;
}

export const FeaturedServices: React.FC<FeaturedServicesProps> = ({ onSelectService }) => {
  const { t } = useLanguage();
  const featuredServices = servicesData.filter((s) => s.featured).slice(0, 8);

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Palak Enterprises</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.featured.title}
            </h2>
            <p className="text-slate-600 mt-1 max-w-2xl text-sm sm:text-base">
              {t.featured.subtitle}
            </p>
          </div>

          <a
            href="#services"
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 font-bold text-blue-900 hover:text-blue-700 text-sm group"
          >
            <span>{t.featured.viewAllServices}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Featured Service Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelectService={onSelectService}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
