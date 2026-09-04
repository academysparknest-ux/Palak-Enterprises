import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileText,
  Camera,
  CreditCard,
  Sparkles,
  Contact,
  Image as ImageIcon,
  Printer,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn, formatPrice } from "../lib/utils";
import { usePrintPricingConfig } from "../hooks/usePrintPricingConfig";
import { useAllQuickServicesAvailability } from "../hooks/useQuickServiceAvailability";

interface InstantOnlineServicesSectionProps {
  className?: string;
  isStandalonePage?: boolean;
}

export const InstantOnlineServicesSection: React.FC<InstantOnlineServicesSectionProps> = ({
  className,
}) => {
  const { lang, language, t } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [searchParams] = useSearchParams();
  const paymentParam = searchParams.get("payment") || searchParams.get("paymentMethod") || searchParams.get("pay");

  const {
    services: dbQuickServices,
    loading: isAvailabilityLoading,
    error: availabilityError,
    refresh: refreshAvailability,
  } = useAllQuickServicesAvailability();

  const { pricingConfig } = usePrintPricingConfig();
  const docMin = formatPrice(Math.min(pricingConfig.documentPrinting.baseRatePerPage.bwDouble, pricingConfig.documentPrinting.baseRatePerPage.bwSingle));
  const passportMin = formatPrice(Math.min(...Object.values(pricingConfig.passportPhoto).filter((v): v is number => typeof v === 'number' && v > 0)));
  const cardMin = formatPrice(pricingConfig.visitingCards.base100Single);
  const idCardMin = formatPrice(pricingConfig.idCards.pvcSingle);
  const posterMin = formatPrice(Math.min(pricingConfig.posters.a4Photo, pricingConfig.posters.a3Glossy, pricingConfig.posters.a2Photo));

  const services = [
    {
      id: "document-printing",
      title: currentLang === "hi" ? "दस्तावेज प्रिंटिंग (Document Printing)" : "Document Printing",
      tagline: currentLang === "hi" ? "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य दस्तावेज" : "Notes, assignments, forms, reports & all documents",
      desc:
        currentLang === "hi"
          ? "Notes, assignments, forms, reports aur documents print karein — spiral binding, comb binding aur lamination ke sath."
          : "Print notes, assignments, forms, certificates & reports — add spiral binding, comb binding, or lamination in one click.",
      priceText: `${docMin} onwards`,
      priceTextHi: `${docMin} से शुरू`,
      icon: FileText,
      path: "/online-services/document-printing",
      badge: currentLang === "hi" ? "सबसे लोकप्रिय" : "Most Popular",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "ऑर्डर करें →" : "Order Now →"),
      isComingSoon: false,
      color: "bg-blue-50 text-[#123B70] border-blue-200/80",
      accent: "border-blue-500",
    },
    {
      id: "passport-photo",
      title: currentLang === "hi" ? "पासपोर्ट फोटो प्रिंटिंग" : "Passport Photo Printing",
      tagline: currentLang === "hi" ? "इंस्टेंट फोटो शीट व आईडी साइज प्रिंट" : "Instant photo sheets & ID printouts",
      desc:
        currentLang === "hi"
          ? "Apni photo upload karein aur printable photo order karein — 8, 16 ya 32 photo sheet."
          : "Upload your photo, select layout (8, 16, 32 photos or 4×6 sheet) & order high-gloss prints.",
      priceText: `${passportMin} onwards`,
      priceTextHi: `${passportMin} से शुरू`,
      icon: Camera,
      path: "/online-services/passport-photo",
      badge: currentLang === "hi" ? "त्वरित प्रिंट" : "Fast & Sharp",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "ऑर्डर करें →" : "Order Now →"),
      isComingSoon: false,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
      accent: "border-emerald-500",
    },
    {
      id: "visiting-cards",
      title: currentLang === "hi" ? "विजिटिंग कार्ड प्रिंटिंग" : "Visiting Card Printing",
      tagline: currentLang === "hi" ? "अपना डिज़ाइन अपलोड करें या टेम्पलेट भरें" : "Upload design or create from clean template",
      desc:
        currentLang === "hi"
          ? "Apna design upload karein ya available template se start karein — Matte / Gloss finish."
          : "Upload your custom card design or create professional business card from live template.",
      priceText: `${cardMin} onwards`,
      priceTextHi: `${cardMin} से शुरू`,
      icon: CreditCard,
      path: "/online-services/visiting-cards",
      badge: currentLang === "hi" ? "350 GSM प्रीमियम" : "350 GSM Premium",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "ऑर्डर करें →" : "Order Now →"),
      isComingSoon: false,
      color: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
      accent: "border-indigo-500",
    },
    {
      id: "invitation-cards",
      title: currentLang === "hi" ? "शादी एवं निमंत्रण कार्ड" : "Invitation / Wedding Cards",
      tagline: currentLang === "hi" ? "कस्टमाइज्ड निमंत्रण पत्र प्रिंटिंग" : "Customized invitation printing",
      desc:
        currentLang === "hi"
          ? "Customized invitation printing — coming soon. जल्द ही ऑनलाइन कस्टमाइजेशन उपलब्ध होगा।"
          : "Customized invitation printing — coming soon. Full interactive catalog under preparation.",
      priceText: "Coming Soon",
      priceTextHi: "जल्द उपलब्ध",
      icon: Sparkles,
      path: "/online-services/invitation-cards",
      badge: currentLang === "hi" ? "जल्द आ रहा है" : "Coming Soon",
      actionText: t.instantOnlineServices?.comingSoon || (currentLang === "hi" ? "जल्द आ रहा है" : "Coming Soon"),
      isComingSoon: true,
      color: "bg-rose-50 text-rose-800 border-rose-200/80",
      accent: "border-rose-400",
    },
    {
      id: "id-cards",
      title: currentLang === "hi" ? "पहचान पत्र (ID Card) प्रिंटिंग" : "ID Card Printing",
      tagline: currentLang === "hi" ? "स्कूल, कॉलेज, स्टाफ व व्यक्तिगत स्मार्ट कार्ड" : "School, college, staff & personal PVC cards",
      desc:
        currentLang === "hi"
          ? "Personal aur organization ID cards ke liye print order karein — PVC Card + Lanyard."
          : "Order high durability PVC smart ID cards with lanyards & badge holders.",
      priceText: `${idCardMin} onwards`,
      priceTextHi: `${idCardMin} से शुरू`,
      icon: Contact,
      path: "/online-services/id-cards",
      badge: currentLang === "hi" ? "स्मार्ट पीवीसी" : "Smart PVC",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "ऑर्डर करें →" : "Order Now →"),
      isComingSoon: false,
      color: "bg-amber-50 text-amber-800 border-amber-200/80",
      accent: "border-amber-500",
    },
    {
      id: "poster-banner",
      title: currentLang === "hi" ? "पोस्टर एवं बैनर प्रिंटिंग" : "Poster & Banner Printing",
      tagline: currentLang === "hi" ? "A4, A3, A2 फोटो शीट, विनाइल व फ्लेक्स" : "A4, A3, A2 photo paper, vinyl & flex",
      desc:
        currentLang === "hi"
          ? "Apna design upload karein aur required size/material select karein — HD Vibrant Print."
          : "Upload your promotional artwork, choose paper/flex material & get high-definition prints.",
      priceText: `${posterMin} onwards`,
      priceTextHi: `${posterMin} से शुरू`,
      icon: ImageIcon,
      path: "/online-services/poster-banner",
      badge: currentLang === "hi" ? "एचडी प्रिंट" : "HD Glossy",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "ऑर्डर करें →" : "Order Now →"),
      isComingSoon: false,
      color: "bg-purple-50 text-purple-800 border-purple-200/80",
      accent: "border-purple-500",
    },
    {
      id: "custom-print",
      title: currentLang === "hi" ? "कस्टम प्रिंट ऑर्डर" : "Custom Print Order",
      tagline: currentLang === "hi" ? "पम्पलेट, बिल बुक, स्टिकर, मेन्यू व अन्य आवश्यकताएं" : "Pamphlets, bill books, stickers, menus & custom jobs",
      desc:
        currentLang === "hi"
          ? "Agar aapko required printing option nahi mil raha, custom requirement submit karein."
          : "Need pamphlets, bill books, brochures or stickers? Submit custom specifications for quick quote.",
      priceText: "Custom Quote",
      priceTextHi: "कस्टम कोटेशन",
      icon: Printer,
      path: "/online-services/custom-print",
      badge: currentLang === "hi" ? "कस्टम ऑर्डर" : "Custom Order",
      actionText: t.instantOnlineServices?.requestQuote || (currentLang === "hi" ? "विवरण देखें →" : "Order Details →"),
      isComingSoon: false,
      color: "bg-cyan-50 text-cyan-900 border-cyan-200/80",
      accent: "border-cyan-500",
    },
  ];

  return (
    <section className={cn("space-y-6 sm:space-y-8", className)}>
      {/* Availability error notice */}
      {availabilityError && dbQuickServices.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              {currentLang === "hi"
                ? "सेवा उपलब्धता लोड नहीं हो सकी। कृपया पुनः प्रयास करें।"
                : "Service availability status could not be verified. Please refresh and try again."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refreshAvailability()}
            className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{currentLang === "hi" ? "रीफ्रेश" : "Retry"}</span>
          </button>
        </div>
      )}

      {/* 7 Quick Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {isAvailabilityLoading && dbQuickServices.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`section-skel-${idx}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-slate-200" />
                  <div className="h-5 w-24 rounded-full bg-slate-200" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 rounded-md bg-slate-200" />
                  <div className="h-3 w-full rounded-md bg-slate-100" />
                </div>
                <div className="h-4 w-20 rounded-md bg-slate-200 pt-2" />
                <div className="h-10 w-full rounded-xl bg-slate-200" />
              </div>
            ))
          : services.map((service) => {
              const Icon = service.icon;
              const isDoc = service.id === "document-printing";
              const dbItem = dbQuickServices.find((s) => s.id === service.id);
              const isStopped = dbItem ? dbItem.is_active === false : false;
              const stopReason = dbItem?.stop_reason;

              return (
                <div
                  key={service.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                    isStopped
                      ? "border-rose-200 bg-rose-50/20"
                      : isDoc
                      ? "lg:col-span-2 xl:col-span-2 bg-linear-to-br from-blue-50/40 via-white to-white border-blue-200/90 ring-1 ring-blue-500/10 hover:border-slate-300"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div>
                    {/* Header row with icon & availability badge */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl p-2.5 flex items-center justify-center border group-hover:scale-105 transition-transform shrink-0",
                          isStopped ? "bg-rose-100 text-rose-800 border-rose-200" : service.color
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Dynamic Availability Badge */}
                      {isStopped ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs inline-flex items-center gap-1.5"
                          role="status"
                          aria-label="Temporarily Unavailable"
                        >
                          <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                          <span>{currentLang === "hi" ? "अस्थायी रूप से अनुपलब्ध" : "Temporarily Unavailable"}</span>
                        </span>
                      ) : service.isComingSoon ? (
                        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold border bg-rose-50 text-rose-700 border-rose-200 uppercase">
                          {service.badge}
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs inline-flex items-center gap-1.5"
                          role="status"
                          aria-label="Available"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>{currentLang === "hi" ? "उपलब्ध" : "Available"}</span>
                        </span>
                      )}
                    </div>

                    {/* Service Name */}
                    <h3
                      className={cn(
                        "text-base sm:text-lg font-bold transition-colors leading-snug",
                        isStopped ? "text-slate-700" : "text-slate-900 group-hover:text-[#123B70]"
                      )}
                    >
                      {service.title}
                    </h3>

                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {service.tagline}
                    </p>

                    {/* Service Description or Stopped Notice */}
                    {isStopped ? (
                      <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-900 space-y-1.5">
                        <div className="flex items-start gap-1.5 text-xs font-bold leading-snug">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-rose-950 mr-1">
                              {currentLang === "hi" ? "कारण:" : "Reason:"}
                            </span>
                            <span>
                              {stopReason ||
                                (currentLang === "hi"
                                  ? "तकनीकी मेंटेनेंस या सेवा रुकावट के कारण नए ऑर्डर अस्थायी रूप से रोके गए हैं।"
                                  : "Service is temporarily paused for maintenance or high load.")}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-rose-700 font-medium pl-5">
                          {currentLang === "hi"
                            ? "कृपया बाद में पुनः प्रयास करें।"
                            : "Please check again later."}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                        {service.desc}
                      </p>
                    )}

                    {/* Starting Price */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {currentLang === "hi" ? "शुरुआती मूल्य" : "Starting At"}
                      </span>
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-extrabold",
                          isStopped
                            ? "text-rose-600 line-through decoration-rose-300"
                            : "text-emerald-700 font-black"
                        )}
                      >
                        {isStopped
                          ? (currentLang === "hi" ? "अभी अनुपलब्ध" : "Unavailable")
                          : (currentLang === "hi" ? service.priceTextHi : service.priceText)}
                      </span>
                    </div>

                    {/* Document Printing Special Sub-pills */}
                    {isDoc && !isStopped && (
                      <div className="mt-3 pt-2.5 border-t border-blue-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-slate-700 mr-1">
                          {currentLang === "hi" ? "शामिल सुविधाएँ:" : "Includes:"}
                        </span>
                        <span className="rounded-md bg-blue-100/70 text-blue-900 px-2 py-0.5 font-medium">
                          📚 Notes & Assignments
                        </span>
                        <span className="rounded-md bg-emerald-100/70 text-emerald-900 px-2 py-0.5 font-medium">
                          📑 Reports & Forms
                        </span>
                        <span className="rounded-md bg-amber-100/70 text-amber-900 px-2 py-0.5 font-medium">
                          ✨ Spiral Binding
                        </span>
                        <span className="rounded-md bg-purple-100/70 text-purple-900 px-2 py-0.5 font-medium">
                          🛡️ Lamination
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    {isStopped ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="w-full flex items-center justify-between text-xs font-bold text-slate-500 py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80"
                        title={
                          currentLang === "hi"
                            ? "यह सेवा अस्थायी रूप से बंद है"
                            : "This service is temporarily unavailable"
                        }
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{currentLang === "hi" ? "अनुपलब्ध (Unavailable)" : "Unavailable"}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                          {currentLang === "hi" ? "रोका गया" : "Stopped"}
                        </span>
                      </button>
                    ) : service.isComingSoon ? (
                      <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/60 cursor-not-allowed">
                        <span>{service.actionText}</span>
                        <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">
                          {currentLang === "hi" ? "ऑर्डर जल्द" : "Catalog Soon"}
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={paymentParam ? `${service.path}?payment=${paymentParam}` : service.path}
                        state={paymentParam ? { paymentMethod: paymentParam } : undefined}
                        className={cn(
                          "w-full inline-flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs group-hover:shadow-card cursor-pointer",
                          isDoc
                            ? "bg-[#123B70] text-white hover:bg-[#0c274c]"
                            : "bg-slate-900 text-white hover:bg-[#123B70]"
                        )}
                      >
                        <span>{service.actionText}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
};
