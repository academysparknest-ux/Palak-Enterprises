import React from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig, business } from "../config/business";
import {
  Printer,
  Globe,
  MapPin,
  Phone,
  ShieldCheck,
  Award,
  UserCheck,
  Building,
} from "lucide-react";
import { cn } from "../lib/utils";

export const AboutPage: React.FC = () => {
  const { lang, language, t } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "About Palak Enterprises & Palak Printing Press | Chakia",
          hi: "हमारे बारे में | पालक इंटरप्राइजेज एवं पालक प्रिंटिंग प्रेस चकिया",
        }}
        description={{
          en: "Learn about Palak Enterprises and Palak Printing Press in Chakia, East Champaran, Bihar. Proprietor Kumar Pankaj, registered CSC center and printing studio.",
          hi: "पालक इंटरप्राइजेज और पालक प्रिंटिंग प्रेस चकिया, पूर्वी चंपारण। प्रोपराइटर कुमार पंकज के नेतृत्व में प्रिंटिंग व ऑनलाइन सेवा केंद्र।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "About Us", hi: "हमारे बारे में" }, path: "/about" },
        ]}
        badge={{
          en: "Local Business Story & Leadership",
          hi: "संस्थान परिचय एवं नेतृत्व",
        }}
        title={{
          en: "About Palak Enterprises & Palak Printing Press",
          hi: "पालक इंटरप्राइजेज एवं पालक प्रिंटिंग प्रेस का परिचय",
        }}
        subtitle={{
          en: "A trusted local center in Chakia combining professional printing craftsmanship with accessible digital and online service assistance.",
          hi: "चकिया में बेहतरीन प्रिंटिंग तकनीक और सरल ऑनलाइन नागरिक सहायता का संगम।",
        }}
        primaryCta={{
          label: { en: "Contact Us", hi: "संपर्क करें" },
          to: "/contact",
        }}
        secondaryCta={{
          label: { en: "View All Services", hi: "सभी सेवाएँ देखें" },
          to: "/services",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Narrative Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Story Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="inline-flex items-center space-x-2 bg-red-50 border border-red-200 px-3.5 py-1 rounded-full text-xs font-bold text-brandred uppercase">
                <Building className="w-4 h-4" />
                <span>{currentLang === "hi" ? "संस्थान की भूमिका" : "Business Overview"}</span>
              </div>

              <h2
                className={cn(
                  "text-2xl sm:text-3xl font-black text-slate-900 leading-tight",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {t.about.title}
              </h2>

              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                {t.about.p1}
              </p>

              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                {t.about.p2}
              </p>

              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                {t.about.p3}
              </p>

              {/* Verified Badges */}
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-navy" />
                  {t.about.badge1}
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-brandred" />
                  {t.about.badge2}
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs flex items-center">
                  <UserCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  {t.about.badge3}
                </span>
              </div>
            </div>

            {/* The Two Pillars Card */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pillar 1: Printing Press */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-navy flex items-center justify-center mb-4">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{business.unit[currentLang]}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {currentLang === "hi"
                      ? "दस्तावेज़ फोटोकॉपी, रंगीन प्रिंट, 5 मिनट में स्टूडियो पासपोर्ट फोटो, लैमिनेशन, पीवीसी स्मार्ट आईडी कार्ड, शादी-तिलक निमंत्रण कार्ड, बिल बुक और प्रचार फ्लेक्स बैनर का उच्च-गुणवत्ता मुद्रण केंद्र।"
                      : "The printing wing dedicated to fast black & white and vibrant color printing, 5-minute instant passport photos, lamination, wedding invitation cards, visiting cards, and outdoor banners."}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <Link
                    to="/printing"
                    className="text-xs font-bold text-navy hover:text-brandred flex items-center space-x-1"
                  >
                    <span>{currentLang === "hi" ? "प्रिंटिंग सेवाएँ देखें →" : "View Printing Services →"}</span>
                  </Link>
                </div>
              </div>

              {/* Pillar 2: Online Service Center */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {currentLang === "hi" ? "ऑनलाइन सेवा केंद्र" : "Online Service Center"}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {currentLang === "hi"
                      ? "सरकारी नौकरी फॉर्म, प्रवेश परीक्षा, जाति-आय-निवास प्रमाण पत्र, ई-श्रम, आधार प्रिंट, पेंशन योजनाएँ और स्थानीय व्यवसायों के लिए आधुनिक वेबसाइट निर्माण में समर्पित मार्गदर्शन।"
                      : "The digital facilitation desk assisting citizens with online job forms, RTPS certificate filings, pension applications, Aadhaar prints, and custom bilingual website development."}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <Link
                    to="/online-services"
                    className="text-xs font-bold text-navy hover:text-brandred flex items-center space-x-1"
                  >
                    <span>{currentLang === "hi" ? "ऑनलाइन सेवाएँ देखें →" : "View Online Services →"}</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Our Core Approach */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-raised space-y-6">
              <div>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  {currentLang === "hi" ? "हमारा दृष्टिकोण" : "Our Principles"}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-3">
                  {currentLang === "hi" ? "हमारी कार्यशैली व मूल्य" : "How We Serve Our Community"}
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: { en: "Simplicity & Patience", hi: "सरलता एवं धैर्य" },
                    desc: {
                      en: "We patiently guide elders, students, and first-time users through complex forms and printing choices.",
                      hi: "वरिष्ठ नागरिकों और विद्यार्थियों को धैर्यपूर्वक पूरी प्रक्रिया समझाई जाती है।",
                    },
                  },
                  {
                    title: { en: "Convenience & Speed", hi: "सुविधा एवं गति" },
                    desc: {
                      en: "WhatsApp document submission and instant 5-minute passport photos save your precious time.",
                      hi: "व्हाट्सएप पर पहले डॉक्यूमेंट भेजकर समय बचाने की सुविधा एवं त्वरित डिलीवरी।",
                    },
                  },
                  {
                    title: { en: "Professional Quality", hi: "प्रोफेशनल गुणवत्ता" },
                    desc: {
                      en: "Accurate form submissions, sharp text, and durable paper materials for all orders.",
                      hi: "त्रुटिहीन फॉर्म भरना, गहरा साफ़ प्रिंट और टिकाऊ कागज़ का उपयोग।",
                    },
                  },
                  {
                    title: { en: "Local Accessibility", hi: "सहज स्थानीय उपलब्धता" },
                    desc: {
                      en: "Centrally located near Block Gate, Saniganj Mohalla, Chakia, easily accessible to all.",
                      hi: "ब्लॉक गेट चकिया के बिल्कुल पास, ताकि किसी को दूर न भटकना पड़े।",
                    },
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <h4 className="font-bold text-white text-base mb-1">{item.title[currentLang]}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.desc[currentLang]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Leadership Profile & Registrations */}
          <div className="lg:col-span-4 space-y-6">
            {/* Proprietor Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
              <div className="flex items-center space-x-4 pb-5 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                  P
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{businessConfig.owner.name[currentLang]}</h3>
                  <p className="text-xs font-bold text-brandred uppercase tracking-wider">
                    {businessConfig.owner.title[currentLang]}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{business.name[currentLang]}</p>
                </div>
              </div>

              {/* Official Registrations */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {currentLang === "hi" ? "वैध पंजीकरण विवरण" : "Official Registrations"}
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">CSC ID:</span>
                    <strong className="text-slate-900">{business.registrations.cscId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Udyam No:</span>
                    <strong className="text-slate-900">{business.registrations.udyamNo}</strong>
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-brandred shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">{currentLang === "hi" ? "स्थान एवं पता" : "Center Address"}:</strong>
                    <span className="text-slate-700 text-sm leading-relaxed block mt-0.5">
                      {businessConfig.address.fullAddress[currentLang]}
                    </span>
                    <span className="text-xs text-brandred font-semibold block mt-1">
                      {currentLang === "hi" ? "पहचान: " : "Landmark: "}{businessConfig.address.landmark[currentLang]}
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Phone className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900">{currentLang === "hi" ? "संपर्क फोन" : "Contact Phone"}:</strong>
                    <div className="flex flex-col font-mono text-slate-900 font-bold">
                      <a href={`tel:${businessConfig.phoneNumbers.primary}`} className="hover:underline">
                        {businessConfig.phoneNumbers.displayPrimary}
                      </a>
                      <a href={`tel:${businessConfig.phoneNumbers.secondary}`} className="hover:underline">
                        {businessConfig.phoneNumbers.displaySecondary}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/contact"
                  className="w-full py-3 px-4 rounded-xl bg-navy text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs hover:bg-navy/90 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{currentLang === "hi" ? "पूरा संपर्क एवं मैप देखें" : "View Map & Contact Details"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
