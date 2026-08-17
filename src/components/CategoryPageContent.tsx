import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
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
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type {
  ServiceCategory,
  Service,
} from "../config/services";
import {
  getServicesByCategory,
  categories,
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

export default function CategoryPageContent({
  category,
}: {
  category: ServiceCategory;
}) {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const allCategoryServices = useMemo(() => {
    return getServicesByCategory(category.id);
  }, [category.id]);

  const [selectedSubcat, setSelectedSubcat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null);

  const Icon = categoryIconMap[category.icon] ?? Printer;

  // Filter by subcategory and search within category
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCategoryServices.filter((s) => {
      const matchesSubcat =
        selectedSubcat === "all" || s.subcategoryId === selectedSubcat;

      if (!matchesSubcat) return false;
      if (!q) return true;

      const subcat = category.subcategories.find((sub) => sub.id === s.subcategoryId);
      const haystacks = [
        s.name.en.toLowerCase(),
        s.name.hi.toLowerCase(),
        s.shortDescription.en.toLowerCase(),
        s.shortDescription.hi.toLowerCase(),
        s.description.en.toLowerCase(),
        s.description.hi.toLowerCase(),
        subcat?.name.en.toLowerCase() ?? "",
        subcat?.name.hi.toLowerCase() ?? "",
        ...(s.aliases?.map((a) => a.toLowerCase()) ?? []),
      ];

      return haystacks.some((h) => h.includes(q));
    });
  }, [allCategoryServices, selectedSubcat, searchQuery, category.subcategories]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <SEO
        title={{
          en: `${category.name.en} | Palak Enterprises Chakia`,
          hi: `${category.name.hi} | पालक इंटरप्राइजेज चकिया`,
        }}
        description={{
          en: category.description.en,
          hi: category.description.hi,
        }}
      />

      {/* Category Hero Banner */}
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
          <nav className="mb-4 flex items-center gap-2 text-xs text-white/70" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">
              {currentLang === "hi" ? "होम" : "Home"}
            </Link>
            <ChevronRight size={12} />
            <Link to="/services" className="hover:text-white transition-colors">
              {currentLang === "hi" ? "सेवाएँ" : "Services"}
            </Link>
            <ChevronRight size={12} />
            <span className="text-white font-bold">{category.shortName[currentLang]}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-xs">
                <Icon size={14} />
                <span className={cn(currentLang === "hi" && "font-hindi")}>
                  {category.shortName[currentLang]} — {allCategoryServices.length} {currentLang === "hi" ? "सेवाएँ" : "Services"}
                </span>
              </div>

              <h1
                className={cn(
                  "mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl",
                  currentLang === "hi" && "font-hindi leading-snug"
                )}
              >
                {category.name[currentLang]}
              </h1>

              <p
                className={cn(
                  "mt-3 text-sm sm:text-base text-white/80 leading-relaxed",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {category.description[currentLang]}
              </p>
            </div>

            {/* Quick Contact Box inside Hero */}
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs sm:w-64 text-xs">
              <span className="font-bold text-white block mb-1">
                {currentLang === "hi" ? "तत्काल सेवा / पूछताछ" : "Quick Inquiries"}
              </span>
              <p className="text-white/70 text-[11px] mb-3">
                {currentLang === "hi"
                  ? "चकिया केंद्र से सीधे जुड़ें"
                  : "Connect directly with our Chakia center"}
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={getWhatsAppLink(`Hello, I have an inquiry regarding ${category.name.en}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  <MessageCircle size={13} />
                  WhatsApp
                </a>
                <a
                  href={getCallLink()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2 font-bold text-white transition-colors hover:bg-white/25"
                >
                  <Phone size={13} />
                  {currentLang === "hi" ? "कॉल करें" : "Call Directly"}
                </a>
              </div>
            </div>
          </div>

          {/* Search within category input */}
          <div className="mt-8 max-w-xl">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentLang === "hi"
                    ? `${category.shortName.hi} में खोजें...`
                    : `Search within ${category.shortName.en}...`
                }
                className={cn(
                  "w-full rounded-xl border border-white/20 bg-white/95 px-10 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-lg backdrop-blur-xs focus:border-brandred focus:bg-white focus:outline-none focus:ring-2 focus:ring-brandred/20",
                  currentLang === "hi" && "font-hindi"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 rounded-full bg-slate-200 p-1 text-slate-600 hover:bg-slate-300 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Subcategory Filter Navigation Pills */}
      <div className="border-b border-slate-200 bg-white sticky top-[60px] z-40 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubcat("all")}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer",
              selectedSubcat === "all"
                ? "bg-navy text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi" ? "सभी सेवाएँ" : "All"} ({allCategoryServices.length})
          </button>

          {category.subcategories.map((sub) => {
            const subCount = allCategoryServices.filter(
              (s) => s.subcategoryId === sub.id
            ).length;
            const isSelected = selectedSubcat === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubcat(sub.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                  isSelected
                    ? "bg-navy text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {sub.name[currentLang]} ({subCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onViewSamples={(s) => setSelectedService(s)}
                showCategoryBadge={false}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <HelpCircle size={32} className="mx-auto text-slate-400" />
            <h3 className="mt-3 font-display text-base font-bold text-navy">
              {currentLang === "hi" ? "कोई सेवा नहीं मिली" : "No services found in this subcategory"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {currentLang === "hi"
                ? "कृपया फ़िल्टर रीसेट करें या हमारी पूरी सेवा सूची देखें।"
                : "Try changing your search term or view all services."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSubcat("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-brandred transition-colors cursor-pointer"
            >
              {currentLang === "hi" ? "सभी फ़िल्टर रीसेट करें" : "Reset Filter"}
            </button>
          </div>
        )}

        {/* Other Categories Links Carousel / Bottom Strip */}
        <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className={cn("font-display text-lg font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                {currentLang === "hi" ? "अन्य सेवा श्रेणियाँ देखें" : "Explore Other Service Categories"}
              </h3>
              <p className={cn("text-xs text-slate-500", currentLang === "hi" && "font-hindi")}>
                {currentLang === "hi"
                  ? "पालक एंटरप्राइजेज की अन्य 11 विशिष्ट सेवा श्रेणियाँ"
                  : "Quick jump to other categories at Palak Enterprises"}
              </p>
            </div>
            <Link
              to="/services"
              className={cn("text-xs font-bold text-brandred hover:underline", currentLang === "hi" && "font-hindi")}
            >
              {currentLang === "hi" ? "सभी सेवाएँ →" : "View All Services →"}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories
              .filter((c) => c.id !== category.id)
              .map((cat) => {
                const OtherIcon = categoryIconMap[cat.icon] ?? Sparkles;
                return (
                  <Link
                    key={cat.id}
                    to={`/services/${cat.slug}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50 p-3 transition-all hover:bg-navy hover:text-white"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-navy group-hover:bg-brandred group-hover:text-white">
                      <OtherIcon size={16} />
                    </div>
                    <span className={cn("text-xs font-semibold truncate", currentLang === "hi" && "font-hindi")}>
                      {cat.shortName[currentLang]}
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Category CTA Footer Section */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-navy via-slate-900 to-navy p-8 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between shadow-lg">
          <div>
            <h3 className={cn("font-display text-xl font-bold sm:text-2xl", currentLang === "hi" && "font-hindi")}>
              {currentLang === "hi"
                ? `${category.name.hi} के लिए ऑर्डर या कोटेशन चाहिए?`
                : `Need a custom quote for ${category.name.en}?`}
            </h3>
            <p className={cn("mt-1.5 text-xs sm:text-sm text-white/80 max-w-xl", currentLang === "hi" && "font-hindi")}>
              {currentLang === "hi"
                ? "हमारी टीम से सीधे बात करें या अपनी आवश्यकता का ऑनलाइन विवरण भेजें।"
                : "Submit your requirement online or talk to our experts directly on WhatsApp."}
            </p>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-wrap gap-3 justify-center sm:justify-end">
            <Link
              to={`/request?category=${category.slug}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-brandred px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-white hover:text-navy transition-all",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "सेवा अनुरोध फॉर्म भरें" : "Submit Request Online"}
              <ArrowRight size={15} />
            </Link>
            <a
              href={getWhatsAppLink(`Hello, I'd like to request a quote for ${category.name.en}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          </div>
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

export { CategoryPageContent };
