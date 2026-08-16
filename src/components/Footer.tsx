import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { business } from "../config/business";
import { cn } from "../lib/utils";
import { Eye, ShieldCheck } from "lucide-react";

export function Footer(): React.JSX.Element {
  const { lang, language } = useLanguage();
  const { seniorMode, toggleSeniorMode } = useAccessibility();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0F172A] pb-24 pt-14 text-white/80 lg:pb-14 border-t border-slate-800">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-5">
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
        </div>

        {/* Column 2: Printing & Products */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "प्रिंटिंग कैटलॉग" : "Printing Store"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/printing" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "सभी प्रिंटिंग उत्पाद" : "All Printing Products"}
              </Link>
            </li>
            <li>
              <Link to="/printing/visiting-cards" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "विजिटिंग कार्ड" : "Visiting Cards"}
              </Link>
            </li>
            <li>
              <Link to="/printing/flex-banners" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "फ्लेक्स बैनर" : "Flex Banners"}
              </Link>
            </li>
            <li>
              <Link to="/printing/pamphlets-flyers" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "पम्पलेट व हैंडबिल" : "Pamphlets & Flyers"}
              </Link>
            </li>
            <li>
              <Link to="/wedding-events" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "शाही शादी कार्ड" : "Wedding & Event Cards"}
              </Link>
            </li>
            <li>
              <Link to="/design-services" className="hover:text-white transition-colors text-amber-300 font-semibold">
                {currentLang === "hi" ? "ग्राफिक डिज़ाइन स्टूडियो" : "Design Studio Help"}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Digital & Online Services */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "डिजिटल सेवाएँ" : "Digital & CSC"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/digital-services" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "सभी डिजिटल सेवाएँ" : "All Digital Services"}
              </Link>
            </li>
            <li>
              <Link to="/digital-services/pan" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "पैन कार्ड आवेदन" : "PAN Card Services"}
              </Link>
            </li>
            <li>
              <Link to="/digital-services/rtps-certificates" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "जाति/आय/निवास (RTPS)" : "RTPS Certificates"}
              </Link>
            </li>
            <li>
              <Link to="/digital-services/govt-exam-forms" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "सरकारी फॉर्म सहायता" : "Govt Exam Form Filling"}
              </Link>
            </li>
            <li>
              <Link to="/business" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "व्यावसायिक समाधान" : "Business Printing Kit"}
              </Link>
            </li>
            <li>
              <Link to="/request-quote" className="text-amber-300 hover:underline font-bold">
                {currentLang === "hi" ? "कस्टम कोटेशन मांगें →" : "Request Custom Quote →"}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Quick Links & Legal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {currentLang === "hi" ? "ग्राहक सहायता एवं नीतियां" : "Support & Legal"}
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/track-order" className="hover:text-white text-emerald-400 font-bold transition-colors">
                📦 {currentLang === "hi" ? "ऑर्डर / स्थिति ट्रैक करें" : "Track Order / Status"}
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "ग्राहक अकाउंट" : "Customer Portal"}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "हमारे बारे में" : "About Us"}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "संपर्क एवं स्टोर का पता" : "Contact & Location"}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-white transition-colors">
                {currentLang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : "Frequently Asked Questions"}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white text-slate-400 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white text-slate-400 transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="hover:text-white text-slate-400 transition-colors">
                Refund & Reprint Policy
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

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-slate-800 px-4 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {year} {business.name[currentLang]} ({business.unit[currentLang]}). {currentLang === "hi" ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
        </p>
        <p>
          {business.address.line1[currentLang]}, {business.address.landmark[currentLang]}, {business.address.city[currentLang]}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
