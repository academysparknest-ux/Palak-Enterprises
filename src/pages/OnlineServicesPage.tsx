import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Globe,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { cn } from "../lib/utils";

interface OnlineServicesPageProps {
  onOpenRequestModal?: () => void;
}

export const OnlineServicesPage: React.FC<OnlineServicesPageProps> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const navigate = useNavigate();
  const [onlineTrackInput, setOnlineTrackInput] = useState("");

  const services = [
    {
      id: "document-printing",
      title: "Document Printing",
      titleHi: "दस्तावेज प्रिंटिंग (Document Printing)",
      desc: "Notes, assignments, documents, forms, reports and study material.",
      descHi: "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य सभी अध्ययन और आधिकारिक दस्तावेज।",
      featureLine: "B&W • Color • Single/Double Side • Binding • Lamination",
      featureLineHi: "ब्लैक & व्हाइट • रंगीन • सिंगल / डबल साइड • बाइंडिंग • लैमिनेशन",
      icon: FileText,
      path: "/online-services/document-printing",
      badge: "MOST POPULAR",
      badgeHi: "सबसे लोकप्रिय",
      actionText: "Start Printing →",
      actionTextHi: "प्रिंटिंग शुरू करें →",
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
      icon: Camera,
      path: "/online-services/passport-photo",
      actionText: "Start →",
      actionTextHi: "शुरू करें →",
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
      icon: CreditCard,
      path: "/online-services/visiting-cards",
      actionText: "Start →",
      actionTextHi: "शुरू करें →",
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
      icon: Contact,
      path: "/online-services/id-cards",
      actionText: "Start →",
      actionTextHi: "शुरू करें →",
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
      icon: ImageIcon,
      path: "/online-services/poster-banner",
      actionText: "Start →",
      actionTextHi: "शुरू करें →",
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
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
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
          to: "/online-services/document-printing",
        }}
        secondaryCta={{
          label: { en: "Passport Photos", hi: "पासपोर्ट फोटो" },
          to: "/online-services/passport-photo",
        }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* 2. QUICK PRINT SERVICES GRID (Above the fold on standard desktop) */}
        <section aria-labelledby="quick-print-services-heading" className="space-y-4">
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

          {/* 3-Column Desktop Grid / 2-Col Tablet / 1-Col Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => {
              const Icon = service.icon;
              const isDoc = service.id === "document-printing";

              return (
                <article
                  key={service.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200",
                    isDoc
                      ? "border-blue-300 ring-1 ring-blue-500/20 bg-linear-to-b from-blue-50/35 via-white to-white shadow-md hover:shadow-xl hover:border-blue-400"
                      : "border-slate-200 shadow-xs hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                    service.isComingSoon && "bg-slate-50/70 opacity-90 border-slate-200"
                  )}
                >
                  <div>
                    {/* Top row: Icon + Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div
                        className={cn(
                          "h-11 w-11 rounded-xl p-2.5 flex items-center justify-center border transition-transform group-hover:scale-105 shrink-0",
                          service.iconColor
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {service.isPopular ? (
                        <span className="rounded-full bg-blue-600 text-white border border-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
                          {currentLang === "hi" ? service.badgeHi : service.badge}
                        </span>
                      ) : service.isComingSoon ? (
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {currentLang === "hi" ? service.badgeHi : service.badge}
                        </span>
                      ) : null}
                    </div>

                    {/* Service Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#123B70] transition-colors leading-snug">
                      {currentLang === "hi" ? service.titleHi : service.title}
                    </h3>

                    {/* Service Short Description */}
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {currentLang === "hi" ? service.descHi : service.desc}
                    </p>

                    {/* Feature Highlights Line */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100">
                      <p
                        className={cn(
                          "text-[11px] font-semibold leading-normal",
                          isDoc ? "text-blue-900 font-bold" : "text-slate-500"
                        )}
                      >
                        {currentLang === "hi" ? service.featureLineHi : service.featureLine}
                      </p>
                    </div>
                  </div>

                  {/* CTA Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {service.isComingSoon ? (
                      <div className="w-full flex items-center justify-between text-xs font-bold text-slate-400 py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200 cursor-not-allowed">
                        <span>{currentLang === "hi" ? service.actionTextHi : service.actionText}</span>
                        <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                          {currentLang === "hi" ? "जल्द" : "Soon"}
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={service.path}
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
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 hover:bg-white hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-7 w-7 rounded-lg bg-[#123B70] text-white font-black flex items-center justify-center text-xs shadow-xs">
                      {item.step}
                    </span>
                    <StepIcon className="h-4 w-4 text-slate-400" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {currentLang === "hi" ? item.titleHi : item.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentLang === "hi" ? item.descHi : item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. COMPACT ORDER TRACKING STRIP */}
        <section
          aria-labelledby="track-order-heading"
          className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-[#123B70] to-slate-900 text-white p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
              <Search className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 id="track-order-heading" className="text-sm sm:text-base font-bold text-white">
                {currentLang === "hi" ? "क्या आपने पहले ही ऑर्डर किया है?" : "Already placed an order?"}
              </h3>
              <p className="text-xs text-slate-300">
                {currentLang === "hi"
                  ? "अपने ऑर्डर आईडी या मोबाइल नंबर से लाइव प्रिंट स्थिति जांचें।"
                  : "Check the real-time printing and readiness status of your order."}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onlineTrackInput.trim()) {
                navigate(`/order-status?code=${encodeURIComponent(onlineTrackInput.trim())}`);
              } else {
                navigate("/order-status");
              }
            }}
            className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0"
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={onlineTrackInput}
                onChange={(e) => setOnlineTrackInput(e.target.value)}
                placeholder={
                  currentLang === "hi"
                    ? "ट्रैकिंग आईडी दर्ज करें (e.g. PE-O-...)"
                    : "Enter Tracking ID (e.g. PE-O-...)"
                }
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-md pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-300 focus:bg-white focus:text-slate-900 focus:outline-hidden transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 text-xs font-black transition-transform hover:scale-105 shrink-0 shadow-md cursor-pointer"
            >
              <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें →" : "Track Order →"}</span>
            </button>
          </form>
        </section>

        {/* 5. CSC / CITIZEN DIGITAL CENTER PROMPT (Compact Footnote Link) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700 text-center sm:text-left">
            <Globe className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              {currentLang === "hi"
                ? "सरकारी परीक्षा फॉर्म, पैन कार्ड या सीएससी डिजिटल सेवाओं की आवश्यकता है?"
                : "Looking for Government Exam Forms, PAN Card, or CSC Citizen Services?"}
            </span>
          </div>

          <Link
            to="/services"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline shrink-0"
          >
            <span>{currentLang === "hi" ? "संपूर्ण सेवा कैटलॉग देखें →" : "Explore Complete Services Catalog →"}</span>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default OnlineServicesPage;
