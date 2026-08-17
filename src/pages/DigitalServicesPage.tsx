import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Search, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { DigitalServiceCard } from "../components/DigitalServiceCard";
import { PalakDataStore } from "../lib/storage/store";
import { business, getWhatsAppLink } from "../config/business";

export const DigitalServicesPage: React.FC<{ onOpenRequestModal?: () => void }> = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [searchQuery, setSearchQuery] = useState("");
  const allServices = PalakDataStore.getDigitalServices();

  const filteredServices = allServices.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.en.toLowerCase().includes(q) ||
      s.name.hi.toLowerCase().includes(q) ||
      s.shortDesc.en.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-10 sm:py-12 px-4 sm:px-6">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
          }}
        />
        {/* Subtle geometric dot grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl space-y-3">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Digital Services</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {currentLang === "hi" ? "ऑनलाइन एवं डिजिटल सेवा केंद्र" : "Online Applications & CSC Digital Services"}
            </h1>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold">
              CSC ID: {business.registrations.cscId}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "पैन कार्ड, जाति/आय/निवास प्रमाण, सरकारी नौकरी के फॉर्म, आयुष्मान कार्ड, ई-श्रम एवं पेंशन योजनाओं में आसान एवं सटीक सहायता।"
              : "Assisted citizen portal services for PAN cards, RTPS Bihar certificates, competitive recruitment applications, and health cards."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4 space-y-10">
        {/* Search Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                currentLang === "hi"
                  ? "सेवा का नाम खोजें (जैसे: PAN, जाति प्रमाण, SSC, पेंशन)..."
                  : "Search service (e.g. PAN, RTPS, Exam Form, Ayushman)..."
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div>
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <DigitalServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <Globe className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                {currentLang === "hi" ? "कोई सेवा नहीं मिली" : "No matching digital service"}
              </h3>
              <p className="text-xs text-slate-500">
                {currentLang === "hi"
                  ? "यदि आपकी वांछित सेवा यहाँ सूचीबद्ध नहीं है, तो कृपया हमारे केंद्र पर सीधे संपर्क करें।"
                  : "If your required government or online form is not listed, talk directly with our Chakia team on WhatsApp."}
              </p>
              <a
                href={getWhatsAppLink("Hello Palak, I need help with an online service form.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
              >
                <span>Ask on WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Important Citizen Notice & Disclaimer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>{currentLang === "hi" ? "पारदर्शिता एवं आधिकारिक सेवा गारंटी" : "Palak Assistance Policy & Guarantee"}</span>
          </div>
          <p className="leading-relaxed">
            {currentLang === "hi"
              ? "पालक इंटरप्राइजेज एक अधिकृत लोक सेवा व सीएससी सुविधा केंद्र है। हम ग्राहकों को सरकारी पोर्टल पर सही जानकारी के साथ आवेदन करने में तकनीकी सहायता देते हैं। प्रमाणपत्र व कार्ड जारी करने का अंतिम अधिकार संबंधित सरकारी विभाग के पास सुरक्षित है।"
              : "Palak Enterprises functions as an assisted Common Service Center (CSC) and IT facilitator. We assist citizens with accurate data entry, document scanning, fee remittances, and portal filings. Final issuance of government documents remains under the exclusive jurisdiction of the designated statutory authorities."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DigitalServicesPage;
