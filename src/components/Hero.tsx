import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  ShieldCheck,
  Sparkles,
  CreditCard,
  FileUp,
  Zap,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface HeroProps {
  onOpenRequestModal?: (serviceId?: string, paymentMethod?: "pay_online" | "pay_at_shop") => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <section className="relative overflow-hidden bg-[#123B70] text-white flex flex-col justify-center min-h-fit lg:min-h-[clamp(560px,72vh,700px)] pt-6 sm:pt-8 pb-10 sm:pb-14 border-b border-line">
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
            "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
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
                  ? "चकिया, बिहार का भरोसेमंद डिजिटल प्रिंटिंग केंद्र"
                  : "Trusted Local Digital Printing Platform in Chakia"}
              </span>
            </div>

            {/* Brand Heading */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-black tracking-tight leading-tight text-white">
                Palak Enterprises
              </h1>
            </div>

            {/* Brand Tagline */}
            <p className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              {currentLang === "hi" ? "प्रिंट। अपलोड। कलेक्ट।" : "Print. Upload. Collect."}
            </p>

            {/* Supporting Text */}
            <p className="text-xs sm:text-sm md:text-base text-slate-200 font-normal leading-relaxed max-w-xl">
              {currentLang === "hi"
                ? "चकिया में तेज़ प्रिंटिंग एवं डिजिटल सेवाएँ। अपने दस्तावेज़ अपलोड करें, ऑर्डर दें और तैयार होने पर दुकान से प्राप्त करें।"
                : "Fast printing and digital services in Chakia. Upload your documents, place your order, and collect when it's ready."}
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              {/* Primary CTA: Upload & Print */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenRequestModal) {
                    onOpenRequestModal(undefined, "pay_online");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-black text-slate-950 shadow-md shadow-amber-400/20 ring-1 ring-amber-300/60 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                aria-label={currentLang === "hi" ? "दस्तावेज अपलोड और प्रिंट करें" : "Upload and Print Documents"}
              >
                <Zap className="h-4 w-4 fill-slate-950 text-slate-950 shrink-0" />
                <span>{currentLang === "hi" ? "अपलोड व प्रिंट" : "Upload & Print"}</span>
              </button>

              {/* Secondary CTA: Explore Services */}
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer backdrop-blur-xs shrink-0"
              >
                <span>{currentLang === "hi" ? "सेवाएँ देखें" : "Explore Services"}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Compact Trust Strip */}
            <div className="pt-3.5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-200">
              <div className="flex items-center gap-1.5 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10">
                <span className="text-amber-400 font-bold">⚡</span>
                <span className="font-semibold truncate">{currentLang === "hi" ? "त्वरित सेवा" : "Quick Service"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10">
                <span className="text-sky-300 font-bold">📄</span>
                <span className="font-semibold truncate">{currentLang === "hi" ? "अपलोड दस्तावेज़" : "Upload Documents"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10">
                <span className="text-emerald-400 font-bold">💳</span>
                <span className="font-semibold truncate">{currentLang === "hi" ? "ऑनलाइन भुगतान" : "Online Payment"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 py-1.5 px-2 rounded-lg border border-white/10">
                <span className="text-amber-300 font-bold">🏪</span>
                <span className="font-semibold truncate">{currentLang === "hi" ? "शॉप पिकअप" : "Shop Pickup"}</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: Quick Print Workflow Panel (48%)
             ========================================================================= */}
          <div className="relative">
            <div className="relative rounded-2xl bg-white/[0.08] p-4 sm:p-5 border border-white/15 backdrop-blur-md shadow-card space-y-3">
              
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
                  {currentLang === "hi" ? "भेजें • चुनें • प्राप्त करें" : "Send • Choose • Collect"}
                </h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                  {currentLang === "hi"
                    ? "दुकान आने से पहले अपना दस्तावेज भेजें। हम आपका प्रिंट तैयार रखेंगे ताकि आपको कम इंतजार करना पड़े।"
                    : "Send your document before visiting the shop. We'll prepare your print so you spend less time waiting."}
                </p>
              </div>

              {/* Process Steps (1 Send → 2 Choose → 3 Print → 4 Collect) */}
              <div className="grid grid-cols-4 items-center gap-1 py-1.5 px-2 rounded-lg bg-slate-950/40 border border-white/10 text-[10px] text-slate-300 font-semibold text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">1</span>
                  <span className="truncate">{currentLang === "hi" ? "भेजें" : "Send"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">2</span>
                  <span className="truncate">{currentLang === "hi" ? "चुनें" : "Choose"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">3</span>
                  <span className="truncate">{currentLang === "hi" ? "भुगतान" : "Pay"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">4</span>
                  <span className="truncate">{currentLang === "hi" ? "प्राप्त करें" : "Collect"}</span>
                </div>
              </div>

              {/* Payment Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* Card 1: 💳 PAY ONLINE */}
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
                      {currentLang === "hi" ? "💳 ऑनलाइन भुगतान" : "💳 PAY ONLINE"}
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-300 mt-0.5 leading-tight">
                      {currentLang === "hi" ? "अभी भुगतान करें और लाइन से बचें।" : "Pay now & skip the queue."}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "दस्तावेज अपलोड करें, विकल्प चुनें, ऑनलाइन भुगतान करें और तैयार प्रिंट पाएं।"
                        : "Upload your document, choose your printing options, pay online, and collect your ready print."}
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

                {/* Card 2: 📄 SEND DOCUMENT */}
                <div className="rounded-xl bg-slate-900/80 border border-amber-400/40 p-3 transition-all duration-200 hover:border-amber-400 hover:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-7 w-7 rounded-md bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 tracking-wider">
                        {currentLang === "hi" ? "पिकअप पर भुगतान" : "PAY ON PICKUP"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      {currentLang === "hi" ? "📄 दस्तावेज भेजें" : "📄 SEND DOCUMENT"}
                    </div>
                    <p className="text-[11px] font-semibold text-amber-300 mt-0.5 leading-tight">
                      {currentLang === "hi" ? "फाइल अभी भेजें और दुकान पर भुगतान करें।" : "Send your file now & pay at the shop."}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "दुकान आने से पहले दस्तावेज व आवश्यकताएं भेजें। हम तैयार करेंगे, भुगतान लेने पर करें।"
                        : "Upload your document and printing requirements before visiting. We'll prepare it, and you can pay when you collect it."}
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
                      <span>{currentLang === "hi" ? "फाइल भेजें" : "Send File"}</span>
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
