import React from "react";
import { useParams, Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { DynamicIcon } from "../components/DynamicIcon";
import { servicesData, serviceCategories, type ServiceItem } from "../config/services";
import { galleryData } from "../config/gallery";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import {
  Clock,
  CheckCircle2,
  FileText,
  Phone,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

interface ServiceDetailPageProps {
  onOpenRequestModal: (serviceId?: string) => void;
  onSelectService: (service: ServiceItem) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  onOpenRequestModal,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Alias map to resolve legacy/alternate service IDs to canonical services
  const aliasMap: Record<string, string> = {
    "bw-printing": "document-printing",
    "color-printing": "document-printing",
    "photocopy": "document-printing",
    "digital-printing": "document-printing",
    "letter-pad": "letterhead-envelope",
    "letter-pads": "letterhead-envelope",
    "letterheads": "letterhead-envelope",
    "wedding-cards": "invitation-cards",
    "id-cards": "id-card-print",
    "flex-banner": "banners-posters",
    "online-forms": "online-form",
  };

  const resolvedSlug = slug ? (aliasMap[slug] || slug) : "";

  // Find service by ID or slug
  const service = servicesData.find(
    (s) =>
      s.id === resolvedSlug ||
      s.id === slug ||
      s.id.replace(/-/g, "") === slug?.replace(/-/g, "")
  );

  if (!service) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Service Not Found</h2>
        <p className="text-slate-600 mb-6 max-w-md">
          {currentLang === "hi"
            ? "यह सेवा सूची में उपलब्ध नहीं है। कृपया हमारी संपूर्ण सेवा सूची देखें।"
            : "The requested service could not be located. Please browse our full service directory."}
        </p>
        <Link
          to="/services"
          className="px-6 py-3 rounded-xl bg-navy text-white font-bold text-sm shadow-md"
        >
          {currentLang === "hi" ? "सभी सेवाएँ देखें" : "Browse All Services"}
        </Link>
      </div>
    );
  }

  const category = serviceCategories.find((c) => c.id === service.categoryId);

  // Related gallery images for this service
  const relatedSamples = galleryData.filter(
    (g) => g.relatedServiceIds?.includes(service.id) || g.category === service.categoryId
  );

  // Related sibling services
  const siblingServices = servicesData
    .filter((s) => s.categoryId === service.categoryId && s.id !== service.id)
    .slice(0, 3);

  const whatsappMessage = encodeURIComponent(
    `Hello Palak Enterprises, I am inquiring about *${service.name.en}* (${service.name.hi}). Please provide details and pricing.`
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: `${service.name.en} in Chakia | Palak Enterprises`,
          hi: `${service.name.hi} चकिया | पालक इंटरप्राइजेज`,
        }}
        description={{
          en: `${service.name.en} - ${service.description.en}. Available at Palak Enterprises near Block Gate, Chakia. Fast turnaround and quality guaranteed.`,
          hi: `${service.name.hi} - ${service.description.hi}। ब्लॉक गेट, चकिया स्थित पालक इंटरप्राइजेज पर त्वरित एवं विश्वसनीय सेवा उपलब्ध।`,
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Services", hi: "सेवाएँ" }, path: "/services" },
          ...(category
            ? [{ label: category.name, path: `/services#${category.id}` }]
            : []),
          { label: service.name },
        ]}
        badge={category ? category.name : { en: "Service Details", hi: "सेवा विवरण" }}
        title={service.name}
        subtitle={service.description}
        primaryCta={{
          label: { en: "Request This Service", hi: "यह सेवा अनुरोध करें" },
          to: `/request?service=${service.id}`,
        }}
        secondaryCta={{
          label: { en: "Quick Modal Request", hi: "त्वरित फॉर्म" },
          onClick: () => onOpenRequestModal(service.id),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center space-x-4 pb-5 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-navy flex items-center justify-center shrink-0">
                  <DynamicIcon name={service.iconName} className="w-7 h-7" />
                </div>
                <div>
                  <h2
                    className={cn(
                      "text-xl sm:text-2xl font-black text-slate-900",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    {service.name[currentLang]}
                  </h2>
                  <p className="text-xs font-bold text-brandred uppercase tracking-wider mt-0.5">
                    {currentLang === "en" ? service.name.hi : service.name.en}
                  </p>
                </div>
              </div>

              {/* Extended Explanation */}
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-2">
                  {currentLang === "hi" ? "सेवा का विवरण" : "Service Overview"}
                </h3>
                <p
                  className={cn(
                    "text-slate-700 text-base leading-relaxed",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {service.description[currentLang]}
                </p>
              </div>

              {/* Disclaimer if present */}
              {service.disclaimer && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">
                      {currentLang === "hi" ? "महत्वपूर्ण सूचना:" : "Important Notice:"}
                    </strong>
                    <span>{service.disclaimer[currentLang]}</span>
                  </div>
                </div>
              )}

              {/* Service Highlights */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {currentLang === "hi" ? "त्वरित कार्य समय" : "Fast Turnaround"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {currentLang === "hi"
                        ? "अधिकांश कार्य तत्काल या उसी दिन पूर्ण।"
                        : "Same-day completion or instant delivery."}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {currentLang === "hi" ? "गुणवत्ता आश्वासन" : "Quality Checked"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {currentLang === "hi"
                        ? "स्पष्ट प्रिंटिंग एवं सटीक फॉर्म सहायता।"
                        : "Sharp prints and verified form submissions."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Gallery Samples if available */}
            {relatedSamples.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentLang === "hi" ? "संबंधित सैंपल व डिज़ाइन" : "Related Design Samples"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentLang === "hi"
                        ? "इस सेवा से जुड़े कुछ संदर्भ कार्य के नमूने"
                        : "Reference samples demonstrating our printing craftsmanship"}
                    </p>
                  </div>
                  <Link
                    to="/work"
                    className="text-xs font-bold text-navy hover:underline flex items-center space-x-1"
                  >
                    <span>{currentLang === "hi" ? "गैलरी देखें" : "View Gallery"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {relatedSamples.slice(0, 3).map((sample) => (
                    <Link
                      key={sample.id}
                      to="/work"
                      className="group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-4/3 relative block"
                    >
                      <img
                        src={sample.imageUrl}
                        alt={sample.imageAlt[currentLang]}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-white text-xs font-bold line-clamp-1">
                          {sample.title[currentLang]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Sibling Services in the same category */}
            {siblingServices.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  {currentLang === "hi"
                    ? "इसी श्रेणी की अन्य सेवाएँ"
                    : `Other ${category?.name[currentLang] || "Related"} Services`}
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  {siblingServices.map((sibling) => (
                    <Link
                      key={sibling.id}
                      to={`/services/${sibling.id}`}
                      className="p-4 rounded-xl border border-slate-200 hover:border-navy hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-navy flex items-center justify-center mb-2 group-hover:bg-navy group-hover:text-white transition-colors">
                          <DynamicIcon name={sibling.iconName} className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-navy">
                          {sibling.name[currentLang]}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {sibling.description[currentLang]}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-navy mt-3 inline-flex items-center space-x-1 group-hover:text-brandred">
                        <span>{currentLang === "hi" ? "देखें" : "View"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar CTA Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Direct Action Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-brandred bg-red-50 border border-red-200 px-3 py-1 rounded-full uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Service</span>
              </div>

              <h3 className="font-bold text-slate-900 text-lg">
                {currentLang === "hi" ? "यह सेवा कैसे प्राप्त करें?" : "How to get this service?"}
              </h3>

              <div className="space-y-3">
                <Link
                  to={`/request?service=${service.id}`}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl bg-brandred hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-transform hover:scale-[1.02] flex items-center justify-center space-x-2",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>{currentLang === "hi" ? "ऑनलाइन अनुरोध भेजें" : "Submit Online Request"}</span>
                </Link>

                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "w-full py-3 px-4 rounded-xl bg-leaf hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-transform hover:scale-[1.02] flex items-center justify-center space-x-2",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Inquiry</span>
                </a>

                <a
                  href={`tel:${businessConfig.phoneNumbers.primary}`}
                  className="w-full py-3 px-4 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call: {businessConfig.phoneNumbers.displayPrimary}</span>
                </a>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentLang === "hi" ? "ब्लॉक गेट चकिया के पास केंद्र" : "Near Block Gate, Chakia center"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentLang === "hi" ? "हिंदी और English दोनों में सहायता" : "Bilingual friendly assistance"}</span>
                </div>
              </div>
            </div>

            {/* Business Info Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-white text-base">
                {currentLang === "hi" ? "केंद्र का पता एवं समय" : "Visit Center"}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {businessConfig.address.fullAddress[currentLang]}
              </p>
              <div className="text-xs text-amber-400 font-semibold pt-2 border-t border-slate-800">
                {currentLang === "hi"
                  ? "सोम - रवि: सुबह 8:00 से रात 8:00 बजे तक"
                  : "Mon - Sun: 8:00 AM - 8:00 PM"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
