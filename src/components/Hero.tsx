import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Printer,
  Search,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Store,
  Zap,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { AnimatedBrandHeadline } from "./AnimatedBrandHeadline";

interface HeroProps {
  onOpenRequestModal?: (serviceId?: string, paymentMethod?: "pay_online" | "pay_at_shop") => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <section className="relative overflow-hidden bg-[#123B70] text-white flex flex-col justify-center min-h-fit lg:min-h-[clamp(560px,72vh,700px)]">
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
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[52%_48%] lg:items-center">
          
          {/* =========================================================================
              LEFT COLUMN: Brand, Main Value & Actions (52%)
             ========================================================================= */}
          <div className="flex flex-col justify-center space-y-3.5 sm:space-y-4">
            {/* Small Trust Badge */}
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-300 ring-1 ring-white/20 backdrop-blur-xs shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                {currentLang === "hi"
                  ? "चकिया, बिहार का भरोसेमंद प्रिंटिंग एवं सीएससी केंद्र"
                  : "Trusted Local Printing & CSC Hub in Chakia, Bihar"}
              </span>
            </div>

            {/* Brand Heading */}
            <div>
              <AnimatedBrandHeadline
                items={
                  currentLang === "hi"
                    ? [
                        { prefix: "पलक प्रिंटिंग ", highlight: "प्रेस", full: "पलक प्रिंटिंग प्रेस" },
                        { prefix: "पलक ", highlight: "एंटरप्राइजेज", full: "पलक एंटरप्राइजेज" },
                      ]
                    : [
                        { prefix: "Palak Printing ", highlight: "Press", full: "Palak Printing Press" },
                        { prefix: "Palak ", highlight: "Enterprises", full: "Palak Enterprises" },
                      ]
                }
                isHindi={currentLang === "hi"}
                className="text-3xl sm:text-4xl lg:text-[2.65rem] xl:text-5xl font-black tracking-tight leading-tight"
              />
            </div>

            {/* Brand Tagline */}
            <p className="text-base sm:text-lg font-bold text-slate-200 tracking-tight">
              {currentLang === "hi" ? (
                <>
                  प्रिंट। आवेदन। निर्माण। <span className="text-amber-400 font-extrabold">काम पूरा।</span>
                </>
              ) : (
                <>
                  Print. Apply. Create. <span className="text-amber-400 font-extrabold">Get It Done.</span>
                </>
              )}
            </p>

            {/* Main Online Printing Message Banner */}
            <div className="rounded-xl bg-amber-400/10 border border-amber-400/30 p-3.5 sm:p-4 backdrop-blur-xs shadow-inner space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-base sm:text-lg tracking-tight">
                <Zap className="h-4 w-4 fill-amber-300 text-amber-300 shrink-0" aria-hidden="true" />
                <h2>
                  {currentLang === "hi"
                    ? "⚡ ऑनलाइन प्रिंट। लाइन से बचें।"
                    : "⚡ Print Online. Skip the Queue."}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-normal">
                {currentLang === "hi"
                  ? "अपनी फाइल अपलोड करें, विकल्प चुनें और तैयार प्रिंट प्राप्त करें।"
                  : "Upload your file, choose your options and collect your ready print."}
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5">
              {/* Primary CTA: PRINT ONLINE */}
              <Link
                to="/online-services"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-black text-slate-950 shadow-md shadow-amber-400/20 ring-1 ring-amber-300/60 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                aria-label={currentLang === "hi" ? "ऑनलाइन प्रिंट ऑर्डर करें" : "Print Online"}
              >
                <Printer className="h-4 w-4 text-slate-950 stroke-[2.5]" aria-hidden="true" />
                <span>{currentLang === "hi" ? "🖨️ ऑनलाइन प्रिंट" : "🖨️ PRINT ONLINE"}</span>
              </Link>

              {/* Secondary CTA: START A SERVICE */}
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer backdrop-blur-xs shrink-0"
              >
                <span>{currentLang === "hi" ? "सेवा शुरू करें" : "START A SERVICE"}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>

              {/* Small Track Order CTA */}
              <Link
                to="/order-status"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 sm:py-2.5 text-xs font-semibold text-slate-200 hover:text-sky-300 transition-colors shrink-0"
              >
                <Search className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>{currentLang === "hi" ? "🔎 ट्रैक ऑर्डर" : "🔎 Track Order"}</span>
              </Link>
            </div>

            {/* 3 Short Trust Indicators */}
            <div className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-[13px] text-slate-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-semibold">{currentLang === "hi" ? "ऑनलाइन प्रिंट ऑर्डरिंग" : "Online Print Ordering"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-semibold">{currentLang === "hi" ? "पिकअप के लिए तैयार" : "Ready for Pickup"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-semibold">{currentLang === "hi" ? "ऑनलाइन या दुकान पर भुगतान" : "Pay Online or at Shop"}</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Quick Print Workflow Panel (48%)
             ========================================================================= */}
          <div className="relative">
            {/* Subtle ambient glow behind card */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-sky-500/20 blur-md opacity-60 pointer-events-none" />

            <div className="relative rounded-2xl bg-white/[0.10] p-4 sm:p-5 border border-white/20 backdrop-blur-md shadow-xl space-y-3">
              
              {/* Top Header Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  <Sparkles className="h-3 w-3 text-amber-400" aria-hidden="true" />
                  <span>{currentLang === "hi" ? "⚡ त्वरित प्रिंट" : "⚡ QUICK PRINT"}</span>
                </span>
              </div>

              {/* Main Heading & Single Supporting Sentence */}
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {currentLang === "hi" ? "अपलोड • चुनें • प्राप्त करें" : "Upload • Choose • Collect"}
                </h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                  {currentLang === "hi"
                    ? "दुकान आने से पहले अपनी फाइल भेजें। हम आपके पिकअप के लिए प्रिंट तैयार रखेंगे।"
                    : "Send your file before visiting the shop. We'll prepare your print for pickup."}
                </p>
              </div>

              {/* Process Steps (1 Upload → 2 Customize → 3 Prepare → 4 Collect) */}
              <div className="grid grid-cols-4 items-center gap-1 py-1.5 px-2 rounded-lg bg-slate-950/40 border border-white/10 text-[10px] text-slate-300 font-semibold text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">1</span>
                  <span className="truncate">{currentLang === "hi" ? "अपलोड" : "Upload"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">2</span>
                  <span className="truncate">{currentLang === "hi" ? "अनुकूलन" : "Customize"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">3</span>
                  <span className="truncate">{currentLang === "hi" ? "तैयारी" : "Prepare"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">4</span>
                  <span className="truncate">{currentLang === "hi" ? "प्राप्त करें" : "Collect"}</span>
                </div>
              </div>

              {/* Payment Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* Card 1: 🟢 PAY ONLINE */}
                <div className="rounded-xl bg-slate-900/80 border border-emerald-500/40 p-3 transition-all duration-200 hover:border-emerald-400 hover:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-7 w-7 rounded-md bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                        <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider">
                        {currentLang === "hi" ? "कोई प्रतीक्षा नहीं" : "NO WAITING"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      {currentLang === "hi" ? "🟢 ऑनलाइन भुगतान" : "🟢 PAY ONLINE"}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "अभी भुगतान करें और तैयार होने पर प्राप्त करें।"
                        : "Pay now and collect when ready."}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-emerald-500/20">
                    <Link
                      to="/online-services"
                      onClick={(e) => {
                        if (onOpenRequestModal) {
                          e.preventDefault();
                          onOpenRequestModal(undefined, "pay_online");
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group cursor-pointer"
                    >
                      <span>{currentLang === "hi" ? "शुरू करें" : "Start"}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {/* Card 2: 🟡 PAY AT SHOP */}
                <div className="rounded-xl bg-slate-900/80 border border-amber-400/40 p-3 transition-all duration-200 hover:border-amber-400 hover:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-7 w-7 rounded-md bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <Store className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 tracking-wider">
                        {currentLang === "hi" ? "पिकअप पर भुगतान" : "PAY ON PICKUP"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      {currentLang === "hi" ? "🟡 दुकान पर भुगतान" : "🟡 PAY AT SHOP"}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "अभी ऑर्डर करें और लेने पर भुगतान करें।"
                        : "Order now and pay when you collect."}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-amber-400/20">
                    <Link
                      to="/online-services"
                      onClick={(e) => {
                        if (onOpenRequestModal) {
                          e.preventDefault();
                          onOpenRequestModal(undefined, "pay_at_shop");
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors group cursor-pointer"
                    >
                      <span>{currentLang === "hi" ? "शुरू करें" : "Start"}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

              </div>

              {/* Right Panel Utility: Returning Customer Track Order Link */}
              <div className="rounded-lg bg-sky-950/40 border border-sky-500/20 px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                  <Search className="h-3 w-3 text-sky-400 shrink-0" aria-hidden="true" />
                  <span>
                    {currentLang === "hi"
                      ? "क्या आपने पहले ही ऑर्डर दिया है?"
                      : "Already placed an order?"}
                  </span>
                </div>
                <Link
                  to="/order-status"
                  className="font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 group text-xs transition-colors"
                >
                  <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order"}</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
