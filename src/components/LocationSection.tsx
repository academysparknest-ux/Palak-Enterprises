import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { MapPin, Phone, Copy, Check, Navigation, Clock, MessageSquare } from "lucide-react";

export const LocationSection: React.FC = () => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(businessConfig.address.fullAddress[language]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="contact" className="py-14 sm:py-16 bg-white border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-card border border-line bg-canvas p-6 sm:p-10 shadow-card">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
              Location & Directions
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              {t.location.title}
            </h2>
            <p className="text-slate-600 mt-2 text-base">
              {t.location.subtitle}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            {/* Address Card Left */}
            <div className="bg-slate-900 text-white rounded-2xl p-8 space-y-6 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  {businessConfig.name}
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {businessConfig.associatedName}
                </h3>
                <p className="text-xs text-slate-400">
                  Proprietor: {businessConfig.owner.name}
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                {/* Address */}
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">{t.location.addressLabel}</strong>
                    <span>{businessConfig.address.fullAddress[language]}</span>
                  </div>
                </div>

                {/* Landmark */}
                <div className="flex items-start space-x-3">
                  <Navigation className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">{t.location.landmarkLabel}</strong>
                    <span className="text-amber-300 font-bold">{businessConfig.address.landmark[language]}</span>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">{t.location.hoursLabel}</strong>
                    <span>{businessConfig.openingHours[language]}</span>
                  </div>
                </div>

                {/* Contact Numbers */}
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">{t.location.phoneLabel}</strong>
                    <div className="flex flex-col font-mono text-white font-bold">
                      <a href={`tel:${businessConfig.phoneNumbers.primary}`} className="hover:text-amber-400">
                        {businessConfig.phoneNumbers.displayPrimary}
                      </a>
                      <a href={`tel:${businessConfig.phoneNumbers.secondary}`} className="hover:text-amber-400">
                        {businessConfig.phoneNumbers.displaySecondary}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={handleCopyAddress}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  <span>{copied ? t.location.addressCopied : t.location.copyAddress}</span>
                </button>

                <a
                  href={businessConfig.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.location.getDirections}</span>
                </a>

                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-colors"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>WhatsApp ({businessConfig.phoneNumbers.primary})</span>
                </a>
              </div>
            </div>

            {/* Embedded Google Map Preview Right */}
            <div className="bg-slate-100 rounded-2xl overflow-hidden border border-line shadow-md min-h-[380px] lg:min-h-[440px] h-full relative">
              <iframe
                title="Palak Enterprises Location Map"
                src={businessConfig.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
