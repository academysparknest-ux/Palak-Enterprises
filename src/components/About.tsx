import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig, business } from "../config/business";
import { Award, ShieldCheck, MapPin, Phone, Building } from "lucide-react";
import { cn } from "../lib/utils";

export const About: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <section id="about" className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-pill bg-red-50 border border-red-200/60 px-3.5 py-1 text-xs font-bold text-brandred uppercase tracking-wider">
                <Building size={14} />
                <span>{language === "hi" ? "हमारे बारे में" : "About Palak Enterprises"}</span>
              </div>

              <h2 className={cn(
                "text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight",
                language === "hi" && "font-hindi"
              )}>
                {t.about.title}
              </h2>

              <p className={cn("text-slate-700 text-base leading-relaxed", language === "hi" && "font-hindi")}>
                {t.about.p1}
              </p>

              <p className={cn("text-slate-700 text-base leading-relaxed", language === "hi" && "font-hindi")}>
                {t.about.p2}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-leaf" />
                  <span>CSC: {business.registrations.cscId}</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-navy" />
                  <span>MSME: {business.registrations.udyamNo}</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>GST No. {business.registrations.gstNo}</span>
                </span>
              </div>

              <div className="pt-2">
                <Link
                  to="/about"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-xs font-bold text-white shadow-card hover:bg-brandred transition-colors",
                    language === "hi" && "font-hindi"
                  )}
                >
                  <span>{language === "hi" ? "संस्थान के बारे में और जानें →" : "Read Full Story & Mission →"}</span>
                </Link>
              </div>
            </div>

            {/* Right Column Profile Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-line shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex items-center space-x-4 pb-6 border-b border-line">
                  <div className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                    P
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{businessConfig.owner.name[language]}</h3>
                    <p className="text-xs font-bold text-brandred uppercase tracking-wide">
                      {businessConfig.owner.title[language]} • {businessConfig.name[language]}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{businessConfig.associatedName[language]}</p>
                  </div>
                </div>

                {/* Quick Details */}
                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-brandred shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">{language === "hi" ? "पता" : "Address"}:</strong>
                      <span>{businessConfig.address.fullAddress[language]}</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Phone className="w-5 h-5 text-navy shrink-0 mt-0.5" />
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

