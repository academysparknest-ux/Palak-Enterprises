import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Briefcase, CheckCircle2, MessageSquare } from "lucide-react";

interface BusinessPrintingSectionProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const BusinessPrintingSection: React.FC<BusinessPrintingSectionProps> = ({ onOpenRequestModal }) => {
  const { t } = useLanguage();

  return (
    <section id="business-printing" className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-slate-700 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-10 shadow-raised text-white">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Text Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-amber-300">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>Commercial & Shopkeeper Printing</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                {t.businessSpotlight.title}
              </h2>

              <p className="text-slate-300 text-base leading-relaxed">
                {t.businessSpotlight.subtitle}
              </p>

              {/* Bullet Points */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3 text-slate-200 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.businessSpotlight.bullet1}</span>
                </div>
                <div className="flex items-start space-x-3 text-slate-200 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.businessSpotlight.bullet2}</span>
                </div>
                <div className="flex items-start space-x-3 text-slate-200 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.businessSpotlight.bullet3}</span>
                </div>
                <div className="flex items-start space-x-3 text-slate-200 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t.businessSpotlight.bullet4}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button
                  onClick={() => onOpenRequestModal("visiting-cards")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg transition-all text-sm cursor-pointer"
                >
                  {t.businessSpotlight.cta}
                </button>

                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20inquire%20about%20business%20printing%20(visiting%20cards%20/%20banners%20/%20bill%20books).`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold transition-all text-sm flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Quote</span>
                </a>
              </div>
            </div>

            {/* Visual Showcase Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Popular Business Items
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">Quality Guaranteed</span>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">Visiting Cards / बिज़नेस कार्ड</h4>
                      <p className="text-slate-400 text-xs">Matte / Velvet / Spot UV Metallic</p>
                    </div>
                    <span className="bg-blue-900/80 text-blue-200 text-xs px-2.5 py-1 rounded-lg font-bold">Top Pick</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">Star Flex Banner / फ्लेक्स बैनर</h4>
                      <p className="text-slate-400 text-xs">Heavy HD print for shop boards</p>
                    </div>
                    <span className="bg-red-900/80 text-red-200 text-xs px-2.5 py-1 rounded-lg font-bold">Outdoor</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">Bill Books / बिल बुक</h4>
                      <p className="text-slate-400 text-xs">Carbonless duplicate/triplicate</p>
                    </div>
                    <span className="bg-emerald-900/80 text-emerald-200 text-xs px-2.5 py-1 rounded-lg font-bold">Numbered</span>
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
