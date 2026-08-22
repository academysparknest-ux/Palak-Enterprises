import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { business } from "../config/business";
import { cn } from "../lib/utils";
import { Eye, ShieldCheck, Zap } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

export function Footer(): React.JSX.Element {
  const { lang, language } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useAccessibility();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0F172A] pb-2 pt-8 text-white/80 border-t border-slate-800">

      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 md:grid-cols-5">
        {/* Column 1: Brand & Registrations */}
        <div className="md:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={business.logoPath}
              alt={business.name[currentLang]}
              width={44}
              height={44}
              className="rounded-full object-cover ring-2 ring-amber-400/50 group-hover:scale-105 transition-transform"
            />
            <div>
              <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                {business.name[currentLang]}
              </h3>
              <p className="text-xs text-amber-300 font-medium">
                {business.unit[currentLang]}
              </p>
            </div>
          </Link>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            {currentLang === "hi"
              ? "प्रिंटिंग, डिजिटल सेवाएँ, ऑनलाइन सरकारी आवेदन एवं व्यावसायिक समाधान — चकिया, पूर्वी चंपारण में आपका विश्वसनीय सेवा साथी।"
              : "Professional printing, digital services, online applications, and business solutions from your trusted local center in Chakia, Bihar."}
          </p>

          <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>CSC ID: <strong className="text-white font-mono">{business.registrations.cscId}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <span>MSME Udyam: <strong className="text-white font-mono">{business.registrations.udyamNo}</strong></span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <h5 className={cn("text-xs font-bold uppercase tracking-wider text-amber-400", currentLang === "hi" && "font-hindi")}>
              {currentLang === "hi" ? "भाषा एवं त्वरित कोटेशन" : "Language & Custom Quote"}
            </h5>
            <div className="flex flex-wrap items-center gap-2.5">
              <LanguageSwitcher compact />
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
              >
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{currentLang === "hi" ? "कस्टम कोटेशन" : "Custom Quote"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: Services */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "सेवाएँ" : "Services"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/online-services" className="hover:text-white text-amber-300 font-semibold transition-colors">
                ⚡ {currentLang === "hi" ? "त्वरित सेवा" : "Quick Service"}
              </Link>
            </li>
            <li>
              <Link to="/printing" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "प्रिंटिंग प्रेस कैटलॉग" : "Printing & Press"}
              </Link>
            </li>
            <li>
              <Link to="/wedding-events" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "शादी एवं मांगलिक कार्ड" : "Wedding & Events"}
              </Link>
            </li>
            <li>
              <Link to="/business" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "बिजनेस प्रिंटिंग" : "Business Printing"}
              </Link>
            </li>
            <li>
              <Link to="/design-services" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "ग्राफिक डिज़ाइन स्टूडियो" : "Design Studio"}
              </Link>
            </li>
            <li>
              <Link to="/digital-services" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "सरकारी एवं डिजिटल सेवाएँ" : "Govt & CSC Services"}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Customer Portal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "ग्राहक सुविधाएँ" : "Customer"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/track-order" className="hover:text-white text-emerald-400 font-bold transition-colors">
                📦 {currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order"}
              </Link>
            </li>
            <li>
              <Link to="/account/orders" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "मेरे ऑर्डर्स" : "My Orders"}
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "लॉगिन / साइन अप" : "Customer Login"}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : "FAQs & Help"}
              </Link>
            </li>
            <li>
              <Link to="/request-quote" className="text-amber-300 hover:underline font-bold">
                {currentLang === "hi" ? "कस्टम कोटेशन मांगें →" : "Request Custom Quote →"}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Company & Legal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "कंपनी एवं नीतियां" : "Company & Legal"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "हमारे बारे में" : "About Us"}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "संपर्क एवं स्टोर पता" : "Contact & Location"}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white text-slate-400 transition-colors">
                {currentLang === "hi" ? "गोपनीयता नीति" : "Privacy Policy"}
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white text-slate-400 transition-colors">
                {currentLang === "hi" ? "नियम एवं शर्तें" : "Terms & Conditions"}
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="hover:text-white text-slate-400 transition-colors">
                {currentLang === "hi" ? "रिफंड एवं रद्दीकरण नीति" : "Refund & Cancellation"}
              </Link>
            </li>
          </ul>

          <div className="pt-2">
            <button
              type="button"
              onClick={toggleSeniorMode}
              aria-pressed={seniorMode}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
                seniorMode
                  ? "bg-amber-400 text-slate-950 border-amber-400 shadow-sm"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <Eye size={13} />
              <span>
                {seniorMode
                  ? (currentLang === "hi" ? "सामान्य मोड" : "Normal Mode")
                  : (currentLang === "hi" ? "वरिष्ठ नागरिक मोड" : "Senior Mode")}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-7xl flex-col gap-3 border-t border-slate-800 px-4 pt-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {year} {business.name[currentLang]} ({business.unit[currentLang]}). {currentLang === "hi" ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
        </p>
        <p className="flex items-center gap-1">
          <span>Designed &amp; Developed by</span>
          <a
            href="https://www.ekaagratechnologies.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors"
          >
            Ekaagra Technologies
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
