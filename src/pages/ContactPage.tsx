import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { useLanguage } from "../context/LanguageContext";
import {
  business,
  businessConfig,
  getCallLink,
  getWhatsAppLink,
  getDirectionsLink,
} from "../config/business";
import {
  serviceCategories,
  servicesData,
} from "../config/services";
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
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export const ContactPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Address copy state
  const [copied, setCopied] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [quantity, setQuantity] = useState("");
  const [preferredSize, setPreferredSize] = useState("");
  const [colorMode, setColorMode] = useState("");
  const [designRequired, setDesignRequired] = useState<string>("yes");
  const [contactMethod, setContactMethod] = useState<string>("whatsapp");
  const [formMessage, setFormMessage] = useState("");

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCopyAddress = () => {
    const fullAddress = businessConfig.address.fullAddress[currentLang];
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter available services by selected category
  const availableServices = useMemo(() => {
    if (!selectedCategory) return servicesData;
    return servicesData.filter((s) => s.categoryId === selectedCategory);
  }, [selectedCategory]);

  const activeServiceObj = useMemo(() => {
    return servicesData.find((s) => s.id === selectedService);
  }, [selectedService]);

  const isGovernmentOrOnline =
    selectedCategory === "certificates-docs" ||
    selectedCategory === "online-services";

  const isWebsiteDevelopment = selectedCategory === "website-dev";

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(
        currentLang === "hi"
          ? "कृपया अपना पूरा नाम दर्ज करें।"
          : "Please enter your full name."
      );
      return;
    }

    const digitsOnly = formPhone.replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length !== 10) {
      setFormError(
        currentLang === "hi"
          ? "कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।"
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setFormError("");
    setFormSubmitted(true);

    const catObj = serviceCategories.find((c) => c.id === selectedCategory);
    const catName = catObj ? catObj.name[currentLang] : selectedCategory;
    const serviceName = activeServiceObj
      ? activeServiceObj.name[currentLang]
      : selectedService;

    // Structured WhatsApp message payload
    const lines =
      currentLang === "hi"
        ? [
            `*नमस्ते पालक एंटरप्राइजेज, वेबसाइट से नया सेवा अनुरोध:*`,
            `👤 *नाम:* ${formName}`,
            `📞 *मोबाइल:* ${formPhone}`,
            catName && `📂 *श्रेणी:* ${catName}`,
            serviceName && `🏷️ *सेवा:* ${serviceName}`,
            quantity && `📦 *मात्रा / प्रतियों की संख्या:* ${quantity}`,
            preferredSize && `📐 *आकार / साइज:* ${preferredSize}`,
            colorMode && `🎨 *कलर / फिनिश:* ${colorMode}`,
            !isGovernmentOrOnline &&
              !isWebsiteDevelopment &&
              `✏️ *डिज़ाइन आवश्यकता:* ${
                designRequired === "yes"
                  ? "नया डिज़ाइन चाहिए"
                  : "फाइल तैयार है"
              }`,
            `💬 *संपर्क प्राथमिकता:* ${
              contactMethod === "whatsapp" ? "व्हाट्सएप चैट" : "फोन कॉल"
            }`,
            formMessage && `📝 *विवरण / निर्देश:* ${formMessage}`,
          ]
        : [
            `*Hello Palak Enterprises, New Inquiry / Service Request:*`,
            `👤 *Name:* ${formName}`,
            `📞 *Mobile:* ${formPhone}`,
            catName && `📂 *Category:* ${catName}`,
            serviceName && `🏷️ *Service:* ${serviceName}`,
            quantity && `📦 *Quantity / Copies:* ${quantity}`,
            preferredSize && `📐 *Preferred Size:* ${preferredSize}`,
            colorMode && `🎨 *Color / Finish:* ${colorMode}`,
            !isGovernmentOrOnline &&
              !isWebsiteDevelopment &&
              `✏️ *Design Needed:* ${
                designRequired === "yes"
                  ? "Yes, fresh design required"
                  : "No, artwork ready"
              }`,
            `💬 *Preferred Contact:* ${
              contactMethod === "whatsapp" ? "WhatsApp" : "Phone Call"
            }`,
            formMessage && `📝 *Details / Notes:* ${formMessage}`,
          ];

    const message = lines.filter(Boolean).join("\n");
    window.open(getWhatsAppLink(message), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-canvas min-h-screen pb-16">
      <SEO
        title={{
          en: "Contact Us & Center Location | Palak Enterprises Chakia",
          hi: "संपर्क एवं केंद्र का पता चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Visit Palak Enterprises / Palak Printing Press near Block Gate, Chakia, East Champaran, Bihar. Call +91 99052 38015, chat on WhatsApp, or send an inquiry online.",
          hi: "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया, पूर्वी चंपारण से संपर्क करें। फोन नंबर +91 99052 38015, व्हाट्सएप, ब्लॉक गेट के पास का पता एवं ऑनलाइन पूछताछ फॉर्म।",
        }}
      />

      {/* Page Header Banner */}
      <section className="bg-navy py-12 sm:py-16 text-white relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, #F97316 0, transparent 40%), radial-gradient(circle at 20% 80%, #15803D 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1 text-xs font-bold text-saffron-light">
            <Building size={14} />
            <span className={currentLang === "hi" ? "font-hindi" : ""}>
              {currentLang === "hi" ? "संपर्क व केंद्र भ्रमण" : "Contact & Visit Center"}
            </span>
          </div>

          <h1
            className={`mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl ${
              currentLang === "hi" ? "font-hindi leading-snug" : ""
            }`}
          >
            {currentLang === "hi"
              ? "संपर्क करें व केंद्र की स्थिति"
              : "Contact Us & Center Location"}
          </h1>

          <p
            className={`mt-3 max-w-3xl text-sm sm:text-base text-white/80 leading-relaxed ${
              currentLang === "hi" ? "font-hindi" : ""
            }`}
          >
            {currentLang === "hi"
              ? "हम चकिया में नियर ब्लॉक गेट स्थित हैं। फोन, व्हाट्सएप द्वारा संपर्क करें या कार्य समय में सीधे हमारे केंद्र पर पधारें।"
              : "We are located near Block Gate in Chakia, East Champaran. Reach out by phone, WhatsApp, or visit our center during business working hours."}
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Business Info & Map */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            {/* Info Card with Verified Badges */}
            <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2
                    className={`font-display text-2xl font-extrabold text-navy ${
                      currentLang === "hi" ? "font-hindi" : ""
                    }`}
                  >
                    {currentLang === "hi" ? "व्यावसायिक विवरण" : "Business Information"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-leaf border border-emerald-200">
                    <ShieldCheck size={14} />
                    <span>CSC Verified</span>
                  </span>
                </div>

                <p className="mt-1 font-semibold text-slate-800 text-base">
                  {business.name[currentLang]} ({business.unit[currentLang]})
                </p>

                <div className="mt-6 space-y-5 text-sm text-slate-700">
                  {/* Physical Address */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brandred/10 text-brandred">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-navy text-sm">
                        {currentLang === "hi" ? "केंद्र का पता (Physical Location)" : "Center Location"}
                      </h3>
                      <p className="mt-1 leading-relaxed text-xs sm:text-sm text-slate-700">
                        {businessConfig.address.fullAddress[currentLang]}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-line bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check size={13} className="text-leaf" />
                            <span className="text-leaf">
                              {currentLang === "hi" ? "पता कॉपी हो गया!" : "Address Copied!"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} className="text-slate-500" />
                            <span>
                              {currentLang === "hi" ? "पूरा पता कॉपी करें" : "Copy Full Address"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="flex items-start gap-3.5 pt-4 border-t border-line">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-navy text-sm">
                        {currentLang === "hi" ? "खुलने का समय (Opening Hours)" : "Business Working Hours"}
                      </h3>
                      <p className="mt-1 font-medium text-xs sm:text-sm text-slate-800">
                        {currentLang === "hi"
                          ? "सोमवार से रविवार: सुबह 8:00 – रात 8:00"
                          : "Monday to Sunday: 8:00 AM – 8:00 PM"}
                      </p>
                    </div>
                  </div>

                  {/* Direct Phone Numbers */}
                  <div className="flex items-start gap-3.5 pt-4 border-t border-line">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saffron/15 text-amber-800">
                      <Phone size={20} />
                    </div>
                    <div className="w-full">
                      <h3 className="font-bold text-navy text-sm mb-2">
                        {currentLang === "hi" ? "सीधे कॉल करें (Phone Numbers)" : "Direct Phone Numbers"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <a
                          href={getCallLink(businessConfig.phoneNumbers.primary)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-slate-50 hover:bg-red-50 hover:border-brandred transition-colors group"
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              Primary Call
                            </span>
                            <span className="font-mono text-xs font-bold text-navy group-hover:text-brandred">
                              +91 {businessConfig.phoneNumbers.primary}
                            </span>
                          </div>
                          <Phone size={14} className="text-slate-400 group-hover:text-brandred" />
                        </a>

                        <a
                          href={getCallLink(businessConfig.phoneNumbers.secondary)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-slate-50 hover:bg-blue-50 hover:border-navy transition-colors group"
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              Secondary Call
                            </span>
                            <span className="font-mono text-xs font-bold text-navy">
                              +91 {businessConfig.phoneNumbers.secondary}
                            </span>
                          </div>
                          <Phone size={14} className="text-slate-400 group-hover:text-navy" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Official Government Verification IDs */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-line flex flex-wrap gap-2.5 text-[11px] font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1 text-leaf">
                      <ShieldCheck size={14} />
                      CSC ID: {business.registrations.cscId}
                    </span>
                    <span>·</span>
                    <span>Udyam: {business.registrations.udyamNo}</span>
                    <span>·</span>
                    <span>Proprietor: {business.owner[currentLang]}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action CTA Buttons */}
              <div className="pt-4 border-t border-line flex flex-wrap gap-2.5">
                <a
                  href={getCallLink()}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-brandred px-4 py-2.5 text-xs font-bold text-white shadow-card transition-transform hover:scale-[1.02]"
                >
                  <Phone size={14} />
                  {currentLang === "hi" ? "कॉल करें" : "Call Now"}
                </a>

                <a
                  href={getWhatsAppLink("Hello Palak Enterprises, I am contacting you from your contact page.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-leaf px-4 py-2.5 text-xs font-bold text-white shadow-card transition-transform hover:scale-[1.02]"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>

                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-navy px-4 py-2.5 text-xs font-bold text-white shadow-card transition-transform hover:scale-[1.02]"
                >
                  <MapPin size={14} />
                  {currentLang === "hi" ? "गूगल मैप रास्ता देखें" : "Get Directions"}
                </a>
              </div>
            </div>

            {/* Embedded Google Map */}
            <div className="overflow-hidden rounded-card border border-line bg-white shadow-card p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-navy uppercase tracking-wider">
                  {currentLang === "hi" ? "गूगल मैप्स लोकेशन" : "Interactive Location Map"}
                </span>
                <a
                  href={getDirectionsLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brandred hover:underline inline-flex items-center gap-1"
                >
                  <span>{currentLang === "hi" ? "दिशा-निर्देश (Directions) →" : "Open in Maps →"}</span>
                </a>
              </div>
              <div className="overflow-hidden rounded-xl border border-line h-[280px]">
                <iframe
                  title="Palak Enterprises Google Map"
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

          {/* Right Column: Interactive Service Request & Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card space-y-6">
              {/* Form Header */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-pill bg-navy/10 px-3.5 py-1 text-xs font-bold text-navy">
                  <Sparkles size={14} className="text-brandred" />
                  <span className={currentLang === "hi" ? "font-hindi" : ""}>
                    {currentLang === "hi" ? "ऑनलाइन सेवा अनुरोध व कोटेशन" : "Online Quote & Inquiry"}
                  </span>
                </div>
                <h3
                  className={`text-2xl font-extrabold text-navy mt-2.5 ${
                    currentLang === "hi" ? "font-hindi" : ""
                  }`}
                >
                  {currentLang === "hi"
                    ? "पूछताछ या सेवा अनुरोध भेजें"
                    : "Send an Inquiry or Service Request"}
                </h3>
                <p
                  className={`text-xs sm:text-sm text-muted mt-1 leading-relaxed ${
                    currentLang === "hi" ? "font-hindi" : ""
                  }`}
                >
                  {currentLang === "hi"
                    ? "नीचे दिया गया फॉर्म भरें, हम तुरंत आपसे व्हाट्सएप या फोन कॉल के माध्यम से संपर्क करेंगे।"
                    : "Fill in the details below to receive pricing, advice, and fast fulfillment directly on WhatsApp or call."}
                </p>
              </div>

              {formSubmitted ? (
                <div className="rounded-2xl bg-leaf/10 p-6 sm:p-8 border border-leaf/30 space-y-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-leaf mx-auto animate-bounce" />
                  <h4
                    className={`text-lg font-bold text-ink ${
                      currentLang === "hi" ? "font-hindi" : ""
                    }`}
                  >
                    {currentLang === "hi"
                      ? "अनुरोध सफलतापूर्वक तैयार हो गया!"
                      : "Request Ready & Forwarded!"}
                  </h4>
                  <p
                    className={`text-xs sm:text-sm text-slate-700 leading-relaxed max-w-lg mx-auto ${
                      currentLang === "hi" ? "font-hindi" : ""
                    }`}
                  >
                    {currentLang === "hi"
                      ? "धन्यवाद! हमने आपकी जानकारी का प्रारूप तैयार कर दिया है। यदि व्हाट्सएप चैट स्वतः नहीं खुली है, तो नीचे दिए गए बटन पर टैप करें।"
                      : "Thank you! Your inquiry details have been formatted. If WhatsApp chat did not open automatically, click the button below to connect with our team."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSubmitted(false);
                        setFormName("");
                        setFormPhone("");
                        setSelectedCategory("");
                        setSelectedService("");
                        setQuantity("");
                        setPreferredSize("");
                        setColorMode("");
                        setFormMessage("");
                      }}
                      className="rounded-pill border border-line bg-white px-5 py-2.5 text-xs font-bold text-navy hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {currentLang === "hi" ? "नया अनुरोध भरें" : "Submit Another Request"}
                    </button>

                    <Link
                      to="/services"
                      className="rounded-pill bg-navy px-5 py-2.5 text-xs font-bold text-white hover:bg-brandred transition-colors"
                    >
                      {currentLang === "hi" ? "सेवा कैटलॉग देखें" : "Browse Services"}
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-brandred text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Name and Mobile Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className={`block text-xs font-bold text-navy mb-1.5 ${
                          currentLang === "hi" ? "font-hindi" : ""
                        }`}
                      >
                        {currentLang === "hi" ? "आपका पूरा नाम *" : "Your Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={currentLang === "hi" ? "उदा. राहुल कुमार" : "e.g. Rahul Kumar"}
                        className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-xs font-bold text-navy mb-1.5 ${
                          currentLang === "hi" ? "font-hindi" : ""
                        }`}
                      >
                        {currentLang === "hi" ? "मोबाइल नंबर (10 अंक) *" : "Mobile Number (10 Digits) *"}
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10 font-mono"
                      />
                    </div>
                  </div>

                  {/* Category & Specific Service Selectors */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className={`block text-xs font-bold text-navy mb-1.5 ${
                          currentLang === "hi" ? "font-hindi" : ""
                        }`}
                      >
                        {currentLang === "hi" ? "सेवा श्रेणी (Category)" : "Service Category"}
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setSelectedService("");
                        }}
                        className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                      >
                        <option value="">
                          — {currentLang === "hi" ? "श्रेणी चुनें (वैकल्पिक)" : "Select Category (Optional)"} —
                        </option>
                        {serviceCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name[currentLang]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className={`block text-xs font-bold text-navy mb-1.5 ${
                          currentLang === "hi" ? "font-hindi" : ""
                        }`}
                      >
                        {currentLang === "hi" ? "विशिष्ट सेवा चुनें (Specific Service)" : "Select Specific Service"}
                      </label>
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                      >
                        <option value="">
                          — {currentLang === "hi" ? "विशिष्ट सेवा चुनें" : "Select Service"} —
                        </option>
                        {availableServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name[currentLang]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Government / Online Disclaimer */}
                  {isGovernmentOrOnline && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                      <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
                      <p className={`leading-relaxed ${currentLang === "hi" ? "font-hindi" : ""}`}>
                        {currentLang === "hi"
                          ? "सरकारी सेवा सूचना: पालक एंटरप्राइजेज एक स्वतंत्र कॉमन सर्विस सेंटर (CSC) है जो फॉर्म भरने व प्रिंटिंग में सहायता प्रदान करता है। आधिकारिक प्रमाण पत्र केवल संबंधित सरकारी विभागों द्वारा जारी किए जाते हैं।"
                          : "Government Services Notice: Palak Enterprises is an independent facilitation center offering form typing, scanning, and printing assistance. Official certificates are issued exclusively by respective government authorities."}
                      </p>
                    </div>
                  )}

                  {/* Dynamic Print Specs: Quantity & Size for Printing/Stationery */}
                  {!isGovernmentOrOnline && !isWebsiteDevelopment && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          className={`block text-xs font-bold text-navy mb-1.5 ${
                            currentLang === "hi" ? "font-hindi" : ""
                          }`}
                        >
                          {currentLang === "hi" ? "मात्रा / प्रतियों की संख्या" : "Quantity / Number of Copies"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            currentLang === "hi"
                              ? "उदा. 500 कार्ड्स, 2000 पम्पलेट"
                              : "e.g. 500 Cards, 2000 Flyers"
                          }
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-xs font-bold text-navy mb-1.5 ${
                            currentLang === "hi" ? "font-hindi" : ""
                          }`}
                        >
                          {currentLang === "hi" ? "पसंदीदा आकार (Size)" : "Preferred Size"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            currentLang === "hi"
                              ? "उदा. A4, A5, 12x18, 6x3 ft"
                              : "e.g. Standard, A4, A5, 6x3 ft"
                          }
                          value={preferredSize}
                          onChange={(e) => setPreferredSize(e.target.value)}
                          className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Print Specs: Color Mode & Design Requirement */}
                  {!isGovernmentOrOnline && !isWebsiteDevelopment && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          className={`block text-xs font-bold text-navy mb-1.5 ${
                            currentLang === "hi" ? "font-hindi" : ""
                          }`}
                        >
                          {currentLang === "hi" ? "कलर / पेपर फिनिश" : "Print Color / Material Finish"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            currentLang === "hi"
                              ? "उदा. मैट लेमिनेशन, 4-कलर, ग्लॉसी"
                              : "e.g. Matte Lamination, Full Color, Glossy"
                          }
                          value={colorMode}
                          onChange={(e) => setColorMode(e.target.value)}
                          className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                        />
                      </div>

                      <div>
                        <label
                          className={`block text-xs font-bold text-navy mb-1.5 ${
                            currentLang === "hi" ? "font-hindi" : ""
                          }`}
                        >
                          {currentLang === "hi" ? "क्या नया डिज़ाइन भी चाहिए?" : "Graphic Design Requirement"}
                        </label>
                        <div className="flex gap-4 pt-2.5 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="designReq"
                              value="yes"
                              checked={designRequired === "yes"}
                              onChange={(e) => setDesignRequired(e.target.value)}
                              className="accent-brandred"
                            />
                            <span className={currentLang === "hi" ? "font-hindi" : ""}>
                              {currentLang === "hi" ? "हाँ, नया डिज़ाइन बनाएँ" : "Yes, create design"}
                            </span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="designReq"
                              value="no"
                              checked={designRequired === "no"}
                              onChange={(e) => setDesignRequired(e.target.value)}
                              className="accent-brandred"
                            />
                            <span className={currentLang === "hi" ? "font-hindi" : ""}>
                              {currentLang === "hi" ? "नहीं, फाइल तैयार है" : "No, file ready"}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Method Preference */}
                  <div>
                    <label
                      className={`block text-xs font-bold text-navy mb-1.5 ${
                        currentLang === "hi" ? "font-hindi" : ""
                      }`}
                    >
                      {currentLang === "hi" ? "संपर्क का पसंदीदा माध्यम" : "Preferred Contact Method"}
                    </label>
                    <div className="flex gap-6 text-xs pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="contactMethod"
                          value="whatsapp"
                          checked={contactMethod === "whatsapp"}
                          onChange={(e) => setContactMethod(e.target.value)}
                          className="accent-brandred"
                        />
                        <span className={currentLang === "hi" ? "font-hindi" : ""}>
                          {currentLang === "hi" ? "व्हाट्सएप मैसेज (WhatsApp)" : "WhatsApp Chat"}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="contactMethod"
                          value="phone"
                          checked={contactMethod === "phone"}
                          onChange={(e) => setContactMethod(e.target.value)}
                          className="accent-brandred"
                        />
                        <span className={currentLang === "hi" ? "font-hindi" : ""}>
                          {currentLang === "hi" ? "फोन कॉल (Phone Call)" : "Direct Phone Call"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Additional Notes / Details */}
                  <div>
                    <label
                      className={`block text-xs font-bold text-navy mb-1.5 ${
                        currentLang === "hi" ? "font-hindi" : ""
                      }`}
                    >
                      {currentLang === "hi" ? "अपनी आवश्यकता का विवरण / निर्देश" : "Requirement Details / Notes"}
                    </label>
                    <textarea
                      rows={3}
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      placeholder={
                        currentLang === "hi"
                          ? "प्रिंटिंग, फॉर्म या किसी अन्य कार्य का विवरण यहाँ लिखें..."
                          : "Describe your requirement, quantity, dates or specific instructions..."
                      }
                      className="w-full rounded-xl border border-line bg-slate-50 px-4 py-3 text-xs sm:text-sm text-ink outline-none transition-all focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
                    />
                  </div>

                  {/* File Security Reminder */}
                  <p className={`text-[11px] text-muted ${currentLang === "hi" ? "font-hindi" : ""}`}>
                    {currentLang === "hi"
                      ? "💡 नोट: आपकी फाइलें आपके डिवाइस पर सुरक्षित रहती हैं — फॉर्म सबमिट होने के बाद व्हाट्सएप चैट में सीधे फोटो या पीडीएफ साझा करें।"
                      : "💡 Note: Files stay secure on your device — you can attach sample images or PDFs directly inside WhatsApp chat."}
                  </p>

                  {/* Submit Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-2 rounded-pill bg-brandred px-7 py-3 text-sm font-bold text-white shadow-card transition-all hover:bg-navy hover:scale-[1.02] cursor-pointer ${
                        currentLang === "hi" ? "font-hindi" : ""
                      }`}
                    >
                      <Send size={16} />
                      <span>
                        {currentLang === "hi" ? "व्हाट्सएप द्वारा अनुरोध भेजें" : "Submit Request via WhatsApp"}
                      </span>
                    </button>

                    <a
                      href={getWhatsAppLink("Hello Palak Enterprises, I have a quick inquiry.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-pill border border-line bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-navy transition-colors hover:bg-slate-100 ${
                        currentLang === "hi" ? "font-hindi" : ""
                      }`}
                    >
                      <MessageCircle size={16} />
                      <span>{currentLang === "hi" ? "सीधे व्हाट्सएप करें" : "Direct WhatsApp"}</span>
                    </a>

                    <a
                      href={getCallLink()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-brandred pl-2 transition-colors"
                    >
                      <Phone size={14} />
                      <span>+91 {business.phones[0]}</span>
                    </a>
                  </div>
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

