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
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";

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

  const services = [
    {
      id: "document-printing",
      title: currentLang === "hi" ? "दस्तावेज प्रिंटिंग (Document Printing)" : "Document Printing",
      tagline: currentLang === "hi" ? "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य दस्तावेज" : "Notes, assignments, forms, reports & all documents",
      desc:
        currentLang === "hi"
          ? "Notes, assignments, forms, reports aur documents print karein — spiral binding, comb binding aur lamination ke sath."
          : "Print notes, assignments, forms, certificates & reports — add spiral binding, comb binding, or lamination in one click.",
      icon: FileText,
      path: "/online-services/document-printing",
      badge: currentLang === "hi" ? "सबसे लोकप्रिय" : "Most Popular",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "शुरू करें →" : "Start Now →"),
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
      icon: Camera,
      path: "/online-services/passport-photo",
      badge: currentLang === "hi" ? "त्वरित प्रिंट" : "Fast & Sharp",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "शुरू करें →" : "Start Now →"),
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
      icon: CreditCard,
      path: "/online-services/visiting-cards",
      badge: currentLang === "hi" ? "350 GSM प्रीमियम" : "350 GSM Premium",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "शुरू करें →" : "Start Now →"),
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
      icon: Contact,
      path: "/online-services/id-cards",
      badge: currentLang === "hi" ? "स्मार्ट पीवीसी" : "Smart PVC",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "शुरू करें →" : "Start Now →"),
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
      icon: ImageIcon,
      path: "/online-services/poster-banner",
      badge: currentLang === "hi" ? "एचडी प्रिंट" : "HD Glossy",
      actionText: t.instantOnlineServices?.startNow || (currentLang === "hi" ? "शुरू करें →" : "Start Now →"),
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
      {/* 7 Quick Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {services.map((service) => {
          const Icon = service.icon;
          const isDoc = service.id === "document-printing";

          return (
            <div
              key={service.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg",
                isDoc && "lg:col-span-2 xl:col-span-2 bg-linear-to-br from-blue-50/40 via-white to-white border-blue-200/90 ring-1 ring-blue-500/10"
              )}
            >
              <div>
                {/* Header row with icon & badge */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl p-2.5 flex items-center justify-center border group-hover:scale-105 transition-transform shrink-0",
                      service.color
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                      service.isComingSoon
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : isDoc
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    {service.badge}
                  </span>
                </div>

                {/* Service Name */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#123B70] transition-colors leading-snug">
                  {service.title}
                </h3>

                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {service.tagline}
                </p>

                {/* Service Description */}
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {service.desc}
                </p>

                {/* Document Printing Special Sub-pills */}
                {isDoc && (
                  <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap items-center gap-1.5 text-[11px]">
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
                {service.isComingSoon ? (
                  <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 py-1.5 px-2 rounded-xl bg-slate-50 border border-slate-200/60">
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
