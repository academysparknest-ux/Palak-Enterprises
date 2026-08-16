import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Award, UserCheck, ShieldCheck, MapPin, Phone } from "lucide-react";

export const About: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <section id="about" className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
                {language === "hi" ? "हमारे बारे में" : "About Palak Enterprises"}
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {t.about.title}
              </h2>

              <p className="text-slate-700 text-base leading-relaxed">
                {t.about.p1}
              </p>

              <p className="text-slate-700 text-base leading-relaxed">
                {t.about.p2}
              </p>

              <p className="text-slate-700 text-base leading-relaxed">
                {t.about.p3}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-blue-900" />
                  {t.about.badge1}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-red-600" />
                  {t.about.badge2}
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center">
                  <UserCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  {t.about.badge3}
                </span>
              </div>
            </div>

            {/* Right Column Profile Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-line shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex items-center space-x-4 pb-6 border-b border-line">
                  <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black text-2xl shadow-md">
                    P
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{businessConfig.owner.name}</h3>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                      {businessConfig.owner.title[language]} • {businessConfig.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{businessConfig.associatedName}</p>
                  </div>
                </div>

                {/* Quick Details */}
                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">{language === "hi" ? "पता" : "Address"}:</strong>
                      <span>{businessConfig.address.fullAddress[language]}</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Phone className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">{language === "hi" ? "फोन" : "Phone"}:</strong>
                      <div className="flex flex-col font-mono text-slate-900 font-bold">
                        <a href={`tel:${businessConfig.phoneNumbers.primary}`} className="hover:underline">
                          {businessConfig.phoneNumbers.displayPrimary}
                        </a>
                        <a href={`tel:${businessConfig.phoneNumbers.secondary}`} className="hover:underline">
                          {businessConfig.phoneNumbers.displaySecondary}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
