import React, { useState } from "react";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig, business, getCallLink, getWhatsAppLink, getDirectionsLink } from "../config/business";
import { servicesData } from "../config/services";
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Building,
  Copy,
  Check,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const ContactPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [copied, setCopied] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCopyAddress = () => {
    const fullAddress = businessConfig.address.fullAddress[currentLang];
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(currentLang === "hi" ? "कृपया अपना नाम लिखें।" : "Please enter your name.");
      return;
    }
    if (!formPhone.trim() || formPhone.length < 10) {
      setFormError(currentLang === "hi" ? "कृपया 10 अंकों का मोबाइल नंबर लिखें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }

    setFormError("");
    setFormSubmitted(true);

    // Also offer WhatsApp forwarding
    const waText = encodeURIComponent(
      `Hello Palak Enterprises,\nName: ${formName}\nPhone: ${formPhone}\nService: ${formService || "General Inquiry"}\nMessage: ${formMessage}`
    );
    window.open(`https://wa.me/${businessConfig.whatsappNumber}?text=${waText}`, "_blank");
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Contact & Center Location in Chakia | Palak Enterprises",
          hi: "संपर्क एवं केंद्र का पता चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Get in touch with Palak Enterprises (Palak Printing Press) in Chakia, East Champaran. Phone numbers, WhatsApp chat, full address near Block Gate, and inquiry form.",
          hi: "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया, पूर्वी चंपारण से संपर्क करें। फोन नंबर, व्हाट्सएप, ब्लॉक गेट के पास का पता एवं पूछताछ फॉर्म।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Contact Us", hi: "संपर्क करें" }, path: "/contact" },
        ]}
        badge={{
          en: "Center Location & Fast Assistance",
          hi: "केंद्र का पता एवं त्वरित संपर्क",
        }}
        title={{
          en: "Contact Palak Enterprises & Printing Press",
          hi: "पालक इंटरप्राइजेज से संपर्क करें",
        }}
        subtitle={{
          en: "Visit our center near Block Gate, Chakia or reach out through direct call, WhatsApp, or the inquiry form below.",
          hi: "ब्लॉक गेट चकिया के निकट हमारे केंद्र पर पधारें या सीधे कॉल, व्हाट्सएप अथवा फॉर्म द्वारा संपर्क करें।",
        }}
        primaryCta={{
          label: { en: "Call Directly", hi: "सीधे कॉल करें" },
          to: getCallLink(),
        }}
        secondaryCta={{
          label: { en: "Chat on WhatsApp", hi: "व्हाट्सएप चैट" },
          to: getWhatsAppLink(),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Contact Info & Address */}
          <div className="lg:col-span-6 space-y-6">
            {/* Main Contact Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="inline-flex items-center space-x-2 bg-red-50 border border-red-200 px-3.5 py-1 rounded-full text-xs font-bold text-brandred">
                <Building className="w-4 h-4" />
                <span>{currentLang === "hi" ? "केंद्र विवरण" : "Center Information"}</span>
              </div>

              <h2 className="text-2xl font-black text-slate-900">
                {business.name[currentLang]} ({business.unit[currentLang]})
              </h2>

              {/* Phones */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {currentLang === "hi" ? "फोन नंबर (कॉल करने के लिए टैप करें):" : "Direct Phone Numbers:"}
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`tel:${businessConfig.phoneNumbers.primary}`}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-navy transition-all flex items-center space-x-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-brandred flex items-center justify-center group-hover:bg-brandred group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">Primary Call</span>
                      <strong className="text-sm font-mono text-slate-900">{businessConfig.phoneNumbers.displayPrimary}</strong>
                    </div>
                  </a>

                  <a
                    href={`tel:${businessConfig.phoneNumbers.secondary}`}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-navy transition-all flex items-center space-x-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">Secondary Call</span>
                      <strong className="text-sm font-mono text-slate-900">{businessConfig.phoneNumbers.displaySecondary}</strong>
                    </div>
                  </a>
                </div>
              </div>

              {/* WhatsApp Button */}
              <a
                href={getWhatsAppLink("Hello Palak Enterprises, I am contacting you from your website.")}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-leaf hover:bg-emerald-700 text-white font-bold text-sm shadow-sm flex items-center justify-center space-x-2 transition-transform hover:scale-[1.01]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>
                  {currentLang === "hi" ? "व्हाट्सएप पर चैट करें (+91 99052 38015)" : "WhatsApp Chat (+91 99052 38015)"}
                </span>
              </a>

              {/* Address */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-brandred shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 text-sm">{currentLang === "hi" ? "स्थान एवं पूरा पता" : "Full Address"}:</strong>
                    <span className="text-slate-700 text-sm leading-relaxed block mt-0.5">
                      {businessConfig.address.fullAddress[currentLang]}
                    </span>
                    <span className="text-xs text-brandred font-semibold block mt-1">
                      Landmark: {businessConfig.address.landmark[currentLang]}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-leaf" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copied ? (currentLang === "hi" ? "पता कॉपी हो गया!" : "Address Copied!") : (currentLang === "hi" ? "पूरा पता कॉपी करें" : "Copy Address")}</span>
                  </button>
                </div>
              </div>

              {/* Verified Hours */}
              <div className="flex items-start space-x-3 pt-2 border-t border-slate-100">
                <Clock className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 text-sm">{currentLang === "hi" ? "कार्य समय (Business Hours)" : "Business Working Hours"}:</strong>
                  <span className="text-slate-700 text-sm block mt-0.5">
                    {businessConfig.openingHours[currentLang]}
                  </span>
                </div>
              </div>
            </div>

            {/* Embedded Google Map */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-navy uppercase tracking-wider">
                  {currentLang === "hi" ? "गूगल मैप्स लोकेशन" : "Interactive Map"}
                </span>
                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brandred hover:underline flex items-center space-x-1"
                >
                  <span>{currentLang === "hi" ? "दिशा-निर्देश (Directions) →" : "Get Directions →"}</span>
                </a>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 h-[280px]">
                <iframe
                  title="Palak Enterprises location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    business.mapsQuery
                  )}&output=embed`}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Inquiry Form */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold text-brandred bg-red-50 border border-red-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  {currentLang === "hi" ? "ऑनलाइन संदेश भेजें" : "Quick Message Form"}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {currentLang === "hi" ? "हमें अपनी आवश्यकता या सवाल भेजें" : "Send an Inquiry or Message"}
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  {currentLang === "hi"
                    ? "हम आपकी जानकारी प्राप्त होते ही तुरंत संपर्क करेंगे।"
                    : "Fill in the details below and we will get back to you promptly."}
                </p>
              </div>

              {formSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="text-lg font-bold">
                    {currentLang === "hi" ? "संदेश सफलतापूर्वक भेजा गया!" : "Message Sent Successfully!"}
                  </h4>
                  <p className="text-xs sm:text-sm text-emerald-800">
                    {currentLang === "hi"
                      ? "धन्यवाद! हमने आपकी जानकारी दर्ज कर ली है। हमारी टीम जल्द ही आपसे संपर्क करेगी।"
                      : "Thank you! We have received your inquiry and will connect with you shortly."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormSubmitted(false);
                      setFormName("");
                      setFormPhone("");
                      setFormMessage("");
                    }}
                    className="mt-2 px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    {currentLang === "hi" ? "नया संदेश भेजें" : "Send Another Message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-brandred text-xs font-bold flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {currentLang === "hi" ? "आपका पूरा नाम *" : "Your Name *"}
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={currentLang === "hi" ? "जैसे: राजेश कुमार" : "e.g. Ramesh Kumar"}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {currentLang === "hi" ? "मोबाइल नंबर *" : "Mobile Number *"}
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder={currentLang === "hi" ? "10 अंकों का मोबाइल नंबर" : "10-digit phone number"}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {currentLang === "hi" ? "आवश्यक सेवा (ऐच्छिक)" : "Service Required (Optional)"}
                    </label>
                    <select
                      value={formService}
                      onChange={(e) => setFormService(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                    >
                      <option value="">{currentLang === "hi" ? "-- सेवा चुनें --" : "-- Select Service --"}</option>
                      {servicesData.map((s) => (
                        <option key={s.id} value={s.name.en}>
                          {s.name[currentLang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {currentLang === "hi" ? "आपका संदेश या विवरण" : "Your Message / Details"}
                    </label>
                    <textarea
                      rows={4}
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      placeholder={
                        currentLang === "hi"
                          ? "प्रिंटिंग, फॉर्म या किसी अन्य कार्य का विवरण यहाँ लिखें..."
                          : "Mention your requirements, quantity, urgency or any specific instructions..."
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-sm shadow-md transition-transform hover:scale-[1.01] flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{currentLang === "hi" ? "संदेश भेजें" : "Submit Message"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
