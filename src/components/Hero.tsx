import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Search,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  FileUp,
  Zap,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { AnimatedBrandHeadline } from "./AnimatedBrandHeadline";
import { PriorityBadge, NormalQueueBadge } from "./ui/motion/Badges";

interface HeroProps {
  onOpenRequestModal?: (serviceId?: string, paymentMethod?: "pay_online" | "pay_at_shop") => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenRequestModal: _onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const navigate = useNavigate();
  const [heroTrackingId, setHeroTrackingId] = useState("");

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

      {/* Ambient Floating Stationery & Document Outlines (GPU-accelerated, ultra-slow) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Floating Sheet 1 */}
        <div
          className="absolute top-12 left-[8%] w-24 h-32 rounded-lg border border-white/10 bg-white/[0.02] shadow-sm rotate-6 hidden sm:block"
          style={{ animation: "floatSlow 11s ease-in-out infinite" }}
        >
          <div className="p-2 space-y-1 opacity-20">
            <div className="h-1.5 w-10 bg-white rounded-full" />
            <div className="h-1 w-14 bg-white/60 rounded-full" />
            <div className="h-1 w-12 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Floating Sheet 2 (Center Right) */}
        <div
          className="absolute bottom-16 right-[6%] w-28 h-36 rounded-lg border border-amber-400/15 bg-amber-400/[0.02] shadow-sm -rotate-6 hidden md:block"
          style={{ animation: "floatSlow 13s ease-in-out infinite 1.5s" }}
        >
          <div className="p-2.5 space-y-1.5 opacity-25">
            <div className="h-2 w-8 bg-amber-300 rounded-full" />
            <div className="h-1.5 w-16 bg-amber-200/50 rounded-full" />
            <div className="h-1 w-14 bg-amber-200/30 rounded-full" />
          </div>
        </div>

        {/* Floating ID Card outline */}
        <div
          className="absolute top-24 right-[42%] w-20 h-14 rounded-md border border-emerald-400/15 bg-emerald-400/[0.02] rotate-12 hidden lg:block"
          style={{ animation: "floatSlow 9s ease-in-out infinite 0.7s" }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:gap-8 xl:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          
          {/* =========================================================================
              LEFT COLUMN: Brand, Main Value & Actions (52%)
             ========================================================================= */}
          <div className="flex flex-col justify-center space-y-3.5 sm:space-y-4">
            {/* Small Trust Badge */}
            <div
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-amber-300 ring-1 ring-white/20 backdrop-blur-xs shadow-xs"
              style={{ animation: "fadeIn 400ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                {currentLang === "hi"
                  ? "चकिया, बिहार का भरोसेमंद प्रिंटिंग एवं सीएससी केंद्र"
                  : "Trusted Local Printing & CSC Hub in Chakia, Bihar"}
              </span>
            </div>

            {/* Brand Heading */}
            <div style={{ animation: "fadeUp 450ms cubic-bezier(0.22, 1, 0.36, 1) both 80ms" }}>
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
            <p
              className="text-base sm:text-lg font-bold text-slate-200 tracking-tight"
              style={{ animation: "fadeUp 450ms cubic-bezier(0.22, 1, 0.36, 1) both 140ms" }}
            >
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
            <div
              className="rounded-xl bg-amber-400/10 border border-amber-400/30 p-3.5 sm:p-4 backdrop-blur-xs shadow-inner space-y-1"
              style={{ animation: "fadeUp 450ms cubic-bezier(0.22, 1, 0.36, 1) both 180ms" }}
            >
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
            <div
              className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5"
              style={{ animation: "fadeUp 450ms cubic-bezier(0.22, 1, 0.36, 1) both 220ms" }}
            >
              {/* Primary CTA: PRINT ONLINE */}
              <Link
                to="/online-services"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-black text-slate-950 shadow-md shadow-amber-400/20 ring-1 ring-amber-300/60 active-press transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer shrink-0"
                aria-label={currentLang === "hi" ? "ऑनलाइन प्रिंट ऑर्डर करें" : "Print Online"}
              >
                <span>{currentLang === "hi" ? "🖨️ ऑनलाइन प्रिंट" : "🖨️ PRINT ONLINE"}</span>
              </Link>

              {/* Secondary CTA: START A SERVICE */}
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white active-press transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 cursor-pointer backdrop-blur-xs shrink-0 btn-hover-arrow"
              >
                <span>{currentLang === "hi" ? "सेवा शुरू करें" : "START A SERVICE"}</span>
                <ArrowRight className="h-3.5 w-3.5 btn-icon-right transition-transform duration-200" aria-hidden="true" />
              </Link>
            </div>

            {/* 3 Short Trust Indicators */}
            <div
              className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-[13px] text-slate-200"
              style={{ animation: "fadeIn 500ms cubic-bezier(0.22, 1, 0.36, 1) both 260ms" }}
            >
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
          <div
            className="relative"
            style={{ animation: "scaleIn 450ms cubic-bezier(0.22, 1, 0.36, 1) both 120ms" }}
          >
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
                  <span className="truncate">{currentLang === "hi" ? "प्रिंट" : "Print"}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-4 w-4 rounded-full bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">4</span>
                  <span className="truncate">{currentLang === "hi" ? "प्राप्त करें" : "Collect"}</span>
                </div>
              </div>

              {/* Payment Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* Card 1: 💳 PAY ONLINE (Priority Queue) */}
                <div className="group rounded-xl bg-slate-900/85 border border-emerald-500/40 p-3.5 transition-all duration-300 hover:border-emerald-400 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/40 flex flex-col justify-between space-y-2.5 relative overflow-hidden">
                  {/* Subtle hover shine beam */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-7 w-7 rounded-md bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                        <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <PriorityBadge
                        label={currentLang === "hi" ? "🔥 प्राथमिकता (Express)" : "🔥 PRIORITY QUEUE"}
                        size="sm"
                      />
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      {currentLang === "hi" ? "💳 ऑनलाइन भुगतान" : "💳 Pay Online"}
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-300 mt-0.5 leading-tight">
                      {currentLang === "hi" ? "अभी भुगतान करें • सबसे पहले प्रिंट पाएं" : "Pay now & get express priority printing."}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "दस्तावेज अपलोड करें, ऑनलाइन भुगतान करें और बिना किसी लाइन में लगे तुरंत तैयार प्रिंट प्राप्त करें।"
                        : "Upload your document, pay online via UPI/Cards, and skip all queues with priority printing."}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-emerald-500/20">
                    <Link
                      to="/online-services/document-printing"
                      className="inline-flex items-center justify-between w-full text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group/link cursor-pointer btn-hover-arrow"
                    >
                      <span>{currentLang === "hi" ? "ऑनलाइन प्रिंट करें (Priority) →" : "Order Online (Priority) →"}</span>
                      <ArrowRight className="h-3 w-3 btn-icon-right transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {/* Card 2: 📄 PAY AT SHOP (Normal Queue) */}
                <div className="group rounded-xl bg-slate-900/85 border border-amber-400/40 p-3.5 transition-all duration-300 hover:border-amber-400 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-950/30 flex flex-col justify-between space-y-2.5 relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-7 w-7 rounded-md bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <NormalQueueBadge
                        label={currentLang === "hi" ? "📄 सामान्य कतार (Standard)" : "📄 NORMAL QUEUE"}
                        size="sm"
                      />
                    </div>

                    <div className="text-xs sm:text-sm font-extrabold text-white">
                      {currentLang === "hi" ? "📄 दुकान पर भुगतान" : "📄 Pay at Shop Counter"}
                    </div>
                    <p className="text-[11px] font-semibold text-amber-300 mt-0.5 leading-tight">
                      {currentLang === "hi" ? "फाइल अभी भेजें • काउंटर पर आते ही प्रिंट शुरू" : "Send file in advance & print when you arrive."}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                      {currentLang === "hi"
                        ? "दुकान आने से पहले दस्तावेज व विवरण भेजें। दुकान काउंटर पर आपकी मौजूदगी सत्यापित होते ही प्रिंट शुरू होगा और आप वहीं भुगतान करेंगे।"
                        : "Upload your document in advance. Printing begins once your arrival/availability is verified at the counter, and you pay upon pickup."}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-amber-400/20">
                    <Link
                      to="/online-services/document-printing"
                      className="inline-flex items-center justify-between w-full text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors group/link cursor-pointer btn-hover-arrow"
                    >
                      <span>{currentLang === "hi" ? "दुकान पर भुगतान से ऑर्डर करें →" : "Order & Pay at Shop →"}</span>
                      <ArrowRight className="h-3 w-3 btn-icon-right transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

              </div>

              {/* Right Panel Utility: Returning Customer Track Order Link & Search */}
              <div className="rounded-xl bg-sky-950/60 border border-sky-500/30 p-2.5 sm:p-3 space-y-2 text-xs backdrop-blur-xs shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-slate-200 text-xs font-semibold">
                    <Search className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>
                      {currentLang === "hi"
                        ? "क्या आपने पहले ही ऑर्डर दिया है?"
                        : "Already placed an order?"}
                    </span>
                  </div>
                  <Link
                    to="/order-status"
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 group transition-colors"
                  >
                    <span>{currentLang === "hi" ? "ट्रैक पोर्टल" : "Track Order"}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </Link>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (heroTrackingId.trim()) {
                      navigate(`/order-status?code=${encodeURIComponent(heroTrackingId.trim())}`);
                    } else {
                      navigate("/order-status");
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={heroTrackingId}
                      onChange={(e) => setHeroTrackingId(e.target.value)}
                      placeholder={
                        currentLang === "hi"
                          ? "ट्रैकिंग आईडी दर्ज करें (e.g. PE-O-...)"
                          : "Type Tracking ID (e.g. PE-O-...)"
                      }
                      className="w-full rounded-lg border border-sky-400/30 bg-slate-900/80 px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:border-amber-400 focus:bg-slate-900 focus:outline-hidden transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs inline-flex items-center gap-1 active-press transition-all hover:scale-105 shrink-0 cursor-pointer shadow-xs"
                  >
                    <span>{currentLang === "hi" ? "ट्रैक करें" : "Track"}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;

