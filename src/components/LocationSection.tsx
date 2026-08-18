import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import {
  business,
  businessConfig,
  getCallLink,
  getDirectionsLink,
  getWhatsAppLink,
} from "../config/business";
import { cn } from "../lib/utils";

interface LocationSectionProps {
  isHomePage?: boolean;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ isHomePage = true }) => {
  const { language, lang, t } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    const fullAddress =
      businessConfig.address.fullAddress[currentLang] ||
      `${business.address.line1[currentLang]}, ${business.address.landmark[currentLang]}, ${business.address.city[currentLang]}`;
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="contact-preview" className="bg-white py-16 sm:py-20 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Address Details & Action Buttons */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-pill bg-brandred/10 px-3 py-1 text-xs font-semibold text-brandred">
                <MapPin size={14} />
                <span>{currentLang === "hi" ? "स्थान व संपर्क" : "Location & Contact"}</span>
              </div>

              <h2
                className={cn(
                  "mt-3 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {t.location.title}
              </h2>

              <p
                className={cn(
                  "mt-2 text-sm text-slate-600 sm:text-base leading-relaxed",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {t.location.subtitle}
              </p>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-brandred" />
                  <div>
                    <strong className="block font-bold text-navy text-base">{business.name[currentLang]}</strong>
                    <span>
                      {business.address.line1[currentLang]}, {business.address.landmark[currentLang]}
                    </span>
                    <br />
                    <span>{business.address.city[currentLang]}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-navy" />
                  <div>
                    <span className="font-semibold text-navy">
                      {currentLang === "hi" ? "कार्य समय: " : "Business Hours: "}
                    </span>
                    <span>
                      {currentLang === "hi"
                        ? "सोम - रवि: सुबह 8:00 से रात 8:00 तक"
                        : "Mon - Sun: 8:00 AM - 8:00 PM"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion Buttons */}
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={getCallLink()}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-brandred px-5 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <Phone size={16} aria-hidden />
                  {currentLang === "hi" ? "कॉल करें" : "Call Now"}
                </a>

                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-leaf px-5 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <MessageCircle size={16} aria-hidden />
                  {currentLang === "hi" ? "व्हाट्सएप" : "WhatsApp"}
                </a>

                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03]",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  <MapPin size={16} aria-hidden />
                  {currentLang === "hi" ? "रास्ता देखें" : "Get Directions"}
                </a>
              </div>

              {/* View Contact Details CTA for Homepage */}
              {isHomePage && (
                <div className="mt-5">
                  <Link
                    to="/contact"
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-bold text-navy hover:text-brandred transition-colors",
                      currentLang === "hi" && "font-hindi"
                    )}
                  >
                    <span>{currentLang === "hi" ? "संपर्क व फॉर्म का पूरा विवरण देखें →" : "View Contact Details & Inquiry Form →"}</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              {/* Copy Address & Registration Badges */}
              <div className="mt-6 border-t border-line/70 pt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-pill border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-leaf" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span>
                    {copied
                      ? currentLang === "hi"
                        ? "पता कॉपी हो गया!"
                        : "Address Copied!"
                      : currentLang === "hi"
                      ? "पता कॉपी करें"
                      : "Copy Address"}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-leaf/10 px-3 py-1 text-leaf">
                    <ShieldCheck size={13} />
                    CSC ID: {business.registrations.cscId}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-slate-200/70 px-3 py-1 text-slate-700">
                    Udyam: {business.registrations.udyamNo}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Embedded Google Maps Preview */}
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card h-[260px] sm:h-[300px] lg:h-[340px]">
              <iframe
                title={currentLang === "hi" ? "पालक इंटरप्राइजेज गूगल मैप्स लोकेशन" : "Palak Enterprises location map"}
                src={business.mapEmbedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
