import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Printer, Globe, Search, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface HeroProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const Hero: React.FC<HeroProps> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <section className="relative overflow-hidden bg-[#123B70] text-white">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 80%, #0284C7 0, transparent 50%)",
        }}
      />

      {/* Subtle geometric dot grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Main Brand & Hero Text Column */}
          <div>
            {/* Verified Local Business Pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-white/20 mb-6 backdrop-blur-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>
                {currentLang === "hi"
                  ? "चकिया, पूर्वी चंपारण का विश्वसनीय सेवा केंद्र"
                  : "Trusted Local Printing & CSC Hub in Chakia, Bihar"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
              {currentLang === "hi" ? (
                <>
                  प्रिंट। आवेदन। निर्माण। <span className="text-amber-400">काम पूरा।</span>
                </>
              ) : (
                <>
                  Print. Apply. Create. <span className="text-amber-400">Get It Done.</span>
                </>
              )}
            </h1>

            {/* Supporting Subtitle */}
            <p className="mt-5 max-w-xl text-base text-slate-200 sm:text-lg leading-relaxed font-normal">
              {currentLang === "hi"
                ? "प्रोफेशनल प्रिंटिंग, डिजिटल सेवाएँ, ऑनलाइन सरकारी आवेदन एवं व्यावसायिक समाधान — आपके स्थानीय भरोसेमंद सेवा साथी द्वारा।"
                : "Professional printing, digital services, online applications and business solutions — all from your trusted local service partner."}
            </p>

            {/* 3 Major CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                to="/digital-services"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 sm:px-6 py-3.5 text-sm sm:text-base font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Globe className="h-4 w-4 text-slate-950" />
                <span>{currentLang === "hi" ? "सेवा शुरू करें" : "START A SERVICE"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/printing"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 px-5 sm:px-6 py-3.5 text-sm sm:text-base font-bold text-white transition-all hover:scale-[1.02] cursor-pointer backdrop-blur-xs"
              >
                <Printer className="h-4 w-4 text-amber-300" />
                <span>{currentLang === "hi" ? "प्रिंटिंग ऑर्डर करें" : "ORDER PRINTING"}</span>
              </Link>

              <Link
                to="/track-order"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 px-4 py-3.5 text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "TRACK ORDER"}</span>
              </Link>
            </div>

            {/* Trust checkmarks list */}
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{currentLang === "hi" ? "उसी दिन डिलीवरी" : "Same Day Delivery"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{currentLang === "hi" ? "उच्च गुणवत्ता प्रिंटिंग" : "HD Offset & Digital"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{currentLang === "hi" ? "अधिकृत CSC केंद्र" : "Govt CSC & RTPS"}</span>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase Card */}
          <div className="relative">
            <div className="relative rounded-2xl bg-white/10 p-5 sm:p-6 border border-white/20 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Chakia Hub</span>
                </span>
              </div>

              {/* Showcase Grid of 4 Fast Lanes */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/printing/visiting-cards"
                  className="rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 p-3.5 transition-all group flex flex-col justify-between"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📇</div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      {currentLang === "hi" ? "विजिटिंग कार्ड" : "Visiting Cards"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">₹199 से शुरू</div>
                  </div>
                </Link>

                <Link
                  to="/digital-services/pan"
                  className="rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 p-3.5 transition-all group flex flex-col justify-between"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💳</div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      {currentLang === "hi" ? "पैन कार्ड आवेदन" : "PAN Card Services"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ई-पैन 3 दिन में</div>
                  </div>
                </Link>

                <Link
                  to="/printing/flex-banners"
                  className="rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 p-3.5 transition-all group flex flex-col justify-between"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🚩</div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      {currentLang === "hi" ? "फ्लेक्स बैनर" : "Flex Banners"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">वेदरप्रूफ आउटडोर</div>
                  </div>
                </Link>

                <Link
                  to="/wedding-events"
                  className="rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 p-3.5 transition-all group flex flex-col justify-between"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💌</div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      {currentLang === "hi" ? "शादी एवं निमंत्रण" : "Wedding Cards"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">गोल्ड फॉयल डिजाइन</div>
                  </div>
                </Link>
              </div>

              {/* Call to direct action footer */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-300">
                <span className="truncate">Block Gate, Chakia, Bihar</span>
                <span className="font-bold text-amber-300 shrink-0">Open Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
