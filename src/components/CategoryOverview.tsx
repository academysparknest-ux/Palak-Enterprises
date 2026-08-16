import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { DynamicIcon } from "./DynamicIcon";
import { ArrowRight, Layers } from "lucide-react";
import { cn } from "../lib/utils";

interface CategoryItem {
  id: string;
  iconName: string;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  ctaText: { en: string; hi: string };
  link: string;
  badge?: { en: string; hi: string };
}

export const CategoryOverview: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const categories: CategoryItem[] = [
    {
      id: "cat-printing",
      iconName: "Printer",
      name: { en: "Printing & Photocopy", hi: "प्रिंटिंग और फोटो कॉपी" },
      description: {
        en: "Fast, clear black & white and high-volume color document printing, lamination, and binding.",
        hi: "तेज़, साफ़ ब्लैक एंड व्हाइट एवं कलर डॉक्यूमेंट प्रिंटिंग, लैमिनेशन व बाइंडिंग।",
      },
      ctaText: { en: "Explore Printing", hi: "प्रिंटिंग सेवाएँ देखें" },
      link: "/printing",
    },
    {
      id: "cat-photo-id",
      iconName: "Camera",
      name: { en: "Photo & ID Services", hi: "फोटो और आईडी सेवाएँ" },
      description: {
        en: "Instant 5-minute passport photos, student identity cards, and event invitation cards.",
        hi: "5 मिनट में तुरंत पासपोर्ट फोटो, स्टूडेंट/संस्थान आईडी कार्ड एवं आमंत्रण पत्र।",
      },
      ctaText: { en: "Explore Photo & ID", hi: "फोटो व आईडी सेवाएँ" },
      link: "/printing#photo-id",
    },
    {
      id: "cat-online-services",
      iconName: "Globe",
      name: { en: "Online Services", hi: "ऑनलाइन सेवा सहायता" },
      description: {
        en: "Guidance for job applications, exams, pension schemes, Aadhaar, Ayushman, and certificates.",
        hi: "नौकरी फॉर्म, परीक्षा आवेदन, पेंशन योजना, आधार व प्रमाण पत्र में सहायता।",
      },
      ctaText: { en: "Explore Online Services", hi: "ऑनलाइन सेवाएँ देखें" },
      link: "/online-services",
      badge: { en: "Assistance", hi: "सहायता केंद्र" },
    },
    {
      id: "cat-business",
      iconName: "Briefcase",
      name: { en: "Business Printing", hi: "बिजनेस प्रिंटिंग" },
      description: {
        en: "Visiting cards, duplicate bill books, letterheads, envelopes, and heavy-duty flex banners.",
        hi: "विजिटिंग कार्ड, बिल बुक, लेटरपैड, लिफाफे और दुकान प्रचार फ्लेक्स बैनर।",
      },
      ctaText: { en: "Explore Business Printing", hi: "बिजनेस प्रिंटिंग देखें" },
      link: "/business",
    },
    {
      id: "cat-documents",
      iconName: "FileCheck",
      name: { en: "Documents & Certificates", hi: "दस्तावेज़ और प्रमाण पत्र" },
      description: {
        en: "Caste, income, residence certificate applications, document scans, and PVC plastic cards.",
        hi: "जाति, आय, निवास प्रमाण पत्र फॉर्म, डॉक्यूमेंट स्कैन व पीवीसी स्मार्ट कार्ड।",
      },
      ctaText: { en: "Explore Documents", hi: "दस्तावेज़ सेवाएँ देखें" },
      link: "/online-services#certificates",
    },
    {
      id: "cat-webdev",
      iconName: "Code2",
      name: { en: "Website Development", hi: "वेबसाइट डेवलपमेंट" },
      description: {
        en: "Custom, bilingual websites for schools, coaching institutes, local shops, and companies.",
        hi: "स्कूल, कोचिंग, दुकानों और स्थानीय व्यवसायों के लिए आधुनिक द्विभाषी वेबसाइट।",
      },
      ctaText: { en: "Build a Website", hi: "वेबसाइट बनवाएँ" },
      link: "/website-development",
      badge: { en: "Modern Tech", hi: "आधुनिक तकनीक" },
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-navy bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>{currentLang === "hi" ? "सेवा श्रेणियाँ" : "Service Overview"}</span>
          </div>
          <h2
            className={cn(
              "text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi" ? "हमारी मुख्य सेवा श्रेणियाँ" : "Explore What We Offer"}
          </h2>
          <p
            className={cn(
              "text-slate-600 mt-2 text-sm sm:text-base",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi"
              ? "प्रत्येक श्रेणी के लिए समर्पित पेज पर विस्तृत जानकारी और सुविधा उपलब्ध है।"
              : "Dedicated sections designed to help you quickly find the exact service you need."}
          </p>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:bg-white hover:shadow-lg hover:border-navy/30 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-colors shadow-xs">
                    <DynamicIcon name={cat.iconName} className="w-6 h-6" />
                  </div>
                  {cat.badge && (
                    <span className="text-[11px] font-bold text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                      {cat.badge[currentLang]}
                    </span>
                  )}
                </div>

                <h3
                  className={cn(
                    "text-xl font-bold text-slate-900 group-hover:text-navy transition-colors",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {cat.name[currentLang]}
                </h3>

                <p
                  className={cn(
                    "text-slate-600 text-sm mt-2.5 leading-relaxed",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {cat.description[currentLang]}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80">
                <Link
                  to={cat.link}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-bold text-navy group-hover:text-brandred transition-colors",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <span>{cat.ctaText[currentLang]}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryOverview;
