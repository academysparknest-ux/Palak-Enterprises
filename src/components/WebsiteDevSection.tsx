import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { Globe2, CheckCircle2, MessageSquare, Phone } from "lucide-react";

interface WebsiteDevSectionProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const WebsiteDevSection: React.FC<WebsiteDevSectionProps> = ({ onOpenRequestModal }) => {
  const { t } = useLanguage();

  return (
    <section id="website-dev" className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full text-xs font-bold text-blue-900">
                <Globe2 className="w-4 h-4 text-blue-900" />
                <span>Modern Digital Services</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {t.webDevSpotlight.title}
              </h2>

              <p className="text-slate-600 text-base leading-relaxed">
                {t.webDevSpotlight.subtitle}
              </p>

              {/* 4 Feature Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2.5 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t.webDevSpotlight.bullet1}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t.webDevSpotlight.bullet2}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t.webDevSpotlight.bullet3}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-800 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t.webDevSpotlight.bullet4}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                <button
                  onClick={() => onOpenRequestModal("website-development")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold shadow-md transition-all text-sm cursor-pointer"
                >
                  {t.webDevSpotlight.cta}
                </button>

                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20get%20a%20website%20built%20for%20my%20business%20/%20school%20/%20coaching.`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all text-sm flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>WhatsApp Enquiry</span>
                </a>
              </div>
            </div>

            {/* Right Card Illustration */}
            <div className="lg:col-span-4 bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-inner space-y-4">
              <h3 className="font-bold text-lg text-amber-300">Who is this for? / किसके लिए?</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Private Schools & Colleges (स्कूल एवं कॉलेज)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Coaching Institutes (कोचिंग संस्थान)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Local Retail Shops & Showrooms (दुकानें)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Clinics & Doctors (क्लिनिक व डॉक्टर)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Service Providers & Enterprises (व्यापारी)</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-400">Direct Contact:</span>
                <a href={`tel:${businessConfig.phoneNumbers.primary}`} className="font-bold text-amber-400 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{businessConfig.phoneNumbers.primary}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
