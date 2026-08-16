import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, ArrowRight, CheckCircle2, Store, School, UtensilsCrossed, Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { ProductCard } from "../components/ProductCard";
import { PalakDataStore } from "../lib/storage/store";
import { getWhatsAppLink } from "../config/business";

export const BusinessPage: React.FC<{ onOpenRequestModal?: () => void }> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const businessProducts = PalakDataStore.getProducts().filter(
    (p) => p.categoryType === "business" || p.slug.includes("visiting") || p.slug.includes("letterhead") || p.slug.includes("banner")
  );

  const businessSolutions = [
    {
      icon: Store,
      titleEn: "Retail & Shop Branding Kit",
      titleHi: "दुकान एवं शोरूम ब्रांडिंग किट",
      descEn: "Flex hoardings, acrylic glow-sign boards, 1000 promotional pamphlets, visiting cards & numbered bill books.",
      descHi: "फ्लेक्स बोर्ड, ऐक्रेलिक साइनबोर्ड, 1000 प्रचार पर्चे, विजिटिंग कार्ड और बिल बुक का संपूर्ण पैकेज।",
      badge: "Best for New Shops",
    },
    {
      icon: School,
      titleEn: "School & Coaching Printing Kit",
      titleHi: "स्कूल एवं कोचिंग संस्थान किट",
      descEn: "Student PVC smart ID cards, admission prospectus, examination answer sheets, certificates & attendance registers.",
      descHi: "छात्र पीवीसी आईडी कार्ड, प्रोस्पेक्टस, परीक्षा उत्तर पुस्तिकाएं, सर्टिफिकेट और रजिस्टर प्रिंटिंग।",
      badge: "Institutional Rates",
    },
    {
      icon: UtensilsCrossed,
      titleEn: "Restaurant & Cafe Essentials",
      titleHi: "होटल, रेस्टोरेंट एवं कैफे स्टेशनरी",
      descEn: "Laminated multi-page food menus, takeaway paper bags, KOT order pads, table standees & counter banners.",
      descHi: "लैमिनेटेड मेनू कार्ड, पार्सल बैग, केओटी पैड, टेबल स्टैन्डी और प्रचार सामग्री।",
      badge: "Hospitality Pack",
    },
    {
      icon: Globe,
      titleEn: "Digital & Custom Website Development",
      titleHi: "कस्टम वेबसाइट एवं डिजिटल उपस्थिति",
      descEn: "Modern, high-speed mobile responsive websites for local businesses, schools, doctors, and retailers with Google Maps SEO.",
      descHi: "दुकान, कोचिंग और स्थानीय व्यवसायों के लिए मोबाइल-फ्रेंडली आधुनिक वेबसाइट और गूगल सर्च लिस्टिंग।",
      badge: "Tech Solutions",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Hero Banner */}
      <div className="bg-[#123B70] text-white py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Business Solutions</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-xs font-bold">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Commercial & Bulk Printing Hub</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "व्यावसायिक प्रिंटिंग एवं ब्रांडिंग समाधान" : "Commercial Printing & Business Solutions"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "दुकानों, कंपनियों, स्कूलों और कोचिंग सेंटरों के लिए संपूर्ण स्टेशनरी, थोक बिल बुक, फ्लेक्स बोर्ड और कस्टम वेबसाइट विकास।"
              : "End-to-end commercial printing, corporate stationery, wholesale carbonless invoicing, and custom websites tailored for local businesses in Bihar."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/request-quote"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 transition-transform hover:scale-105"
            >
              {currentLang === "hi" ? "थोक कोटेशन मांगें" : "Request Bulk Quote"}
            </Link>
            <a
              href={getWhatsAppLink("Hello Palak Enterprises, I am inquiring about corporate / business printing solutions.")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-xs sm:text-sm font-bold text-white transition-colors"
            >
              Talk to B2B Team
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-6 space-y-14">
        {/* Industry Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {businessSolutions.map((sol, idx) => {
            const Icon = sol.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#123B70] flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 text-[10px] font-bold">
                      {sol.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {currentLang === "hi" ? sol.titleHi : sol.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {currentLang === "hi" ? sol.descHi : sol.descEn}
                  </p>
                </div>

                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline pt-2 border-t border-slate-100"
                >
                  <span>{currentLang === "hi" ? "पैकेज कोटेशन लें →" : "Get Package Estimate →"}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Featured Business Products */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {currentLang === "hi" ? "स्टेशनरी व प्रचार उत्पाद" : "Office & Promotional Printing"}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {currentLang === "hi" ? "व्यवसायों के लिए आवश्यक उत्पाद" : "Essential Business Printing Items"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {businessProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>

        {/* Website Development Spotlight Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
              <Globe className="h-3.5 w-3.5" />
              <span>Digital Transformation</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {currentLang === "hi" ? "अपनी दुकान या संस्थान की वेबसाइट बनवाएं" : "Get a Modern Website for Your Business"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentLang === "hi"
                ? "चकिया और बिहार के व्यापारियों, स्कूलों और क्लिनिकों के लिए तेज़, मोबाइल-फ्रेंडली और गूगल सर्च पर दिखने वाली वेबसाइट्स। डोमेन, होस्टिंग और सपोर्ट सब एक साथ।"
                : "Fast, elegant, mobile-first web development with WhatsApp integration, online inquiries, and local Google Maps optimization for local enterprises."}
            </p>

            <div className="space-y-2 text-xs text-slate-700 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>100% Mobile Friendly & Ultra-Fast Loading</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Instant WhatsApp Lead Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Free Domain, Hosting & Local Support Setup</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-2 rounded-xl bg-[#123B70] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all"
              >
                <span>{currentLang === "hi" ? "वेबसाइट डेवलपमेंट कोटेशन" : "Request Web Dev Quote"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-linear-to-br from-blue-900 to-slate-900 p-6 text-white space-y-4 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Starter Web Package</div>
            <div className="text-3xl font-black">₹4,999 <span className="text-xs font-normal text-slate-300">all-inclusive</span></div>
            <ul className="text-xs text-slate-300 space-y-2 divide-y divide-slate-800">
              <li className="pt-2">Custom .in or .com Domain Name</li>
              <li className="pt-2">Up to 5 Responsive Pages</li>
              <li className="pt-2">Product/Service Showcase Catalog</li>
              <li className="pt-2">Direct WhatsApp & Call Click Buttons</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
