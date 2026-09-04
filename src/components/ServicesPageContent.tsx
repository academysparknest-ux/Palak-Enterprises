import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  Layers,
  Filter,
  ArrowRight,
  Phone,
  MessageCircle,
  Sparkles,
  Printer,
  FileText,
  Camera,
  Heart,
  FileCheck,
  ClipboardList,
  HeartHandshake,
  Sprout,
  Landmark,
  Banknote,
  MonitorSmartphone,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { extendedTranslations } from "../config/translations";
import type {
  ServiceCategoryId,
  Service,
} from "../config/services";
import {
  categories,
  services,
  searchServices,
} from "../config/services";
import { getWhatsAppLink, getCallLink } from "../config/business";
import ServiceCard from "./ServiceCard";
import ServiceSamplesModal from "./ServiceSamplesModal";
import Gallery from "./Gallery";
import type { SampleItem } from "../config/samples";
import { SEO } from "./SEO";
import { cn } from "../lib/utils";

const categoryIconMap: Record<string, any> = {
  Printer,
  FileText,
  Camera,
  Heart,
  Sparkles,
  FileCheck,
  ClipboardList,
  HeartHandshake,
  Sprout,
  Landmark,
  Banknote,
  MonitorSmartphone,
};

export default function ServicesPageContent() {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const t = extendedTranslations.servicesPage;
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryId | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Real-time client-side search & category filtering
  const filteredServices = useMemo(() => {
    return searchServices(searchQuery, currentLang, selectedCategory);
  }, [searchQuery, currentLang, selectedCategory]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <SEO
        title={{
          en: "Complete Printing & Digital Services Catalog | Palak Enterprises Chakia",
          hi: "संपूर्ण प्रिंटिंग एवं डिजिटल सेवा कैटलॉग | पालक इंटरप्राइजेज चकिया",
        }}
        description={{
          en: "Explore our complete service list: Visiting cards, wedding invitations, pamphlets, flex banners, bill books, PVC ID cards, lamination, and CSC online document services in Chakia.",
          hi: "पालक इंटरप्राइजेज चकिया: विजिटिंग कार्ड, शादी कार्ड, पम्पलेट, फ्लेक्स बैनर, बिल बुक, पीवीसी आईडी कार्ड, लैमिनेशन और ऑनलाइन सेवाओं की संपूर्ण सूची।",
        }}
        canonicalUrl="/services"
        keywords="printing services Chakia, digital services Chakia, photocopy Chakia, passport photo Chakia, online form apply Chakia, printing catalog Bihar"
      />

      {/* Page Hero Header Banner */}
      <section className="relative overflow-hidden bg-[#123B70] border-b border-line text-white pt-6 pb-12 sm:pb-16">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
          }}
        />
        {/* Subtle geometric dot grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-xs text-white/60" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">
              {currentLang === "hi" ? "होम" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">
              {currentLang === "hi" ? "सेवा सूची" : "Services"}
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-xs">
            <Layers size={14} />
            <span className={cn(currentLang === "hi" && "font-hindi")}>
              {currentLang === "hi" ? "संपूर्ण सेवा कैटलॉग (50+ सेवाएँ)" : "Complete Service Catalog (50+ Services)"}
            </span>
          </div>

          <h1
            className={cn(
              "mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl",
              currentLang === "hi" && "font-hindi leading-snug"
            )}
          >
            {t.heading[currentLang]}
          </h1>
          <p
            className={cn(
              "mt-3 max-w-3xl text-sm sm:text-base text-white/80 leading-relaxed",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {t.subheading[currentLang]}
          </p>

          {/* Prominent Global Search Bar */}
          <div className="mt-8 max-w-3xl">
            <div className="relative flex items-center">
              <Search
                size={20}
                className="absolute left-4 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder[currentLang]}
                className={cn(
                  "w-full rounded-2xl border-2 border-white/20 bg-white/95 px-12 py-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 shadow-2xl backdrop-blur-xs transition-all focus:border-brandred focus:bg-white focus:outline-none focus:ring-4 focus:ring-brandred/20",
                  currentLang === "hi" && "font-hindi"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-4 rounded-full bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick search suggestions */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-white/70">
              <span className="font-semibold">{currentLang === "hi" ? "सुझाव:" : "Popular Searches:"}</span>
              {["Visiting Card", "Aadhaar", "Passport Photo", "Wedding Card", "PAN Card", "Bill Book", "Website"].map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSearchQuery(term)}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Layout */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Mobile Filter Toggle */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-navy shadow-sm cursor-pointer"
          >
            <Filter size={15} />
            <span>
              {selectedCategory === "all"
                ? currentLang === "hi"
                  ? "सभी श्रेणियाँ"
                  : "All Categories"
                : categories.find((c) => c.id === selectedCategory)?.shortName[currentLang]}
            </span>
          </button>

          <span className="text-xs font-semibold text-slate-500">
            {filteredServices.length} {t.resultsCount[currentLang]}
          </span>
        </div>

        {/* Mobile Category Horizontal Scroll or Drawer */}
        {mobileFilterOpen && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md lg:hidden animate-fadeUp">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.categoriesHeading[currentLang]}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setMobileFilterOpen(false);
                }}
                className={cn(
                  "rounded-lg p-2.5 text-left font-semibold transition-colors cursor-pointer",
                  selectedCategory === "all"
                    ? "bg-navy text-white font-bold"
                    : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                )}
              >
                {t.filterAll[currentLang]} ({services.length})
              </button>
              {categories.map((cat) => {
                const count = services.filter((s) => s.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setMobileFilterOpen(false);
                    }}
                    className={cn(
                      "rounded-lg p-2.5 text-left font-semibold transition-colors truncate cursor-pointer",
                      selectedCategory === cat.id
                        ? "bg-navy text-white font-bold"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {cat.shortName[currentLang]} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Desktop Left Sidebar: 12 Category Filters */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className={cn("font-display text-sm font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                    {t.categoriesHeading[currentLang]}
                  </h3>
                  <span className="text-[11px] font-bold text-brandred">
                    {filteredServices.length} {currentLang === "hi" ? "सेवाएँ" : "services"}
                  </span>
                </div>

                <div className="space-y-1">
                  {/* All Services button */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                      selectedCategory === "all"
                        ? "bg-navy text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <span>{t.filterAll[currentLang]}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px]",
                        selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {services.length}
                    </span>
                  </button>

                  {/* 12 Category buttons */}
                  {categories.map((cat) => {
                    const Icon = categoryIconMap[cat.icon] ?? Layers;
                    const count = services.filter((s) => s.categoryId === cat.id).length;
                    const isSelected = selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all text-left cursor-pointer",
                          isSelected
                            ? "bg-navy text-white font-bold shadow-xs"
                            : "text-slate-700 hover:bg-slate-100 hover:text-navy",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon
                            size={14}
                            className={cn(
                              "shrink-0",
                              isSelected ? "text-amber-300" : "text-slate-400 group-hover:text-navy"
                            )}
                          />
                          <span className="truncate">{cat.shortName[currentLang]}</span>
                        </div>
                        <span
                          className={cn(
                            "ml-1 shrink-0 rounded-full px-1.5 py-0.2 text-[10px]",
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Quick Request Card */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-navy to-slate-900 p-4 text-white shadow-sm">
                <h4 className={cn("font-display text-sm font-bold", currentLang === "hi" && "font-hindi")}>
                  {currentLang === "hi" ? "कस्टम प्रिंटिंग कोटेशन?" : "Custom Bulk Requirement?"}
                </h4>
                <p className={cn("mt-1 text-xs text-white/70", currentLang === "hi" && "font-hindi")}>
                  {currentLang === "hi"
                    ? "सीधे व्हाट्सएप पर अपनी फाइल या विवरण भेजें।"
                    : "Send your files or specs directly on WhatsApp for an instant quote."}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href={getWhatsAppLink("Hello, I need a custom quote for services.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <MessageCircle size={14} />
                    WhatsApp Chat
                  </a>
                  <a
                    href={getCallLink()}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <Phone size={14} />
                    {currentLang === "hi" ? "कॉल करें" : "Call Directly"}
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Grid */}
          <main className="lg:col-span-3">
            {/* Header info bar */}
            <div className="mb-6 hidden items-center justify-between rounded-xl bg-white p-3.5 border border-slate-200 shadow-xs sm:flex">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                  {selectedCategory === "all"
                    ? t.filterAll[currentLang]
                    : categories.find((c) => c.id === selectedCategory)?.name[currentLang]}
                </span>
                {searchQuery && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    Query: &quot;{searchQuery}&quot;
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {filteredServices.length} {t.resultsCount[currentLang]}
              </span>
            </div>

            {/* If Results Found */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onViewSamples={(s) => setSelectedService(s)}
                    showCategoryBadge={selectedCategory === "all"}
                  />
                ))}
              </div>
            ) : (
              /* No Results State */
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Search size={26} />
                </div>
                <h3
                  className={cn(
                    "mt-4 font-display text-lg font-bold text-navy sm:text-xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.noResultsTitle[currentLang]}
                </h3>
                <p
                  className={cn(
                    "mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.noResultsSub[currentLang]}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className={cn(
                      "rounded-full border border-slate-200 px-5 py-2 text-xs font-bold text-navy hover:bg-slate-100 transition-colors cursor-pointer",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {currentLang === "hi" ? "सभी सेवाएँ रीसेट करें" : "Reset All Filters"}
                  </button>
                  <Link
                    to="/request"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full bg-brandred px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy transition-colors",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {t.customReqCta[currentLang]}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Service Samples Modal */}
      {selectedService && (
        <ServiceSamplesModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSelectSample={(sample) => setSelectedSample(sample)}
        />
      )}

      {/* Lightbox */}
      {selectedSample && (
        <Gallery
          initialSample={selectedSample}
          onClose={() => setSelectedSample(null)}
        />
      )}
    </div>
  );
}

export { ServicesPageContent };
