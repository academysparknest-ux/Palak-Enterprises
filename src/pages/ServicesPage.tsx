import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { DynamicIcon } from "../components/DynamicIcon";
import { serviceCategories, servicesData, type ServiceItem } from "../config/services";
import { useLanguage } from "../context/LanguageContext";
import { Search, X, Filter, ArrowRight, Eye, AlertCircle, Phone } from "lucide-react";
import { businessConfig } from "../config/business";
import { cn } from "../lib/utils";

interface ServicesPageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService: (service: ServiceItem) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  onSelectService,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredServices = useMemo(() => {
    return servicesData.filter((service) => {
      const categoryMatch =
        selectedCategory === "all" || service.categoryId === selectedCategory;

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
  }, [searchQuery, selectedCategory]);

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "All Services Directory | Palak Enterprises",
          hi: "संपूर्ण सेवा निर्देशिका | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Explore the complete directory of printing, document, photo, online government assistance, and web development services at Palak Enterprises Chakia.",
          hi: "पालक इंटरप्राइजेज चकिया की संपूर्ण प्रिंटिंग, फोटो, दस्तावेज, ऑनलाइन सरकारी फॉर्म और वेबसाइट डेवलपमेंट सेवाओं की सूची देखें।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Services", hi: "सेवाएँ" }, path: "/services" },
        ]}
        badge={{
          en: "Complete Services Catalog",
          hi: "संपूर्ण सेवा सूची",
        }}
        title={{
          en: "All Services & Solutions Directory",
          hi: "संपूर्ण सेवा निर्देशिका एवं सहायता",
        }}
        subtitle={{
          en: "Browse our complete catalog of printing, photo, official documents, online application guidance, and digital solutions.",
          hi: "प्रिंटिंग, फोटो, प्रमाणपत्र, सरकारी ऑनलाइन आवेदन एवं डिजिटल सेवाओं की विस्तृत सूची।",
        }}
        primaryCta={{
          label: { en: "Request a Service", hi: "सेवा अनुरोध करें" },
          to: "/request",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Search & Category Filter Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentLang === "hi"
                    ? "सेवा खोजें (जैसे: पासपोर्ट फोटो, आधार, लैमिनेशन, फॉर्म, बिल बुक)..."
                    : "Search services (e.g. Passport Photo, Aadhaar, Lamination, Form, Bill Book)..."
                }
                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy transition-all shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-xs text-brandred font-bold hover:underline cursor-pointer shrink-0"
              >
                {currentLang === "hi" ? "फ़िल्टर रीसेट करें" : "Reset Filter"}
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm">
            <span className="text-slate-400 font-semibold flex items-center shrink-0 pr-1">
              <Filter className="w-3.5 h-3.5 mr-1" />
              {currentLang === "hi" ? "श्रेणी:" : "Category:"}
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-navy text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {currentLang === "hi" ? "सभी सेवाएँ" : "All Services"} ({servicesData.length})
            </button>

            {serviceCategories.map((cat) => {
              const count = servicesData.filter((s) => s.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-navy text-white shadow-xs font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat.name[currentLang]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-lg font-bold text-slate-900">
            {currentLang === "hi"
              ? `कुल ${filteredServices.length} सेवाएँ उपलब्ध`
              : `Showing ${filteredServices.length} Available Services`}
          </h2>
          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-navy font-semibold hover:underline cursor-pointer"
            >
              {currentLang === "hi" ? "सभी श्रेणियां देखें" : "Show All Categories"}
            </button>
          )}
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 text-brandred flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {currentLang === "hi" ? "कोई सेवा नहीं मिली" : "No matching services found"}
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              {currentLang === "hi"
                ? "कृपया कोई अन्य शब्द खोजें या नीचे दिए गए नंबर पर सीधे संपर्क करें।"
                : "Try a different keyword or contact us directly for custom service."}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-navy text-white font-bold text-sm shadow-xs cursor-pointer"
              >
                {currentLang === "hi" ? "सभी सेवाएँ देखें" : "View All Services"}
              </button>
              <a
                href={`tel:${businessConfig.phoneNumbers.primary}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brandred text-white font-bold text-sm shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            </div>
          </div>
        ) : (
          /* Services Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const cat = serviceCategories.find((c) => c.id === service.categoryId);

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-navy/30 transition-all p-5 flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-colors">
                        <DynamicIcon name={service.iconName} className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {cat ? cat.name[currentLang] : ""}
                      </span>
                    </div>

                    {/* Bilingual Titles */}
                    <h3
                      className={cn(
                        "font-bold text-slate-900 text-lg leading-snug group-hover:text-navy transition-colors",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {service.name[currentLang]}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {currentLang === "en" ? service.name.hi : service.name.en}
                    </p>

                    {/* Description */}
                    <p
                      className={cn(
                        "text-slate-600 text-sm mt-3 leading-relaxed",
                        currentLang === "hi" && "font-hindi"
                      )}
                    >
                      {service.description[currentLang]}
                    </p>

                    {/* Disclaimer if present */}
                    {service.disclaimer && (
                      <div className="mt-3 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{service.disclaimer[currentLang]}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      to={`/services/${service.id}`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-navy text-slate-800 hover:text-white font-bold text-xs text-center transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>{currentLang === "hi" ? "पूरा विवरण" : "Details"}</span>
                      <Eye className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => onSelectService(service)}
                      className="py-2.5 px-4 rounded-xl bg-saffron hover:bg-saffron-light text-navy font-bold text-xs shadow-xs transition-transform hover:scale-105 cursor-pointer flex items-center space-x-1"
                    >
                      <span>{currentLang === "hi" ? "अनुरोध" : "Request"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
