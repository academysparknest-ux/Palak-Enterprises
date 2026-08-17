import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Clock,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getWhatsAppLink } from "../../config/business";

export const InvitationCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-rose-900 via-[#123B70] to-slate-900 text-white py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center space-y-3">
          <div className="text-xs text-rose-200">
            <Link to="/" className="hover:underline">Home</Link> /{" "}
            <Link to="/online-services" className="hover:underline">Instant Online Services</Link> /{" "}
            <span className="text-amber-300">Invitation Cards</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30 px-4 py-1 text-xs font-black uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" />
            <span>Coming Soon • जल्द आ रहा है</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            💍 {currentLang === "hi" ? "शादी एवं मांगलिक निमंत्रण कार्ड" : "Invitation & Wedding Cards"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            {currentLang === "hi"
              ? "कस्टमाइज्ड ऑनलाइन निमंत्रण कार्ड कॉन्फिगरेटर जल्द आ रहा है। वर्तमान में ऑफलाइन डिज़ाइन व ऑर्डर के लिए हमारे चकिया केंद्र पर संपर्क करें।"
              : "Interactive online invitation customizer is coming soon. For physical wedding card catalogs, samples, and printing, talk directly to our Chakia team."}
          </p>
        </div>
      </div>

      {/* Main Showcase / Status Notice */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-6 space-y-8">
        {/* Notice Card */}
        <div className="rounded-3xl border border-rose-200 bg-white p-6 sm:p-10 text-center shadow-card space-y-6">
          <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <Sparkles className="h-8 w-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {currentLang === "hi"
                ? "ऑनलाइन कस्टमाइज़ेशन जल्द उपलब्ध होगा"
                : "Customized Online Ordering Under Development"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentLang === "hi"
                ? "हम आपके लिए शादी, तिलक, मुंडन और जन्मदिन के 50+ शानदार कार्ड डिज़ाइनों का ऑनलाइन कैटलॉग तैयार कर रहे हैं।"
                : "We are curating an extensive collection of 50+ royal gold-foil, velvet box, acrylic, and laser-cut invitation templates with live preview."}
            </p>
          </div>

          {/* Feature Preview Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl mx-auto text-left">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
              <span className="text-base">👑</span>
              <h3 className="text-xs font-bold text-slate-900">Royal Gold Foil</h3>
              <p className="text-[11px] text-slate-500">Traditional shloka & embossed borders</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
              <span className="text-base">🪞</span>
              <h3 className="text-xs font-bold text-slate-900">Acrylic & Laser Cut</h3>
              <p className="text-[11px] text-slate-500">Modern frosted acrylic & velvet boxes</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
              <span className="text-base">🪔</span>
              <h3 className="text-xs font-bold text-slate-900">Tilak & Mundan</h3>
              <p className="text-[11px] text-slate-500">Custom ceremony & anniversary cards</p>
            </div>
          </div>

          {/* Direct WhatsApp Consultation */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getWhatsAppLink("Hello Palak Enterprises, I want to inquire about Wedding and Invitation Card printing.")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-transform hover:scale-105"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{currentLang === "hi" ? "व्हाट्सएप पर कैटलॉग देखें" : "Inquire on WhatsApp"}</span>
            </a>

            <Link
              to="/wedding-events"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
            >
              <span>{currentLang === "hi" ? "मौजूदा शादी कैटलॉग देखें" : "Browse Physical Showcase"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            to="/online-services"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B70] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "सभी इंस्टेंट ऑनलाइन सेवाएँ देखें" : "Back to Instant Online Services"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
