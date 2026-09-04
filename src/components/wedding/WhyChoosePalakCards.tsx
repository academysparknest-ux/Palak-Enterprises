import React from "react";
import { Sparkles, ShieldCheck, Printer, Users, Eye, MapPin } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getWhatsAppLink, businessConfig } from "../../config/business";

export const WhyChoosePalakCards: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const trustPoints = [
    {
      icon: Sparkles,
      titleEn: "Personalized Sanskrit & Hindi Shlokas",
      titleHi: "शुद्ध हिंदी एवं संस्कृत श्लोक ड्राफ्टिंग",
      descEn: "Our typographers assist your family in drafting auspicious Ganapati Vandana, Kuldevta shlokas, and poetic Hindi/English invitation verses.",
      descHi: "हमारे अनुभवी टाइपिस्ट आपके परिवार के साथ बैठकर शुद्ध श्लोक, कुलदेवता स्तुति और सुंदर काव्यात्मक आमंत्रण पंक्तियाँ तैयार करते हैं।",
    },
    {
      icon: Printer,
      titleEn: "In-House Precision Printing in Chakia",
      titleHi: "चकिया में इन-हाउस स्क्रीन व फॉयल प्रेस",
      descEn: "No middleman delays. We execute screen printing, gold leaf hot foil stamping, and digital multi-color production directly on our machines.",
      descHi: "बिना किसी बिचौलिए या बाहरी देरी के। स्क्रीन प्रिंटिंग, गोल्डन फॉयल एम्बॉसिंग एवं डिजिटल प्रिंटिंग हमारे चकिया स्थित प्रेस में ही होती है।",
    },
    {
      icon: Eye,
      titleEn: "500+ Walk-In Physical Samples",
      titleHi: "दुकान पर 500+ फिजिकल सैंपल देखकर चुनें",
      descEn: "Visit our showroom near Block Gate, Chakia to touch the luxury velvet, inspect shimmer papers, and test envelope weights in person.",
      descHi: "ब्लॉक गेट के पास हमारी दुकान पर पधारें, पेपर की मोटाई, फॉयल की चमक छूकर देखें और अपने परिवार के साथ बैठकर मनपसंद कार्ड फाइनल करें।",
    },
    {
      icon: Users,
      titleEn: "Flexible Quantities & Fast Turnaround",
      titleHi: "लचीली संख्या (50 से 1,000+ कार्ड) एवं त्वरित डिलीवरी",
      descEn: "Whether you need 50 cards for an intimate family Griha Pravesh or 1,000+ cards for a grand wedding, we fulfill orders in 24 to 72 hours.",
      descHi: "छोटे पारिवारिक पूजा के लिए 50 कार्ड हों या भव्य विवाह के लिए 1,000+ कार्ड, हम 24 से 72 घंटों में समय पर आपूर्ति सुनिश्चित करते हैं।",
    },
  ];

  const storeVisitUrl = getWhatsAppLink("Hello Palak Enterprises, I would like to visit your Chakia store to view wedding card samples.");

  return (
    <section className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-rose-50/30 p-6 sm:p-10 lg:p-12 shadow-xs space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#881337] inline-flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{currentLang === "hi" ? "पालक की विश्वसनीयता" : "Why Choose Palak Enterprises"}</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentLang === "hi"
            ? "परंपरा, गुणवत्ता एवं स्थानीय भरोसे का संगम"
            : "Tradition, Craftsmanship & Local Trust"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          {currentLang === "hi"
            ? "पूर्वी चंपारण में हजारों परिवारों के मांगलिक आयोजनों को सुंदर और अविस्मरणीय बनाने का अनुभव।"
            : "Helping thousands of families across East Champaran create cherished invitation memories with transparent pricing and local support."}
        </p>
      </div>

      {/* Grid of Trust Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {trustPoints.map((pt, idx) => {
          const Icon = pt.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-[#881337] flex items-center justify-center border border-amber-200">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {currentLang === "hi" ? pt.titleHi : pt.titleEn}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLang === "hi" ? pt.descHi : pt.descEn}
              </p>
            </div>
          );
        })}
      </div>

      {/* Walk-in Store Invitation Box */}
      <div className="rounded-2xl bg-[#123B70] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-amber-300 font-bold">
            <MapPin className="h-4 w-4" />
            <span>Chakia Walk-In Showroom</span>
          </div>
          <h4 className="text-lg sm:text-xl font-bold">
            {currentLang === "hi"
              ? "दुकान पर पधारकर 500+ कार्ड सैंपल छूकर देखें"
              : "Visit Our Showroom to Experience 500+ Physical Cards"}
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            {businessConfig.address.fullAddress[currentLang]}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={storeVisitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 text-xs font-bold transition-transform hover:scale-105 shadow-xs"
          >
            {currentLang === "hi" ? "स्टोर विज़िट बुक करें" : "Book Showroom Visit"}
          </a>
        </div>
      </div>
    </section>
  );
};

export default WhyChoosePalakCards;
