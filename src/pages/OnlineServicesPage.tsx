import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Camera,
  CreditCard,
  Contact,
  Image as ImageIcon,
  Printer,
  Sparkles,
  ArrowRight,
  UploadCloud,
  SlidersHorizontal,
  CreditCard as PayIcon,
  Cog,
  Store,
  Clock,
  Search,
  Zap,
  FileUp,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { cn } from "../lib/utils";
import { useAllQuickServicesAvailability } from "../hooks/useQuickServiceAvailability";

interface OnlineServicesPageProps {
  onOpenRequestModal?: () => void;
}

export const OnlineServicesPage: React.FC<OnlineServicesPageProps> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [onlineTrackInput, setOnlineTrackInput] = useState("");

  const {
    services: dbQuickServices,
    loading: isAvailabilityLoading,
    error: availabilityError,
    refresh: refreshAvailability,
  } = useAllQuickServicesAvailability();

  const rawPayment = searchParams.get("payment") || searchParams.get("paymentMethod") || searchParams.get("pay");
  const initialMode = (rawPayment && (rawPayment.toLowerCase() === "pay_online" || rawPayment.toLowerCase() === "online" || rawPayment.toLowerCase() === "priority"))
    ? "pay_online"
    : "pay_at_shop";

  const [paymentMode, setPaymentMode] = useState<"pay_online" | "pay_at_shop">(initialMode);

  useEffect(() => {
    const raw = searchParams.get("payment") || searchParams.get("paymentMethod") || searchParams.get("pay");
    if (raw) {
      const p = raw.toLowerCase();
      if (p === "pay_online" || p === "online" || p === "priority" || p === "paid" || p === "upi_online") {
        setPaymentMode("pay_online");
      } else if (p === "pay_at_shop" || p === "send_document" || p === "send-document" || p === "shop" || p === "store" || p === "normal") {
        setPaymentMode("pay_at_shop");
      }
    }
  }, [searchParams]);

  const handleSelectPaymentMode = (mode: "pay_online" | "pay_at_shop") => {
    setPaymentMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("payment", mode);
    setSearchParams(newParams, { replace: true });
  };

  const services = [
    {
      id: "document-printing",
      title: "Document Printing",
      titleHi: "दस्तावेज प्रिंटिंग (Document Printing)",
      desc: "Notes, assignments, documents, forms, reports and study material.",
      descHi: "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य सभी अध्ययन और आधिकारिक दस्तावेज।",
      featureLine: "B&W • Color • Single/Double Side • Binding • Lamination",
      featureLineHi: "ब्लैक & व्हाइट • रंगीन • सिंगल / डबल साइड • बाइंडिंग • लैमिनेशन",
      priceText: "₹1.50 onwards",
      priceTextHi: "₹1.50 से शुरू",
      icon: FileText,
      path: "/online-services/document-printing",
      badge: "MOST POPULAR",
      badgeHi: "सबसे लोकप्रिय",
      actionText: "Order Now →",
      actionTextHi: "ऑर्डर करें →",
      isPopular: true,
      isComingSoon: false,
      iconColor: "bg-blue-50 text-[#123B70] border-blue-200",
    },
    {
      id: "passport-photo",
      title: "Passport Photo Printing",
      titleHi: "पासपोर्ट फोटो प्रिंटिंग",
      desc: "Upload your photo and choose the required print layout.",
      descHi: "अपनी फोटो अपलोड करें और आवश्यक प्रिंट लेआउट (8, 16, 32 शीट) चुनें।",
      featureLine: "8, 16, 32 Photos • Glossy Photo Sheet • Stamp / Passport Size",
      featureLineHi: "8, 16, 32 फोटो शीट • ग्लॉसी फोटो पेपर • त्वरित प्रिंट",
      priceText: "₹20 onwards",
      priceTextHi: "₹20 से शुरू",
      icon: Camera,
      path: "/online-services/passport-photo",
      actionText: "Order Now →",
      actionTextHi: "ऑर्डर करें →",
      isPopular: false,
      isComingSoon: false,
      iconColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      id: "visiting-cards",
      title: "Visiting Card Printing",
      titleHi: "विजिटिंग कार्ड प्रिंटिंग",
      desc: "Upload your design or create a visiting card order.",
      descHi: "अपना डिज़ाइन अपलोड करें या उपलब्ध टेम्पलेट से बिजनेस कार्ड ऑर्डर करें।",
      featureLine: "350 GSM Premium • Matte & Gloss • Single & Both Side",
      featureLineHi: "350 GSM प्रीमियम • मैट व ग्लॉस फिनिश • सिंगल व दोनों साइड",
      priceText: "₹350 onwards",
      priceTextHi: "₹350 से शुरू",
      icon: CreditCard,
      path: "/online-services/visiting-cards",
      actionText: "Order Now →",
      actionTextHi: "ऑर्डर करें →",
      isPopular: false,
      isComingSoon: false,
      iconColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
    },
    {
      id: "id-cards",
      title: "ID Card Printing",
      titleHi: "पहचान पत्र (ID Card) प्रिंटिंग",
      desc: "Create and order personalized ID cards.",
      descHi: "स्कूल, कॉलेज, स्टाफ और व्यक्तिगत स्मार्ट पीवीसी आईडी कार्ड ऑर्डर करें।",
      featureLine: "Smart PVC Card • Lanyard & Holder • Single / Double Sided",
      featureLineHi: "स्मार्ट PVC कार्ड • डोरी व होल्डर • सिंगल व डबल साइडेड",
      priceText: "₹40 onwards",
      priceTextHi: "₹40 से शुरू",
      icon: Contact,
      path: "/online-services/id-cards",
      actionText: "Order Now →",
      actionTextHi: "ऑर्डर करें →",
      isPopular: false,
      isComingSoon: false,
      iconColor: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      id: "poster-banner",
      title: "Poster & Banner Printing",
      titleHi: "पोस्टर एवं बैनर प्रिंटिंग",
      desc: "Upload your design and select size, material and quantity.",
      descHi: "अपना डिज़ाइन अपलोड करें और साइज, पेपर या फ्लेक्स मटेरियल चुनें।",
      featureLine: "A4, A3, Photo Paper • Vinyl & Flex • High-Definition",
      featureLineHi: "A4, A3 फोटो शीट • विनाइल व फ्लेक्स • HD प्रिंटिंग",
      priceText: "₹20 onwards",
      priceTextHi: "₹20 से शुरू",
      icon: ImageIcon,
      path: "/online-services/poster-banner",
      actionText: "Order Now →",
      actionTextHi: "ऑर्डर करें →",
      isPopular: false,
      isComingSoon: false,
      iconColor: "bg-purple-50 text-purple-800 border-purple-200",
    },
    {
      id: "custom-print",
      title: "Custom Print Order",
      titleHi: "कस्टम प्रिंट ऑर्डर",
      desc: "Have a different printing requirement? Tell us what you need.",
      descHi: "पम्पलेट, बिल बुक, स्टिकर, मेन्यू या अन्य कस्टम प्रिंटिंग की आवश्यकता बताएं।",
      featureLine: "Bill Books • Pamphlets • Stickers • Custom Requirements",
      featureLineHi: "बिल बुक • पम्पलेट • स्टिकर • विशिष्ट आवश्यकताएं",
      priceText: "Custom Quote",
      priceTextHi: "कस्टम कोटेशन",
      icon: Printer,
      path: "/online-services/custom-print",
      actionText: "Order Details →",
      actionTextHi: "विवरण देखें →",
      isPopular: false,
      isComingSoon: false,
      iconColor: "bg-cyan-50 text-cyan-900 border-cyan-200",
    },
    {
      id: "invitation-cards",
      title: "Invitation / Wedding Cards",
      titleHi: "शादी एवं निमंत्रण कार्ड",
      desc: "Customized invitation and wedding card printing is coming soon.",
      descHi: "कस्टमाइज्ड शादी एवं मांगलिक निमंत्रण पत्र प्रिंटिंग सेवा जल्द उपलब्ध होगी।",
      featureLine: "Wedding Cards • Tilak • Events • Coming Soon",
      featureLineHi: "शादी कार्ड • तिलक • गृह प्रवेश • जल्द उपलब्ध",
      priceText: "Coming Soon",
      priceTextHi: "जल्द उपलब्ध",
      icon: Sparkles,
      path: "#",
      badge: "Coming Soon",
      badgeHi: "जल्द आ रहा है",
      actionText: "Coming Soon",
      actionTextHi: "जल्द आ रहा है",
      isPopular: false,
      isComingSoon: true,
      iconColor: "bg-rose-50 text-rose-800 border-rose-200",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Upload",
      titleHi: "1. अपलोड करें",
      desc: "Send your file or design.",
      descHi: "अपनी फाइल या डिज़ाइन भेजें।",
      icon: UploadCloud,
    },
    {
      step: "2",
      title: "Customize",
      titleHi: "2. कस्टमाइज़ करें",
      desc: "Choose size, paper, color, quantity & finishing.",
      descHi: "साइज, पेपर, रंग, संख्या और फिनिशिंग चुनें।",
      icon: SlidersHorizontal,
    },
    {
      step: "3",
      title: "Pay",
      titleHi: "3. पेमेंट चुनें",
      desc: "Choose Pay Online or Send Document (Pay on Pickup).",
      descHi: "ऑनलाइन भुगतान या दस्तावेज भेजें (पिकअप पर भुगतान) चुनें।",
      icon: PayIcon,
    },
    {
      step: "4",
      title: "We Prepare",
      titleHi: "4. हम तैयार करेंगे",
      desc: "Palak prepares your order with care.",
      descHi: "पालक टीम आपका ऑर्डर सावधानी से प्रिंट करेगी।",
      icon: Cog,
    },
    {
      step: "5",
      title: "Collect",
      titleHi: "5. प्राप्त करें",
      desc: "Collect your ready order from the shop.",
      descHi: "दुकान से तैयार प्रिंट तुरंत कलेक्ट करें।",
      icon: Store,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      <SEO
        title={{
          en: "⚡ Instant Online Services | Palak Enterprises",
          hi: "⚡ इंस्टेंट ऑनलाइन सेवाएँ | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Fast online self-service printing orders: documents, passport photos, visiting cards, ID cards, and custom prints. Direct shop collection in Chakia.",
          hi: "ऑनलाइन प्रिंटिंग सेल्फ सर्विस: नोट्स, पासपोर्ट फोटो, विजिटिंग कार्ड, आईडी कार्ड और कस्टम प्रिंट। चकिया दुकान से त्वरित कलेक्शन।",
        }}
      />

      {/* 1. Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Instant Online Services", hi: "इंस्टेंट ऑनलाइन सेवाएँ" }, path: "/online-services" },
        ]}
        badge={{
          en: "⚡ Direct Shop Collection · Fast Turnaround",
          hi: "⚡ डायरेक्ट दुकान से पिकअप · त्वरित सेवा",
        }}
        title={{
          en: "Instant Online Printing & Self-Service",
          hi: "इंस्टेंट ऑनलाइन प्रिंटिंग व सेल्फ सर्विस",
        }}
        subtitle={{
          en: "Upload your files, customize print and finishing options, and pick up your ready printouts directly at our Chakia store without waiting in line.",
          hi: "फाइल अपलोड करें, प्रिंटिंग विकल्प चुनें और ऑर्डर सबमिट करें। दुकान से बिना लाइन में लगे तैयार प्रिंट तुरंत कलेक्ट करें।",
        }}
        primaryCta={{
          label: { en: "Document Printing", hi: "दस्तावेज प्रिंटिंग" },
          to: `/online-services/document-printing?payment=${paymentMode}`,
        }}
        secondaryCta={{
          label: { en: "Passport Photos", hi: "पासपोर्ट फोटो" },
          to: `/online-services/passport-photo?payment=${paymentMode}`,
        }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* 2. QUICK PRINT SERVICES GRID */}
        <section aria-labelledby="quick-print-services-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <h2
                id="quick-print-services-heading"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight"
              >
                {currentLang === "hi" ? "त्वरित प्रिंट सेवाएँ" : "Quick Print Services"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {currentLang === "hi"
                  ? "अपना ऑर्डर शुरू करने के लिए कोई भी सेवा चुनें।"
                  : "Choose a service to start your order."}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 self-start sm:self-auto bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {currentLang === "hi" ? "7 सेवाएँ उपलब्ध" : "7 Services Available"}
            </span>
          </div>

          {/* Payment Method Selector Banner / Quick Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {currentLang === "hi" ? "भुगतान विकल्प चुनें (Pre-select Mode)" : "Choose Order Mode (Pre-select Payment)"}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {paymentMode === "pay_online"
                  ? (currentLang === "hi" ? "⚡ प्रायोरिटी कतार: भुगतान ऑनलाइन, दुकान पर सीधा पिकअप" : "⚡ Priority Queue: Pay online & collect ready prints directly")
                  : (currentLang === "hi" ? "📄 सामान्य कतार: फाइल भेजें, काउंटर पर भुगतान" : "📄 Normal Queue: Send files now, pay at shop counter")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectPaymentMode("pay_online")}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left cursor-pointer",
                  paymentMode === "pay_online"
                    ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 opacity-80"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs",
                  paymentMode === "pay_online" ? "bg-emerald-600" : "bg-slate-400"
                )}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {currentLang === "hi" ? "💳 ऑनलाइन भुगतान" : "💳 Pay Online (Fastest)"}
                    </span>
                    <span className="rounded-full bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 uppercase">
                      PRIORITY QUEUE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {currentLang === "hi"
                      ? "ऑनलाइन भुगतान करें • सबसे पहले प्रिंट पाएं • 0 इंतज़ार"
                      : "Pay via UPI/Cards • Express priority printing • Instant pickup"}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPaymentMode("pay_at_shop")}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left cursor-pointer",
                  paymentMode === "pay_at_shop"
                    ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/30 shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 opacity-80"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs",
                  paymentMode === "pay_at_shop" ? "bg-amber-500" : "bg-slate-400"
                )}>
                  <FileUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {currentLang === "hi" ? "📄 दुकान पर भुगतान" : "📄 Send Document (Pay at Shop)"}
                    </span>
                    <span className="rounded-full bg-amber-100 text-amber-900 text-[9px] font-bold px-2 py-0.5 uppercase">
                      STANDARD QUEUE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {currentLang === "hi"
                      ? "फाइल अभी भेजें • काउंटर पर आते ही प्रिंट शुरू • दुकान पर भुगतान"
                      : "Send files in advance • Verified at counter • Pay on pickup"}
                  </p>
                </div>
              </button>
            </div>
          </div>

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

          {/* 3-Column Desktop Grid / 2-Col Tablet / 1-Col Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {isAvailabilityLoading && dbQuickServices.length === 0
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-11 w-11 rounded-xl bg-slate-200" />
                      <div className="h-5 w-24 rounded-full bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 rounded-md bg-slate-200" />
                      <div className="h-3 w-full rounded-md bg-slate-100" />
                      <div className="h-3 w-5/6 rounded-md bg-slate-100" />
                    </div>
                    <div className="h-4 w-20 rounded-md bg-slate-200 pt-2" />
                    <div className="h-10 w-full rounded-xl bg-slate-200" />
                  </div>
                ))
              : services.map((service) => {
                  const Icon = service.icon;
                  const isDoc = service.id === "document-printing";
                  const targetUrl = `${service.path}?payment=${paymentMode}`;
                  const dbItem = dbQuickServices.find((s) => s.id === service.id);
                  const isStopped = dbItem ? dbItem.is_active === false : false;
                  const stopReason = dbItem?.stop_reason;

                  return (
                    <article
                      key={service.id}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200",
                        isStopped
                          ? "border-rose-200 bg-rose-50/20 shadow-xs"
                          : isDoc
                          ? "border-blue-300 ring-1 ring-blue-500/20 bg-linear-to-b from-blue-50/35 via-white to-white shadow-md hover:shadow-xl hover:border-blue-400"
                          : "border-slate-200 shadow-xs hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                        service.isComingSoon && "bg-slate-50/70 opacity-90 border-slate-200"
                      )}
                    >
                      <div>
                        {/* Top row: Icon + Availability Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3.5">
                          <div
                            className={cn(
                              "h-11 w-11 rounded-xl p-2.5 flex items-center justify-center border transition-transform group-hover:scale-105 shrink-0",
                              isStopped ? "bg-rose-100 text-rose-800 border-rose-200" : service.iconColor
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Dynamic Availability Badge */}
                          {isStopped ? (
                            <span
                              className="rounded-full bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide shadow-2xs inline-flex items-center gap-1.5"
                              role="status"
                              aria-label="Temporarily Unavailable"
                            >
                              <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                              <span>{currentLang === "hi" ? "अस्थायी रूप से अनुपलब्ध" : "Temporarily Unavailable"}</span>
                            </span>
                          ) : service.isComingSoon ? (
                            <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider">
                              {currentLang === "hi" ? service.badgeHi : service.badge}
                            </span>
                          ) : (
                            <span
                              className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide shadow-2xs inline-flex items-center gap-1.5"
                              role="status"
                              aria-label="Available"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>{currentLang === "hi" ? "उपलब्ध" : "Available"}</span>
                            </span>
                          )}
                        </div>

                        {/* Service Title */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#123B70] transition-colors leading-snug">
                          {currentLang === "hi" ? service.titleHi : service.title}
                        </h3>

                        {/* Service Short Description or Stop Reason Box */}
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
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            {currentLang === "hi" ? service.descHi : service.desc}
                          </p>
                        )}

                        {/* Pricing & Features Section */}
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

                        {!isStopped && (
                          <p
                            className={cn(
                              "text-[10.5px] font-semibold leading-normal mt-1",
                              isDoc ? "text-blue-900 font-bold" : "text-slate-500"
                            )}
                          >
                            {currentLang === "hi" ? service.featureLineHi : service.featureLine}
                          </p>
                        )}
                      </div>

                      {/* CTA Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
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
                          <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200 cursor-not-allowed">
                            <span>{currentLang === "hi" ? service.actionTextHi : service.actionText}</span>
                            <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                              {currentLang === "hi" ? "जल्द" : "Soon"}
                            </span>
                          </div>
                        ) : (
                          <Link
                            to={targetUrl}
                            state={{ paymentMethod: paymentMode }}
                            className={cn(
                              "w-full inline-flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer",
                              isDoc
                                ? "bg-[#123B70] text-white hover:bg-[#0c274c] shadow-blue-900/10 group-hover:shadow-md"
                                : "bg-slate-900 text-white hover:bg-[#123B70]"
                            )}
                          >
                            <span>{currentLang === "hi" ? service.actionTextHi : service.actionText}</span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
          </div>
        </section>

        {/* 3. HOW IT WORKS (Compact 5 Steps) */}
        <section
          aria-labelledby="how-it-works-heading"
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                {currentLang === "hi" ? "सरल प्रक्रिया" : "Simple Order Flow"}
              </span>
              <h2
                id="how-it-works-heading"
                className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5"
              >
                {currentLang === "hi" ? "काम कैसे करता है? (How It Works)" : "How It Works"}
              </h2>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-semibold text-[#123B70]">
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                {currentLang === "hi"
                  ? "दुकान आने से पहले ऑनलाइन ऑर्डर करें और समय बचाएं।"
                  : "Order online before visiting the shop and reduce waiting time."}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {steps.map((item) => {
              const StepIcon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-7 w-7 rounded-full bg-[#123B70] text-white text-xs font-black flex items-center justify-center">
                      {item.step}
                    </span>
                    <StepIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {currentLang === "hi" ? item.titleHi : item.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {currentLang === "hi" ? item.descHi : item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. TRACK ORDER DIRECT ACCESS */}
        <section className="rounded-3xl border border-blue-200 bg-linear-to-r from-blue-900 to-indigo-950 p-6 sm:p-8 text-white space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">
                {currentLang === "hi" ? "लाइव स्टेटस ट्रैकिंग" : "Live Status Tracking"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {currentLang === "hi"
                  ? "क्या आपने पहले ही ऑर्डर दिया है?"
                  : "Already placed an online printing order?"}
              </h2>
              <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
                {currentLang === "hi"
                  ? "अपना ऑर्डर कोड (उदा. ORD-20260823-1698) दर्ज करें और लाइव प्रिंटिंग स्थिति देखें।"
                  : "Enter your order reference code (e.g. ORD-20260823-1698) to track live production and pickup readiness."}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onlineTrackInput.trim()) {
                  navigate(`/track-order?code=${encodeURIComponent(onlineTrackInput.trim())}`);
                }
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={onlineTrackInput}
                  onChange={(e) => setOnlineTrackInput(e.target.value)}
                  placeholder={currentLang === "hi" ? "ऑर्डर कोड दर्ज करें..." : "Enter Order Code..."}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/60 focus:bg-white focus:text-slate-900 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-white text-[#123B70] hover:bg-blue-50 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {currentLang === "hi" ? "ट्रैक करें" : "Track"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OnlineServicesPage;
