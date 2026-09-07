import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { business, businessConfig } from "../config/business";
import { cn } from "../lib/utils";
import { Eye, ShieldCheck, Zap, MapPin } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

export function Footer(): React.JSX.Element {
  const { lang, language } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useAccessibility();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0F172A] pt-10 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))] md:pb-6 text-white/80 border-t border-slate-800 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-10 items-start">
          {/* 1. Brand & Business Identity Section (5 cols on lg/xl, full width on mobile/tablet) */}
          <div className="lg:col-span-5 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3 group rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              aria-label={`${business.name[currentLang]} - Home`}
            >
              <img
                src={business.logoSmallPath || business.logoPath}
                alt={business.name[currentLang]}
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                className="rounded-full object-cover ring-2 ring-amber-400/50 group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-white group-hover:text-amber-400 transition-colors tracking-tight">
                  {business.name[currentLang]}
                </h2>
                <p className="text-xs text-amber-300 font-medium truncate">
                  {business.unit[currentLang]}
                </p>
              </div>
            </Link>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300 max-w-xl">
              {currentLang === "hi"
                ? "प्रिंटिंग, डिजिटल सेवाएँ, ऑनलाइन सरकारी आवेदन एवं व्यावसायिक समाधान — चकिया, पूर्वी चंपारण में आपका विश्वसनीय सेवा साथी।"
                : "Professional printing, digital services, online applications, and business solutions from your trusted local center in Chakia, Bihar."}
            </p>

            {/* Business Credentials Card */}
            <div className="rounded-2xl bg-slate-900/90 p-3.5 sm:p-4 border border-slate-800/90 shadow-inner space-y-2.5 text-xs text-slate-300 max-w-xl">
              {/* Address */}
              <div className="flex items-start gap-2.5 text-slate-200 leading-snug">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="min-w-0 break-words">{businessConfig.address.fullAddress[currentLang]}</span>
              </div>

              <div className="h-px bg-slate-800/80 my-1" aria-hidden="true" />

              {/* Registration Identifiers */}
              <dl className="grid grid-cols-1 gap-1.5 font-sans">
                <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>CSC ID:</span>
                  </dt>
                  <dd className="font-mono text-slate-100 font-semibold tracking-wide break-all text-left sm:text-right">
                    {business.registrations.cscId}
                  </dd>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>MSME Udyam:</span>
                  </dt>
                  <dd className="font-mono text-slate-100 font-semibold tracking-wide break-all text-left sm:text-right">
                    {business.registrations.udyamNo}
                  </dd>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                    <span>GST No.:</span>
                  </dt>
                  <dd className="font-mono text-slate-100 font-semibold tracking-wide break-all text-left sm:text-right">
                    {business.registrations.gstNo}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 2, 3, 4. Navigation Columns (7 cols on lg/xl, 3-column row on tablet, stacked on mobile) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 lg:gap-8 pt-2 sm:pt-0">
            {/* Column 1: Services */}
            <nav aria-label={currentLang === "hi" ? "सेवाएँ नेविगेशन" : "Services navigation"} className="space-y-3 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>{currentLang === "hi" ? "सेवाएँ" : "Services"}</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <Link
                    to="/online-services"
                    className="group inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs py-0.5"
                  >
                    <span className="text-amber-400 transition-transform group-hover:scale-110">⚡</span>
                    <span>{currentLang === "hi" ? "त्वरित सेवा" : "Quick Service"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/printing"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "प्रिंटिंग प्रेस कैटलॉग" : "Printing & Press"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/wedding-events"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "शादी एवं मांगलिक कार्ड" : "Wedding & Events"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/business"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "बिजनेस प्रिंटिंग" : "Business Printing"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/design-services"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "ग्राफिक डिज़ाइन स्टूडियो" : "Design Studio"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/digital-services"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "सरकारी एवं डिजिटल सेवाएँ" : "Govt & CSC Services"}
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Column 2: Customer Portal */}
            <nav aria-label={currentLang === "hi" ? "ग्राहक सुविधाएँ नेविगेशन" : "Customer navigation"} className="space-y-3 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>{currentLang === "hi" ? "ग्राहक सुविधाएँ" : "Customer"}</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <Link
                    to="/track-order"
                    className="group inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs py-0.5"
                  >
                    <span className="text-emerald-400 transition-transform group-hover:scale-110">📦</span>
                    <span>{currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Order"}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/orders"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "मेरे ऑर्डर्स" : "My Orders"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "लॉगिन / साइन अप" : "Customer Login"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : "FAQs & Help"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/request-quote"
                    className="group inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs py-0.5"
                  >
                    <span>{currentLang === "hi" ? "कस्टम कोटेशन मांगें" : "Request Custom Quote"}</span>
                    <span className="transition-transform group-hover:translate-x-1 font-sans">→</span>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Column 3: Company & Legal */}
            <nav aria-label={currentLang === "hi" ? "कंपनी एवं नीतियां नेविगेशन" : "Company and legal navigation"} className="space-y-3 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>{currentLang === "hi" ? "कंपनी एवं नीतियां" : "Company & Legal"}</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <Link
                    to="/about"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "हमारे बारे में" : "About Us"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-slate-300 hover:text-white transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "संपर्क एवं स्टोर पता" : "Contact & Location"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-slate-400 hover:text-slate-200 transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "गोपनीयता नीति" : "Privacy Policy"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-slate-400 hover:text-slate-200 transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "नियम एवं शर्तें" : "Terms & Conditions"}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/refund-policy"
                    className="text-slate-400 hover:text-slate-200 transition-colors inline-block py-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
                  >
                    {currentLang === "hi" ? "रिफंड एवं रद्दीकरण नीति" : "Refund & Cancellation"}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* 5. Cohesive Language, Quote & Utility Band */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-slate-800/90">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Language Switcher Section */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
                {currentLang === "hi" ? "भाषा चयन:" : "Language:"}
              </span>
              <LanguageSwitcher compact />
            </div>

            {/* Actions: Custom Quote & Senior Citizen Mode */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
                title={currentLang === "hi" ? "कस्टम कोटेशन का अनुरोध करें" : "Request Custom Quote"}
              >
                <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{currentLang === "hi" ? "कस्टम कोटेशन" : "Custom Quote"}</span>
              </Link>

              <button
                type="button"
                onClick={toggleSeniorMode}
                aria-pressed={seniorMode}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400",
                  seniorMode
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-amber-400/20"
                    : "border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                )}
                title={currentLang === "hi" ? "वरिष्ठ नागरिक सुगमता मोड टॉगल करें" : "Toggle Senior Citizen Mode"}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">
                  {seniorMode
                    ? (currentLang === "hi" ? "सामान्य मोड" : "Normal Mode")
                    : (currentLang === "hi" ? "वरिष्ठ नागरिक मोड" : "Senior Mode")}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. Footer Bottom Bar: Copyright & Attribution */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 text-center sm:text-left leading-normal">
          <p className="min-w-0">
            © {year} <span className="text-slate-300 font-medium">{business.name[currentLang]}</span> ({business.unit[currentLang]}). {currentLang === "hi" ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
          </p>
          <p className="flex items-center justify-center gap-1 shrink-0 text-slate-400">
            <span>Designed &amp; Developed by</span>
            <a
              href="https://www.ekaagratechnologies.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xs"
            >
              Ekaagra Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
