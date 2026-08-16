import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { MousePointerClick, PhoneCall, CheckCircle } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full uppercase tracking-wider">
            {t.howItWorks.title}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-3">
            {t.howItWorks.title}
          </h2>
          <p className="text-slate-300 mt-2 text-base">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* 3 Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-8 relative hover:border-blue-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MousePointerClick className="w-7 h-7" />
            </div>
            <span className="text-4xl font-black text-slate-700 absolute top-6 right-8 select-none">01</span>
            <h3 className="text-xl font-bold text-white mb-2">{t.howItWorks.step1Title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{t.howItWorks.step1Desc}</p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-8 relative hover:border-red-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PhoneCall className="w-7 h-7" />
            </div>
            <span className="text-4xl font-black text-slate-700 absolute top-6 right-8 select-none">02</span>
            <h3 className="text-xl font-bold text-white mb-2">{t.howItWorks.step2Title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{t.howItWorks.step2Desc}</p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-8 relative hover:border-emerald-500/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-7 h-7" />
            </div>
            <span className="text-4xl font-black text-slate-700 absolute top-6 right-8 select-none">03</span>
            <h3 className="text-xl font-bold text-white mb-2">{t.howItWorks.step3Title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{t.howItWorks.step3Desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
