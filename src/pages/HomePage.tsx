import React from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  Globe,
  Briefcase,
  Gift,
  ArrowRight,
  Sparkles,
  Palette,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { Hero } from "../components/Hero";
import { WebsiteProjectsSection } from "../components/WebsiteProjectsSection";
import { ProductCard } from "../components/ProductCard";
import { DigitalServiceCard } from "../components/DigitalServiceCard";
import { ScrollReveal } from "../components/ui/motion/ScrollReveal";
import { PalakDataStore } from "../lib/storage/store";
import { PromotionalBanner } from "../components/PromotionalBanner";
import { business, businessConfig, getWhatsAppLink, getDirectionsLink } from "../config/business";
import { cn } from "../lib/utils";
import { SEO } from "../components/SEO";

interface HomePageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService?: (service: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const products = PalakDataStore.getProducts();
  const popularProducts = products.filter((p) => p.isPopular || p.isFeatured).slice(0, 6);
  const digitalServices = PalakDataStore.getDigitalServices().slice(0, 4);

  const categories = [
    {
      id: "printing",
      title: { en: "Printing & Press", hi: "प्रिंटिंग एवं प्रेस" },
      desc: { en: "Visiting cards, letterheads, flex banners, pamphlets & photo prints.", hi: "विजिटिंग कार्ड, लेटरहेड, फ्लेक्स बैनर, पम्पलेट और फोटो प्रिंट।" },
      count: "14+ Products",
      icon: Printer,
      link: "/printing",
      color: "bg-blue-50 text-[#123B70] border-blue-200/60",
    },
    {
      id: "digital",
      title: { en: "Digital & CSC Services", hi: "डिजिटल एवं सीएससी सेवाएँ" },
      desc: { en: "PAN card, RTPS certificates, exam forms, scholarships & CSC services.", hi: "पैन कार्ड, जाति/आय प्रमाण, परीक्षा फॉर्म, छात्रवृत्ति व सीएससी सेवाएँ।" },
      count: "12+ Services",
      icon: Globe,
      link: "/digital-services",
      color: "bg-amber-50 text-amber-800 border-amber-200/60",
    },
    {
      id: "business",
      title: { en: "Business Solutions", hi: "बिजनेस सॉल्यूशंस" },
      desc: { en: "Office stationery, carbonless bill books, shop branding & custom web dev.", hi: "ऑफिस स्टेशनरी, बिल बुक, दुकान ब्रांडिंग एवं कस्टम वेबसाइट।" },
      count: "8+ Packages",
      icon: Briefcase,
      link: "/business",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    },
    {
      id: "wedding",
      title: { en: "Wedding & Events", hi: "शादी एवं मांगलिक कार्ड" },
      desc: { en: "Royal gold-foil wedding cards, Tilak, Mundan & ceremony invitations.", hi: "शाही शादी कार्ड, तिलक, मुंडन और मांगलिक आयोजनों के निमंत्रण पत्र।" },
      count: "6+ Collections",
      icon: Gift,
      link: "/wedding-events",
      color: "bg-rose-50 text-rose-800 border-rose-200/60",
    },
  ];

  return (
    <div className="space-y-14 sm:space-y-20 pb-16">
      <SEO
        title={{
          en: "Printing Press & Digital Services in Chakia, Bihar | Palak Enterprises",
          hi: "प्रिंटिंग प्रेस एवं ऑनलाइन सेवा केंद्र चकिया, बिहार | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Palak Enterprises (Palak Printing Press) in Chakia, Bihar. Fast document printing, visiting cards, wedding cards, flex banners, instant passport photos, PVC ID cards & online CSC services.",
          hi: "पालक इंटरप्राइजेज चकिया (पूर्वी चंपारण): ऑनलाइन दस्तावेज प्रिंटिंग, विजिटिंग कार्ड, शादी कार्ड, फ्लेक्स बैनर, 5 मिनट पासपोर्ट फोटो, पीवीसी स्मार्ट कार्ड व सरकारी ऑनलाइन सेवा केंद्र।",
        }}
        canonical="/"
        keywords="Printing Press in Chakia, Palak Enterprises, Palak Printing Press, Digital Printing in Chakia, Wedding Card Printing Chakia, Visiting Card Chakia, Flex Printing East Champaran, Document Photocopy Chakia"
      />

      {/* 1. Hero Section */}
      <Hero onOpenRequestModal={onOpenRequestModal} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16 sm:space-y-20">
        {/* Promotional Pop-Up Modal (School / Notice style) */}
        <PromotionalBanner />

        {/* 2. Main 4 Service Category Cards */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  {currentLang === "hi" ? "प्रमुख श्रेणियां" : "Core Categories"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {currentLang === "hi" ? "हमारी संपूर्ण सेवा श्रेणियां" : "Explore All Departments"}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.id}
                    to={cat.link}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg interactive-card"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div>
                      <div className={cn("h-12 w-12 rounded-xl p-2.5 flex items-center justify-center border mb-4 group-hover:scale-105 transition-transform", cat.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#123B70] transition-colors">
                        {cat.title[currentLang]}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {cat.desc[currentLang]}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">{cat.count}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] group-hover:translate-x-1 transition-transform">
                        <span>{currentLang === "hi" ? "देखें" : "Explore"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* 4. Popular Printing Products Section */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  {currentLang === "hi" ? "प्रिंटिंग प्रेस कैटलॉग" : "Print Store"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {currentLang === "hi" ? "लोकप्रिय प्रिंटिंग उत्पाद" : "Popular Printing Products"}
                </h2>
              </div>
              <Link
                to="/printing"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#123B70] hover:underline"
              >
                <span>{currentLang === "hi" ? "सभी प्रिंटिंग उत्पाद देखें →" : "View Full Catalog →"}</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* 5. Online & Digital Services Section */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="rounded-3xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-[#123B70] mb-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Govt & CSC Citizen Center</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {currentLang === "hi" ? "ऑनलाइन एवं डिजिटल सेवाएँ" : "Online & Digital Assisted Services"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  {currentLang === "hi"
                    ? "सरकारी योजनाओं के आवेदन, पैन कार्ड, जाति-आय प्रमाणपत्र एवं प्रतियोगी परीक्षा फॉर्म भरने में विशेषज्ञ सहायता।"
                    : "Assisted online applications for government schemes, PAN cards, RTPS certificates, and competitive exams."}
                </p>
              </div>

              <Link
                to="/services"
                className="inline-flex items-center gap-1 rounded-xl bg-[#123B70] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] active-press transition-all shrink-0"
              >
                <span>{currentLang === "hi" ? "सभी डिजिटल सेवाएँ देखें" : "View All Services"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {digitalServices.map((s) => (
                <DigitalServiceCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* 6. Website Development Projects / Digital Showcase */}
        <WebsiteProjectsSection onOpenRequestModal={onOpenRequestModal} />

        {/* 7. Business & Bulk Printing Banner */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="rounded-3xl border border-line bg-[#123B70] text-white p-6 sm:p-10 relative overflow-hidden shadow-raised">
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
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 text-xs font-bold">
                <Briefcase className="h-3.5 w-3.5" />
                <span>B2B & Commercial Printing</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                {currentLang === "hi"
                  ? "दुकानों, स्कूलों और फर्मों के लिए थोक प्रिंटिंग"
                  : "Business & Bulk Printing Solutions"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentLang === "hi"
                  ? "ऑफिस स्टेशनरी, डुप्लिकेट बिल बुक, स्कूल आईडी कार्ड किट, दुकान के फ्लेक्स बोर्ड और कस्टम वेबसाइट निर्माण पर विशेष थोक दरें।"
                  : "Complete branding packages, GST bill books, student ID cards, shop hoardings, and custom business websites at wholesale pricing."}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/request-quote"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 active-press transition-transform hover:scale-105"
                >
                  {currentLang === "hi" ? "थोक कोटेशन मांगें" : "Request Bulk Quote"}
                </Link>
                <Link
                  to="/business"
                  className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-xs sm:text-sm font-bold text-white active-press transition-colors"
                >
                  {currentLang === "hi" ? "बिजनेस पैकेज देखें" : "Explore Packages"}
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 7. How It Works 5-Step Process */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="space-y-8 text-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                {currentLang === "hi" ? "सरल प्रक्रिया" : "Simple 5-Step Workflow"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {currentLang === "hi" ? "काम कैसे होता है?" : "How It Works"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { step: "1", titleEn: "Choose Service", titleHi: "सेवा चुनें", descEn: "Select printing product or digital assistance service." },
                { step: "2", titleEn: "Configure Options", titleHi: "विकल्प चुनें", descEn: "Pick quantity, paper GSM, finish, or required docs." },
                { step: "3", titleEn: "Upload or Request", titleHi: "अपलोड / डिज़ाइन", descEn: "Attach ready design or ask our studio to design." },
                { step: "4", titleEn: "Palak Processes", titleHi: "तैयारी व प्रिंटिंग", descEn: "We review, verify proofs & print on HD machines." },
                { step: "5", titleEn: "Collect", titleHi: "प्राप्त करें", descEn: "Pick up at Chakia store." },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-5 text-left relative space-y-2 interactive-card">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#123B70] font-extrabold flex items-center justify-center text-sm">
                    {item.step}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {currentLang === "hi" ? item.titleHi : item.titleEn}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* 8. Why Choose Palak Enterprises Trust Grid */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                {currentLang === "hi" ? "हमारा वादा" : "Why Choose Palak?"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {currentLang === "hi" ? "विश्वसनीयता एवं गुणवत्ता" : "Built for Trust & Quality"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, title: "Official CSC & RTPS Center", desc: "Government registered citizen service point (CSC ID: 634165120013)." },
                { icon: Clock, title: "Rapid Turnaround", desc: "Same-day photo prints, instant Aadhaar PVC, and fast 24-hr offset printing." },
                { icon: CheckCircle2, title: "Transparent Pricing", desc: "Clear itemized rates with no hidden fees or surprise charges." },
                { icon: MapPin, title: "Chakia Walk-in Store", desc: "Easily visit our ground-floor office near Block Gate for direct help." },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 interactive-card">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{feature.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* 9. Don't Have a Design? Studio Banner */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {currentLang === "hi" ? "डिज़ाइन नहीं है? कोई बात नहीं!" : "Don't Have a Design? No Problem."}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
                  {currentLang === "hi"
                    ? "हमारी ग्राफिक डिज़ाइनर टीम आपके विजिटिंग कार्ड, शादी कार्ड, बैनर या पम्पलेट का सुंदर एवं पेशेवर डिज़ाइन तैयार करेगी।"
                    : "Our in-house creative team can craft high-impact custom artwork for business cards, banners, wedding cards, and pamphlets."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <Link
                to="/design-services"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card active-press transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{currentLang === "hi" ? "डिज़ाइन सेवा लें" : "REQUEST DESIGN"}</span>
              </Link>
            </div>
          </section>
        </ScrollReveal>

        {/* 10. Store Location & Contact Details */}
        <ScrollReveal direction="up" distancePx={20}>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">
                {currentLang === "hi" ? "हमारी दुकान पर पधारें" : "Visit Our Store"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {business.name[currentLang]} / {business.unit[currentLang]}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {businessConfig.address.fullAddress[currentLang]}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Owner / Proprietor</span>
                  <span className="font-bold text-slate-900 text-sm">{business.owner[currentLang]}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 font-medium block">Direct Helpline</span>
                  <span className="font-bold text-slate-900 text-sm">+91 {business.phones[0]}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={getWhatsAppLink("Hello Palak, I need location directions.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white active-press transition-colors"
                >
                  <span>WhatsApp Directions</span>
                </a>
                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 active-press transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-600" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 h-64 sm:h-72 bg-slate-100">
              <iframe
                title="Palak Enterprises Location Map"
                src={business.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default HomePage;
