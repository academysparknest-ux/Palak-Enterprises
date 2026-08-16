import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { HeartHandshake, Zap, Layers, MapPin, Globe, ShieldCheck } from "lucide-react";

export const TrustFeatures: React.FC = () => {
  const { t } = useLanguage();

  const trustItems = [
    {
      icon: HeartHandshake,
      title: t.trust.b1Title,
      desc: t.trust.b1Desc,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      icon: Zap,
      title: t.trust.b2Title,
      desc: t.trust.b2Desc,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      icon: Layers,
      title: t.trust.b3Title,
      desc: t.trust.b3Desc,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      icon: MapPin,
      title: t.trust.b4Title,
      desc: t.trust.b4Desc,
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      icon: Globe,
      title: t.trust.b5Title,
      desc: t.trust.b5Desc,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      icon: ShieldCheck,
      title: t.trust.b6Title,
      desc: t.trust.b6Desc,
      color: "text-sky-600 bg-sky-50 border-sky-200",
    },
  ];

  return (
    <section className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">
              Trust & Quality Assurance
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              {t.trust.title}
            </h2>
            <p className="text-slate-600 mt-2 text-base">
              {t.trust.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-line bg-white hover:shadow-md transition-all flex items-start space-x-4"
                >
                  <div className={`p-3 rounded-xl border shrink-0 ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
