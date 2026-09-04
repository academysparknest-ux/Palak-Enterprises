import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Phone,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Eye,
  Check,
  Building,
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
  Service,
  ServiceCategory,
} from "../config/services";
import {
  ctaLabels,
  getServiceById,
} from "../config/services";
import { getWhatsAppLink, getCallLink, business, businessConfig } from "../config/business";
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

export default function ServiceDetailPageContent({
  service,
  category,
}: {
  service: Service;
  category: ServiceCategory;
}) {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const t = extendedTranslations.serviceDetail;
  const subcategory = category.subcategories.find(
    (sub) => sub.id === service.subcategoryId
  );

  const [selectedServiceForSamples, setSelectedServiceForSamples] = useState<Service | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleItem | null>(null);

  const Icon = categoryIconMap[service.icon] ?? categoryIconMap[category.icon] ?? Sparkles;
  const cta = ctaLabels[service.ctaType] ?? { en: "Get Quote", hi: "कोटेशन प्राप्त करें" };

  const whatsappMessage =
    currentLang === "hi"
      ? `नमस्ते, मुझे पालक एंटरप्राइजेज से "${service.name.hi}" सेवा चाहिए। कृपया विवरण और दरें बताएं।`
      : `Hello, I'd like to get a quote and details for "${service.name.en}" from Palak Enterprises.`;

  // Get 4-6 related services
  const relatedServices: Service[] = (service.relatedServiceIds ?? [])
    .map((id) => getServiceById(id))
    .filter((s): s is Service => Boolean(s))
    .slice(0, 4);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${service.name.en} - Palak Enterprises Chakia`,
    "description": service.description.en,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Palak Enterprises",
      "telephone": "+919905238015",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Near Block Gate",
        "addressLocality": "Chakia",
        "addressRegion": "Bihar",
        "addressCountry": "IN"
      }
    },
    "areaServed": "Chakia, East Champaran, Bihar"
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <SEO
        title={{
          en: `${service.name.en} in Chakia | Palak Enterprises`,
          hi: `${service.name.hi} चकिया | पालक इंटरप्राइजेज`,
        }}
        description={{
          en: service.description.en,
          hi: service.description.hi,
        }}
        canonicalUrl={`/services/${category.slug}/${service.slug}`}
        structuredData={serviceSchema}
      />

      {/* Service Detail Hero */}
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
          {/* Detailed Breadcrumb */}
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-white/70" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">
              {currentLang === "hi" ? "होम" : "Home"}
            </Link>
            <ChevronRight size={12} />
            <Link to="/services" className="hover:text-white transition-colors">
              {currentLang === "hi" ? "सेवाएँ" : "Services"}
            </Link>
            <ChevronRight size={12} />
            <Link
              to={`/services/${category.slug}`}
              className="hover:text-white transition-colors"
            >
              {category.shortName[currentLang]}
            </Link>
            {subcategory && (
              <>
                <ChevronRight size={12} />
                <span className="text-white/60">{subcategory.name[currentLang]}</span>
              </>
            )}
            <ChevronRight size={12} />
            <span className="text-white font-bold truncate max-w-[200px]">
              {service.name[currentLang]}
            </span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
            {/* Left: Titles and Description */}
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-xs">
                <Icon size={14} />
                <span>{category.shortName[currentLang]}</span>
                {subcategory && (
                  <>
                    <span>•</span>
                    <span>{subcategory.name[currentLang]}</span>
                  </>
                )}
              </div>

              <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                <span className="block">{service.name.en}</span>
                <span
                  className={cn(
                    "block text-2xl sm:text-3xl text-amber-300 mt-1",
                    currentLang === "hi" && "font-hindi font-bold"
                  )}
                >
                  {service.name.hi}
                </span>
              </h1>

              <p
                className={cn(
                  "mt-4 max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {service.shortDescription[currentLang]}
              </p>

              {/* Top CTA Buttons Group */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={`/request?service=${service.slug}&category=${category.slug}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-brandred px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-white hover:text-navy hover:scale-[1.02]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <span>{cta[currentLang]}</span>
                  <ArrowRight size={16} />
                </Link>

                <a
                  href={getWhatsAppLink(whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <MessageCircle size={16} />
                  {t.whatsappChat[currentLang]}
                </a>

                <a
                  href={getCallLink()}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/20",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <Phone size={16} />
                  {t.callDirectly[currentLang]}
                </a>
              </div>
            </div>

            {/* Right: Summary Highlights Box */}
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xs shadow-2xl">
              <h3 className={cn("font-display text-base font-bold text-white", currentLang === "hi" && "font-hindi")}>
                {currentLang === "hi" ? "सेवा मुख्य बिंदु" : "Service Highlights"}
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs text-white/90">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {currentLang === "hi"
                      ? "उच्च गुणवत्ता और प्रामाणिक कार्य"
                      : "Verified High-Quality Execution"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {currentLang === "hi"
                      ? "किफ़ायती और पारदर्शी दरें"
                      : "Transparent & Competitive Pricing"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {currentLang === "hi"
                      ? "चकिया केंद्र पर तत्काल सहायता"
                      : "Local Assistance at Chakia Center"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {currentLang === "hi"
                      ? "व्हाट्सएप पर डिज़ाइन प्रूफ़ व अपडेट"
                      : "WhatsApp Proofing & Digital Preview"}
                  </span>
                </li>
              </ul>

              {service.sampleFallbackType && (
                <div className="mt-6 border-t border-white/15 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedServiceForSamples(service)}
                    className={cn(
                      "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-navy transition-colors hover:bg-amber-300 cursor-pointer",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <Eye size={15} />
                    {t.viewSamples[currentLang]}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Body Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main 2-Column Content */}
          <div className="space-y-10 lg:col-span-2">
            {/* 1. Service Overview */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2
                className={cn(
                  "font-display text-xl font-bold text-navy sm:text-2xl",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {t.overviewHeading[currentLang]}
              </h2>
              <p
                className={cn(
                  "mt-4 text-sm sm:text-base leading-relaxed text-slate-700",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {service.description[currentLang]}
              </p>

              {/* Legal / Compliance Disclaimer if present */}
              {service.disclaimer && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
                  <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{t.complianceNote[currentLang]}</span>
                    <p className={cn("mt-1 leading-relaxed", currentLang === "hi" && "font-hindi")}>
                      {service.disclaimer[currentLang]}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 2. Available Options / Specifications */}
            {service.options && service.options.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2
                  className={cn(
                    "font-display text-xl font-bold text-navy sm:text-2xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.optionsHeading[currentLang]}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {service.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4"
                    >
                      <h3
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider text-slate-500",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        {opt.label[currentLang]}
                      </h3>
                      <ul className="mt-3 space-y-2 text-xs font-semibold text-navy">
                        {opt.values.map((val, vIdx) => (
                          <li key={vIdx} className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-600 shrink-0" />
                            <span className={cn(currentLang === "hi" && "font-hindi")}>{val[currentLang]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. 5-Step Process */}
            {service.process && service.process.length > 0 ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2
                  className={cn(
                    "font-display text-xl font-bold text-navy sm:text-2xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.processHeading[currentLang]}
                </h2>
                <div className="mt-6 space-y-4">
                  {service.process.map((step) => (
                    <div
                      key={step.step}
                      className="flex items-start gap-4 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 transition-all hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandred text-xs font-bold text-white shadow-xs">
                        {step.step}
                      </div>
                      <div>
                        <h3 className={cn("text-sm font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                          {step.title[currentLang]}
                        </h3>
                        <p className={cn("mt-1 text-xs text-slate-500 leading-relaxed", currentLang === "hi" && "font-hindi")}>
                          {step.description[currentLang]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              /* Default 5-step process if not customized */
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2
                  className={cn(
                    "font-display text-xl font-bold text-navy sm:text-2xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.processHeading[currentLang]}
                </h2>
                <div className="mt-6 space-y-3">
                  {[
                    {
                      num: 1,
                      title: { en: "1. Share Requirement", hi: "1. विवरण साझा करें" },
                      desc: {
                        en: "Send your requirements via WhatsApp, phone call, or online request form.",
                        hi: "व्हाट्सएप, फोन या ऑनलाइन फॉर्म से अपनी आवश्यकता बताएं।",
                      },
                    },
                    {
                      num: 2,
                      title: { en: "2. Design & Proof Verification", hi: "2. प्रूफ़ व डिज़ाइन जांचें" },
                      desc: {
                        en: "We create or format your design and verify spelling and specifications.",
                        hi: "हम लेआउट तैयार कर व्हाट्सएप पर अंतिम जांच के लिए भेजते हैं।",
                      },
                    },
                    {
                      num: 3,
                      title: { en: "3. Printing / Portal Execution", hi: "3. प्रिंटिंग या पोर्टल निष्पादन" },
                      desc: {
                        en: "Job is processed using high-precision machines or official portal entry.",
                        hi: "उच्च तकनीक मशीनों से प्रिंटिंग या ऑनलाइन पोर्टल पर फॉर्म भरा जाता है।",
                      },
                    },
                    {
                      num: 4,
                      title: { en: "4. Quality Inspection", hi: "4. गुणवत्ता निरीक्षण" },
                      desc: {
                        en: "Thorough quality check for crisp colors, accurate data, and neat packing.",
                        hi: "रंग, फिनिशिंग और विवरण की पूर्ण गुणवत्ता जांच की जाती है।",
                      },
                    },
                    {
                      num: 5,
                      title: { en: "5. Collection / Delivery", hi: "5. प्राप्ति व डिलीवरी" },
                      desc: {
                        en: "Collect your finished order from our Chakia center or request dispatch.",
                        hi: "चकिया केंद्र से ऑर्डर प्राप्त करें या डिलीवरी विकल्प चुनें।",
                      },
                    },
                  ].map((st) => (
                    <div
                      key={st.num}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-3.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {st.num}
                      </div>
                      <div>
                        <h3 className={cn("text-xs font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                          {st.title[currentLang]}
                        </h3>
                        <p className={cn("mt-0.5 text-[11px] text-slate-500", currentLang === "hi" && "font-hindi")}>
                          {st.desc[currentLang]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Suitable For */}
            {service.suitableFor && service.suitableFor.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2
                  className={cn(
                    "font-display text-xl font-bold text-navy sm:text-2xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.suitableHeading[currentLang]}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {service.suitableFor.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50 px-3.5 py-2.5"
                    >
                      <Building size={16} className="text-brandred shrink-0" />
                      <span className={cn("text-xs font-semibold text-navy", currentLang === "hi" && "font-hindi")}>
                        {item[currentLang]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. FAQs */}
            {service.faqs && service.faqs.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2
                  className={cn(
                    "font-display text-xl font-bold text-navy sm:text-2xl",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {t.faqHeading[currentLang]}
                </h2>
                <div className="mt-6 space-y-4">
                  {service.faqs.map((faq, fIdx) => (
                    <div
                      key={fIdx}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4"
                    >
                      <h3
                        className={cn(
                          "flex items-start gap-2 text-xs sm:text-sm font-bold text-navy",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        <HelpCircle size={16} className="text-brandred shrink-0 mt-0.5" />
                        <span>{faq.question[currentLang]}</span>
                      </h3>
                      <p
                        className={cn(
                          "mt-2 pl-6 text-xs text-slate-600 leading-relaxed",
                          currentLang === "hi" && "font-hindi"
                        )}
                      >
                        {faq.answer[currentLang]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar: Sticky Action Box & Related Services */}
          <aside className="space-y-6 lg:col-span-1">
            {/* Action Box */}
            <div className="sticky top-24 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
                <h3 className={cn("font-display text-lg font-bold text-navy", currentLang === "hi" && "font-hindi")}>
                  {t.needServiceHeading[currentLang]}
                </h3>
                <p className={cn("mt-1.5 text-xs text-slate-500 leading-relaxed", currentLang === "hi" && "font-hindi")}>
                  {t.needServiceSub[currentLang]}
                </p>

                <div className="mt-6 space-y-3">
                  <Link
                    to={`/request?service=${service.slug}&category=${category.slug}`}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-full bg-brandred px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <span>{t.requestService[currentLang]}</span>
                  </Link>

                  <a
                    href={getWhatsAppLink(whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-emerald-700",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp Chat</span>
                  </a>

                  <a
                    href={getCallLink()}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-navy transition-colors hover:bg-slate-100",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <Phone size={16} />
                    <span>{business.phones[0]}</span>
                  </a>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-700">Palak Enterprises</p>
                  <p>{businessConfig.address.fullAddress[currentLang]}</p>
                  <p className="mt-1 text-slate-500">Mon - Sun: 8:00 AM - 8:00 PM</p>
                </div>
              </div>

              {/* Related Services in Category */}
              {relatedServices.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className={cn("font-display text-sm font-bold text-navy mb-4", currentLang === "hi" && "font-hindi")}>
                    {t.relatedHeading[currentLang]}
                  </h3>
                  <div className="space-y-3">
                    {relatedServices.map((rel) => (
                      <Link
                        key={rel.id}
                        to={`/services/${rel.categoryId}/${rel.slug}`}
                        className="group flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 p-3 transition-colors hover:bg-navy hover:text-white"
                      >
                        <div className="truncate pr-2">
                          <span className="block text-xs font-bold text-navy group-hover:text-white truncate">
                            {rel.name.en}
                          </span>
                          <span className={cn("block text-[11px] text-slate-500 group-hover:text-white/80 truncate", currentLang === "hi" && "font-hindi")}>
                            {rel.name.hi}
                          </span>
                        </div>
                        <ChevronRight size={14} className="shrink-0 text-slate-400 group-hover:text-white" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Service Samples Modal */}
      {selectedServiceForSamples && (
        <ServiceSamplesModal
          service={selectedServiceForSamples}
          onClose={() => setSelectedServiceForSamples(null)}
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

export { ServiceDetailPageContent };
