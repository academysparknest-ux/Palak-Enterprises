import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Clock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface QuickServiceUnavailableBannerProps {
  serviceName: string;
  stopReason?: string | null;
}

export const QuickServiceUnavailableBanner: React.FC<QuickServiceUnavailableBannerProps> = ({
  serviceName,
  stopReason,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-linear-to-r from-rose-50 via-rose-50/80 to-amber-50/60 p-4 sm:p-5 shadow-xs mb-6 text-rose-950 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-200/80 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="h-5 w-5 text-rose-700" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                {currentLang === "hi" ? "अस्थायी रूप से बंद" : "Temporarily Unavailable"}
              </span>
              <span className="text-xs text-rose-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{currentLang === "hi" ? "नए ऑर्डर बंद हैं" : "Not accepting new orders"}</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-rose-950">
              {serviceName} {currentLang === "hi" ? "वर्तमान में उपलब्ध नहीं है" : "is temporarily paused"}
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed max-w-xl">
              {stopReason ? (
                <>
                  <strong>Reason:</strong> {stopReason}.{" "}
                  {currentLang === "hi"
                    ? "कृपया कुछ देर बाद पुनः प्रयास करें या अन्य प्रिंट सेवा चुनें।"
                    : "Please check back again later or explore other online printing services."}
                </>
              ) : (
                currentLang === "hi"
                  ? "इस सेवा को रखरखाव या स्टॉक उपलब्धता के कारण अस्थायी रूप से रोका गया है। मौजूदा ऑर्डर्स पर कोई असर नहीं होगा।"
                  : "This service is currently paused for maintenance or queue management. Existing orders remain unaffected."
              )}
            </p>
          </div>
        </div>

        <Link
          to="/online-services"
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-800 hover:bg-rose-900 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentLang === "hi" ? "अन्य सेवाएँ देखें" : "View All Services"}</span>
        </Link>
      </div>
    </div>
  );
};
