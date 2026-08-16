import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { serviceCategories, servicesData, type ServiceItem } from "../config/services";
import { businessConfig } from "../config/business";
import { ServiceCard } from "./ServiceCard";
import { DynamicIcon } from "./DynamicIcon";
import { SearchX, Phone, MessageSquare } from "lucide-react";

interface ServiceCategoriesProps {
  searchQuery: string;
  selectedCategory: string;
  onSelectService: (service: ServiceItem) => void;
  onResetSearch: () => void;
}

export const ServiceCategories: React.FC<ServiceCategoriesProps> = ({
  searchQuery,
  selectedCategory,
  onSelectService,
  onResetSearch,
}) => {
  const { language, t } = useLanguage();

  // Filter Services based on Search Query & Selected Category
  const filteredServices = servicesData.filter((service) => {
    const categoryMatch = selectedCategory === "all" || service.categoryId === selectedCategory;

    if (!searchQuery.trim()) return categoryMatch;

    const q = searchQuery.toLowerCase().trim();
    const nameEn = service.name.en.toLowerCase();
    const nameHi = service.name.hi.toLowerCase();
    const descEn = service.description.en.toLowerCase();
    const descHi = service.description.hi.toLowerCase();
    const tagsMatch = service.tags.some((tag) => tag.toLowerCase().includes(q));

    const textMatch =
      nameEn.includes(q) ||
      nameHi.includes(q) ||
      descEn.includes(q) ||
      descHi.includes(q) ||
      tagsMatch;

    return categoryMatch && textMatch;
  });

  const isFiltered = searchQuery.trim() !== "" || selectedCategory !== "all";

  return (
    <section id="services" className="py-20 bg-white border-b border-slate-200 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-widest">
            {language === "hi" ? "संपूर्ण सेवा सूची" : "Service Directory"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            {t.categories.title}
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            {t.categories.subtitle}
          </p>
        </div>

        {/* Empty Search State */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t.search.noResultsTitle}</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">{t.search.noResultsText}</p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onResetSearch}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-900 text-white font-bold text-sm shadow-md hover:bg-blue-800 transition-colors"
              >
                {t.search.resetSearch}
              </button>

              <a
                href={`tel:${businessConfig.phoneNumbers.primary}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>{t.nav.callNow}</span>
              </a>

              <a
                href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20am%20looking%20for%20a%20service.`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{language === "hi" ? "व्हाट्सएप" : "WhatsApp"}</span>
              </a>
            </div>
          </div>
        ) : isFiltered ? (
          /* Render Filtered Service Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelectService={onSelectService}
              />
            ))}
          </div>
        ) : (
          /* Render Categorized Section Groups */
          <div className="space-y-16">
            {serviceCategories.map((category) => {
              const categoryServices = servicesData.filter((s) => s.categoryId === category.id);
              if (categoryServices.length === 0) return null;

              return (
                <div key={category.id} className="scroll-mt-24" id={category.id}>
                  {/* Category Banner */}
                  <div className="flex items-center space-x-3 mb-6 pb-3 border-b-2 border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
                      <DynamicIcon name={category.iconName} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {category.name[language]}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        {category.description[language]}
                      </p>
                    </div>
                  </div>

                  {/* Category Services Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onSelectService={onSelectService}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
