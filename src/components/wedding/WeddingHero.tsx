import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, MessageSquare, ArrowDown, ShieldCheck, Award, MapPin, Printer } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getWhatsAppLink } from "../../config/business";

interface WeddingHeroProps {
  onBrowseClick: () => void;
  onOpenCustomQuote?: () => void;
}

export const WeddingHero: React.FC<WeddingHeroProps> = ({ onBrowseClick, onOpenCustomQuote }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const whatsappInquiryUrl = getWhatsAppLink(
    "Hello Palak Enterprises, I am browsing your Wedding & Events Invitation Catalogue and would like to enquire about card designs, pricing, and printing options."
  );

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] via-[#F5EFEB] to-[#FCFBF7] border-b border-[#E8E1D5] py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      {/* Subtle royal background decorative ornaments */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 rounded-full bg-rose-200/20 blur-3xl pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-[#881337] transition-colors">
            {currentLang === "hi" ? "होम" : "Home"}
          </Link>
          <span>/</span>
          <span className="text-[#881337] font-bold">
            {currentLang === "hi" ? "शादी एवं मांगलिक कार्ड" : "Wedding & Events Catalogue"}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300/80 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span>
                {currentLang === "hi"
                  ? "शाही शादी, तिलक, मुंडन एवं मांगलिक निमंत्रण पत्र"
                  : "Royal Wedding & Celebration Invitation Showroom"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
              {currentLang === "hi" ? (
                <>
                  मांगलिक पलों के लिए <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#881337] via-[#B45309] to-[#9F1239]">
                    शाही एवं सुंदर निमंत्रण
                  </span>
                </>
              ) : (
                <>
                  Beautiful Invitations for <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#881337] via-[#B45309] to-[#9F1239]">
                    Beautiful Moments
                  </span>
                </>
              )}
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl font-normal">
              {currentLang === "hi"
                ? "शुभ विवाह, तिलक, मुंडन, सगाई और गृह प्रवेश के लिए 500+ से अधिक आकर्षक डिज़ाइनों का डिजिटल कैटलॉग। शुद्ध हिंदी/संस्कृत श्लोक, गोल्डन फॉयल एम्बॉसिंग, लेज़र कटिंग एवं चकिया में इन-हाउस स्क्रीन व डिजिटल प्रिंटिंग।"
                : "Explore Palak Enterprises' curated showroom of royal wedding cards, sacred Tilak & Mundan stationery, laser-cut floral invitations, and custom luxury box suites with bespoke Sanskrit shlokas and in-house gold foil printing in Chakia."}
            </p>

            {/* Conversion CTA Group */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onBrowseClick}
                className="inline-flex items-center gap-2 rounded-xl bg-[#881337] hover:bg-[#700f2d] text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>{currentLang === "hi" ? "कलेक्शन देखें" : "Browse Collection"}</span>
                <ArrowDown className="h-4 w-4" />
              </button>

              {onOpenCustomQuote ? (
                <button
                  type="button"
                  onClick={onOpenCustomQuote}
                  className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 px-5 py-3.5 text-xs sm:text-sm font-bold shadow-xs hover:border-[#881337] transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>{currentLang === "hi" ? "कस्टम डिज़ाइन कोटेशन" : "Request Custom Design"}</span>
                </button>
              ) : (
                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 px-5 py-3.5 text-xs sm:text-sm font-bold shadow-xs hover:border-[#881337] transition-all"
                >
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>{currentLang === "hi" ? "कस्टम डिज़ाइन कोटेशन" : "Request Custom Design"}</span>
                </Link>
              )}

              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-5 py-3.5 text-xs sm:text-sm font-bold transition-colors shadow-xs"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp Us</span>
              </a>
            </div>

            {/* Trust Micro Badges */}
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-[#881337] shrink-0" />
                <span className="font-semibold text-slate-800">
                  {currentLang === "hi" ? "चकिया में इन-हाउस प्रिंटिंग" : "In-House Press in Chakia"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {currentLang === "hi" ? "हिंदी एवं संस्कृत श्लोक प्रूफ़िंग" : "Sanskrit & Hindi Calligraphy"}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {currentLang === "hi" ? "500+ फिजिकल सैंपल स्टोर में" : "500+ Walk-in Store Samples"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showroom Collage Banner */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Premium Layered Card Display */}
              <div className="relative rounded-3xl bg-gradient-to-br from-[#881337] via-[#5b0e25] to-[#2a0808] p-5 sm:p-7 shadow-2xl border border-amber-400/40 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl" />

                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-black tracking-wider uppercase text-amber-300">
                      Palak Royal Signature Collection
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-400/20 text-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold border border-amber-400/30">
                    From ₹8 / Card
                  </span>
                </div>

                {/* Showroom Visual Card Image */}
                <div className="relative rounded-2xl bg-[#140202] border border-amber-400/30 overflow-hidden aspect-4/3 flex items-center justify-center p-2 shadow-inner">
                  <img
                    src="/images/gallery/card-royal-gold-shloka.svg"
                    alt="Royal Gold Wedding Invitation Sample"
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 left-2 right-2 rounded-xl bg-slate-950/80 backdrop-blur-md p-2 text-center text-[11px] font-semibold text-amber-200 border border-white/10">
                    {currentLang === "hi"
                      ? "गोल्ड लीफ फॉयल • कस्टमाइज़्ड श्लोक • मैचिंग लिफाफे"
                      : "Gold Leaf Foil • Custom Shlokas • Matching Envelopes"}
                  </div>
                </div>

                {/* In-Store Experience Notice */}
                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-300 block text-[11px]">Chakia Walk-in Experience</span>
                    <span className="font-bold text-white">Block Gate, Chakia (845412)</span>
                  </div>
                  <a
                    href="tel:9905238015"
                    className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs transition-colors"
                  >
                    {currentLang === "hi" ? "कॉल करें" : "Call Store"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeddingHero;
