import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { businessConfig } from "../config/business";
import { Printer, MapPin, Phone, MessageSquare, Globe, Eye } from "lucide-react";

export const Footer: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useAccessibility();

  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg block leading-tight">
                  {businessConfig.name}
                </span>
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                  {businessConfig.associatedName}
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              {businessConfig.subtitle[language]}
            </p>

            <p className="text-xs font-semibold text-amber-400">
              {t.footer.proprietor}
            </p>

            {/* Language & Accessibility Footer Controls */}
            <div className="pt-2 flex items-center space-x-3 text-xs">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1" />
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    language === "en" ? "bg-blue-900 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    language === "hi" ? "bg-blue-900 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  हिन्दी
                </button>
              </div>

              <button
                onClick={toggleSeniorMode}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                  seniorMode ? "bg-amber-500 text-slate-950 border-amber-600" : "bg-slate-900 text-slate-300 border-slate-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{seniorMode ? t.footer.normalMode : t.footer.seniorMode}</span>
              </button>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t.footer.servicesTitle}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  {language === "hi" ? "फोटोकॉपी व प्रिंटिंग" : "Photocopy & Printing"}
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  {language === "hi" ? "पासपोर्ट फोटो (5 मिनट)" : "Instant Passport Photos"}
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  {language === "hi" ? "जाति, आय, निवास फॉर्म" : "RTPS Certificate Help"}
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  {language === "hi" ? "पेंशन व सरकारी योजनाएँ" : "Pension Schemes Help"}
                </a>
              </li>
              <li>
                <a href="#business-printing" className="hover:text-white transition-colors">
                  {language === "hi" ? "विजिटिंग कार्ड व फ्लेक्स" : "Visiting Cards & Banners"}
                </a>
              </li>
              <li>
                <a href="#website-dev" className="hover:text-white transition-colors">
                  {language === "hi" ? "वेबसाइट बनवाएँ" : "Website Development"}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t.footer.quickLinksTitle}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                <a href="#home" className="hover:text-white transition-colors">{t.nav.home}</a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">{t.nav.services}</a>
              </li>
              <li>
                <a href="#business-printing" className="hover:text-white transition-colors">{t.nav.businessPrinting}</a>
              </li>
              <li>
                <a href="#website-dev" className="hover:text-white transition-colors">{t.nav.websiteDev}</a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">{t.nav.about}</a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition-colors">{t.nav.gallery}</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">{t.nav.faq}</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">{t.nav.contact}</a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">
              {t.footer.contactTitle}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{businessConfig.address.fullAddress[language]}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <a href={`tel:${businessConfig.phoneNumbers.primary}`} className="hover:text-white font-mono font-bold">
                  {businessConfig.phoneNumbers.displayPrimary}
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <a href={`tel:${businessConfig.phoneNumbers.secondary}`} className="hover:text-white font-mono font-bold">
                  {businessConfig.phoneNumbers.displaySecondary}
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 font-semibold"
                >
                  WhatsApp Chat
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>{t.footer.rightsReserved}</p>
          <p className="text-slate-600">
            Designed for Chakia, East Champaran, Bihar
          </p>
        </div>
      </div>
    </footer>
  );
};
