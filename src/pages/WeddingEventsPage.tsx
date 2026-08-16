import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { ProductCard } from "../components/ProductCard";
import { PalakDataStore } from "../lib/storage/store";
import { getWhatsAppLink } from "../config/business";

export const WeddingEventsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const weddingProduct = PalakDataStore.getProductBySlug("wedding-invitations");

  const collections = [
    {
      titleEn: "Royal Gold Leaf & Screen Print Cards",
      titleHi: "रॉयल गोल्ड लीफ व स्क्रीन प्रिंट शादी कार्ड",
      descEn: "Traditional Sanskrit shlokas, Ganesha motifs, laser cuts, and golden foil embossing with matching envelopes.",
      descHi: "श्री गणेशाय नमः, मांगलिक श्लोक, सुनहरे अक्षर और लेज़र कटिंग युक्त पारंपरिक शादी निमंत्रण पत्र।",
      price: "From ₹12/card",
      emoji: "🪔",
    },
    {
      titleEn: "Tilak, Mundan & Janeu Ceremony Cards",
      titleHi: "तिलक, मुंडन एवं जनेऊ संस्कार कार्ड",
      descEn: "Specialized ceremonial cards for Shubha Tilak, Mundan sanskar, Upanayana, Griha Pravesh & family pujas.",
      descHi: "शुभ तिलक, मुंडन, जनेऊ संस्कार, गृह प्रवेश और सत्यनारायण पूजा के आकर्षक निमंत्रण पत्र।",
      price: "From ₹8/card",
      emoji: "🙏",
    },
    {
      titleEn: "Birthday & Anniversary Party Invitations",
      titleHi: "जन्मदिन एवं वैवाहिक वर्षगांठ आमंत्रण",
      descEn: "Vibrant photo-printed personalized birthday invitations with cartoon themes, glitter cards & digital formats.",
      descHi: "बच्चों के जन्मदिन के लिए कार्टून थीम, फोटो प्रिंटेड और डिजिटल इनविटेशन कार्ड।",
      price: "From ₹6/card",
      emoji: "🎂",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-[#123B70] via-[#1E293B] to-[#7F1D1D] text-white py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Wedding & Events</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1 text-xs font-bold">
            <Sparkles className="h-4 w-4" />
            <span>Mangalik & Ceremony Printing</span>
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "शाही शादी एवं मांगलिक निमंत्रण पत्र" : "Royal Wedding & Celebration Invitation Cards"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "शुभ विवाह, तिलक, मुंडन, जन्मदिन और गृह प्रवेश के लिए 500+ से अधिक सुंदर डिज़ाइनों में कार्ड प्रिंटिंग। हिंदी एवं संस्कृत श्लोक सहित।"
              : "Exquisite designer wedding stationery, Tilak invitations, Mundan cards, gold-foil stamping, and bespoke Sanskrit shlokas for your sacred milestones."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/printing/wedding-invitations"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-xs sm:text-sm font-extrabold text-slate-950 transition-transform hover:scale-105"
            >
              {currentLang === "hi" ? "शादी कार्ड कस्टमाइज़ करें" : "Configure Wedding Cards"}
            </Link>
            <a
              href={getWhatsAppLink("Hello Palak, I want to see wedding card samples and designs.")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-xs sm:text-sm font-bold text-white transition-colors"
            >
              Request Sample Catalog on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-6 space-y-12">
        {/* Ceremonial Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {collections.map((col, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-4"
            >
              <div>
                <div className="text-3xl mb-3">{col.emoji}</div>
                <div className="inline-block rounded-full bg-rose-50 text-rose-800 border border-rose-200/60 px-2.5 py-0.5 text-[11px] font-bold mb-2">
                  {col.price}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {currentLang === "hi" ? col.titleHi : col.titleEn}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {currentLang === "hi" ? col.descHi : col.descEn}
                </p>
              </div>

              <Link
                to="/printing/wedding-invitations"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline pt-2 border-t border-slate-100"
              >
                <span>{currentLang === "hi" ? "डिज़ाइन देखें व ऑर्डर करें →" : "View Collection & Order →"}</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Featured Wedding Product Card */}
        {weddingProduct && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {currentLang === "hi" ? "लोकप्रिय शादी कार्ड पैकेज" : "Featured Wedding Card Package"}
            </h2>
            <div className="max-w-md">
              <ProductCard product={weddingProduct} />
            </div>
          </div>
        )}

        {/* In-store Sample Room Reassurance */}
        <div className="rounded-3xl border border-rose-200 bg-linear-to-br from-rose-50/70 via-white to-amber-50/50 p-6 sm:p-10 text-center space-y-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Chakia Walk-in Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 max-w-xl mx-auto">
            {currentLang === "hi" ? "दुकान पर पधारकर 500+ कार्ड सैंपल देखें" : "Visit Our Store to Browse 500+ Physical Samples"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {currentLang === "hi"
              ? "हमारे चकिया स्टोर (ब्लॉक गेट के पास) पर पधारें, कार्ड का पेपर और फॉयल छूकर देखें और अपने परिवार के साथ बैठकर मनपसंद डिज़ाइन फाइनल करें।"
              : "Feel the paper textures, inspect gold-foil finishes, and sit with our typographer to draft Sanskrit/Hindi shlokas with your family."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <a
              href={getWhatsAppLink("Hello Palak, I am planning to visit for wedding cards.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#123B70] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all"
            >
              <span>Book In-Store Visit</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeddingEventsPage;
