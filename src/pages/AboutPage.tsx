import React from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig, business, getWhatsAppLink, getCallLink, getDirectionsLink } from "../config/business";
import {
  Building,
  Target,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Award,
  Phone,
  MessageCircle,
  MapPin,
  ArrowRight,
  Printer,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

export const AboutPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="bg-canvas min-h-screen pb-16">
      <SEO
        title={{
          en: "About Palak Enterprises & Palak Printing Press | Chakia, Bihar",
          hi: "हमारे बारे में | पालक इंटरप्राइजेज एवं पालक प्रिंटिंग प्रेस चकिया",
        }}
        description={{
          en: "Learn about Palak Enterprises and Palak Printing Press in Chakia, East Champaran, Bihar. Founded & managed by Kumar Pankaj, registered CSC center and premier printing studio.",
          hi: "पालक इंटरप्राइजेज और पालक प्रिंटिंग प्रेस चकिया, पूर्वी चंपारण। प्रोपराइटर कुमार पंकज के नेतृत्व में प्रिंटिंग व पंजीकृत सीएससी ऑनलाइन सेवा केंद्र।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "About Us", hi: "हमारे बारे में" }, path: "/about" },
        ]}
        badge={{
          en: "Registered CSC · Local & Trusted",
          hi: "पंजीकृत CSC · स्थानीय व भरोसेमंद",
        }}
        title={{
          en: "About Palak Enterprises & Palak Printing Press",
          hi: "पालक इंटरप्राइजेज एवं पालक प्रिंटिंग प्रेस का परिचय",
        }}
        subtitle={{
          en: "Serving Chakia & East Champaran with reliable printing craftsmanship, stationery, custom design, and accessible digital portal services.",
          hi: "चकिया और पूर्वी चंपारण में विश्वसनीय प्रिंटिंग, स्टेशनरी, डिज़ाइन और सरल ऑनलाइन नागरिक सहायता का संगम।",
        }}
        primaryCta={{
          label: { en: "Explore All Services", hi: "सभी सेवाएँ देखें" },
          to: "/services",
        }}
        secondaryCta={{
          label: { en: "View Work Samples", hi: "सैंपल कार्य देखें" },
          to: "/gallery",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-14 space-y-12 sm:space-y-16">
        {/* 1. Introduction & Background */}
        <section className="rounded-card border border-line bg-white p-6 sm:p-10 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-2 rounded-pill bg-brandred/10 px-3.5 py-1 text-xs font-bold text-brandred">
              <Building size={15} />
              <span className={cn(currentLang === "hi" && "font-hindi")}>
                {currentLang === "hi" ? "व्यावसायिक परिचय" : "Business Overview"}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted font-medium">
              <Clock size={14} className="text-leaf" />
              <span>{businessConfig.openingHours[currentLang]}</span>
            </div>
          </div>

          <h2
            className={cn(
              "font-display text-2xl font-extrabold text-navy sm:text-3xl lg:text-4xl",
              currentLang === "hi" && "font-hindi leading-snug"
            )}
          >
            {currentLang === "hi"
              ? "प्रिंटिंग और डिजिटल सेवाओं के लिए आपका भरोसेमंद स्थानीय साथी"
              : "Your Trusted Local Partner for Printing & Digital Services"}
          </h2>

          <div
            className={cn(
              "mt-5 space-y-4 text-base leading-relaxed text-slate-700 sm:text-lg",
              currentLang === "hi" && "font-hindi"
            )}
          >
            <p>
              {currentLang === "hi"
                ? "पालक इंटरप्राइजेज, जो पालक प्रिंटिंग प्रेस के साथ संचालित होता है, नियर ब्लॉक गेट, वार्ड नं. 7, सनिगंज मोहल्ला, चकिया, पूर्वी चंपारण, बिहार स्थित एक स्थापित स्थानीय प्रिंटिंग व डिजिटल सेवा केंद्र है। हम एक ही छत के नीचे प्रिंटिंग उत्पादन, व्यावसायिक स्टेशनरी, कस्टम ग्राफिक डिज़ाइन, दस्तावेज़ निर्माण और सरकारी ऑनलाइन पोर्टल सहायता प्रदान करते हैं।"
                : "Palak Enterprises, operating alongside Palak Printing Press, is an established local printing and digital service center situated near Block Gate, Ward No. 7, Saniganj Mohalla, Chakia, East Champaran, Bihar. We offer a comprehensive ecosystem of print production, business stationery, custom graphic designing, document preparation, and government online portal assistance under one roof."}
            </p>
            <p>
              {currentLang === "hi"
                ? "स्थानीय नागरिकों, विद्यार्थियों, दुकानदारों, विद्यालयों, कोचिंग संस्थानों और व्यावसायिक प्रतिष्ठानों तक आधुनिक प्रिंटिंग तकनीक और पारदर्शी ऑनलाइन सहायता पहुँचाने के उद्देश्य से, हम समयबद्ध सेवा, उचित मूल्य और उच्च गुणवत्ता के लिए निरंतर समर्पित हैं।"
                : "Founded with the aim of bringing modern printing technology and transparent online assistance to individuals, students, local shopkeepers, schools, coaching institutes, and businesses, we are committed to prompt service, honest pricing, and exceptional output quality."}
            </p>
          </div>

          {/* Quick Registration Details Badges */}
          <div className="mt-8 flex flex-wrap gap-3 pt-4 border-t border-line">
            <span className="inline-flex items-center gap-2 rounded-pill bg-leaf/10 border border-leaf/30 px-4 py-2 text-xs sm:text-sm font-bold text-leaf">
              <ShieldCheck size={16} />
              <span>CSC Registration ID: <strong>{business.registrations.cscId}</strong></span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-pill bg-navy/10 border border-navy/20 px-4 py-2 text-xs sm:text-sm font-bold text-navy">
              <Award size={16} />
              <span>MSME Udyam: <strong>{business.registrations.udyamNo}</strong></span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-pill bg-amber-50 border border-amber-200 px-4 py-2 text-xs sm:text-sm font-bold text-amber-900">
              <Sparkles size={16} className="text-saffron" />
              <span>Proprietor: <strong>{business.owner[currentLang]}</strong></span>
            </span>
          </div>
        </section>

        {/* 2. Mission & Vision */}
        <section className="grid gap-8 md:grid-cols-2">
          {/* Mission */}
          <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between transition-all hover:border-brandred/40 hover:shadow-raised">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandred/10 text-brandred mb-4">
                <Target size={26} />
              </div>
              <h3
                className={cn(
                  "font-display text-xl font-bold text-navy sm:text-2xl",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi" ? "हमारा उद्देश्य (Our Mission)" : "Our Mission"}
              </h3>
              <p
                className={cn(
                  "mt-3 text-base leading-relaxed text-slate-700",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi"
                  ? "अपने क्षेत्र के प्रत्येक नागरिक, विद्यार्थी और व्यावसायिक प्रतिष्ठान को सुलभ, विश्वसनीय और उच्च स्तरीय प्रिंटिंग व डिजिटल सेवाएँ प्रदान करना, जिससे उन्हें सटीक, समयबद्ध और किफ़ायती समाधान मिल सके।"
                  : "To deliver accessible, dependable, and high-standard printing and digital documentation services to our community, ensuring that every individual and business receives accurate, timely, and cost-effective solutions."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-brandred">
              <CheckCircle2 size={15} />
              <span>{currentLang === "hi" ? "सटीक व समयबद्ध डिलीवरी" : "Accurate & Timely Execution"}</span>
            </div>
          </div>

          {/* Vision */}
          <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between transition-all hover:border-navy/40 hover:shadow-raised">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/10 text-navy mb-4">
                <Eye size={26} />
              </div>
              <h3
                className={cn(
                  "font-display text-xl font-bold text-navy sm:text-2xl",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi" ? "हमारा दृष्टिकोण (Our Vision)" : "Our Vision"}
              </h3>
              <p
                className={cn(
                  "mt-3 text-base leading-relaxed text-slate-700",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi"
                  ? "चकिया एवं पूर्वी चंपारण क्षेत्र का सबसे भरोसेमंद वन-स्टॉप प्रिंटिंग, डिज़ाइन और डिजिटल सेवा केंद्र बनना, जो अपनी उत्कृष्ट गुणवत्ता, ग्राहक संतुष्टि और तकनीकी विश्वसनीयता के लिए जाना जाए।"
                  : "To be the most trusted one-stop printing, design, and digital service destination in the region, recognized for exceptional craftsmanship, customer satisfaction, and technological reliability."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-navy">
              <CheckCircle2 size={15} />
              <span>{currentLang === "hi" ? "उत्कृष्ट गुणवत्ता व ग्राहक संतुष्टि" : "Craftsmanship & Trust"}</span>
            </div>
          </div>
        </section>

        {/* 3. The Two Core Operational Pillars */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-brandred uppercase tracking-wider bg-red-50 px-3.5 py-1 rounded-full border border-red-200">
              {currentLang === "hi" ? "हमारे दो प्रमुख प्रभाग" : "Our Operational Pillars"}
            </span>
            <h2
              className={cn(
                "mt-3 font-display text-2xl font-black text-navy sm:text-3xl",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "प्रिंटिंग स्टूडियो और ऑनलाइन सेवा केंद्र" : "Dual Identity: Print Studio & Digital Center"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pillar 1: Printing Press */}
            <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-navy flex items-center justify-center mb-4">
                  <Printer className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">
                  {business.unit[currentLang]}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {currentLang === "hi"
                    ? "दस्तावेज़ फोटोकॉपी, रंगीन प्रिंट, 5 मिनट में स्टूडियो पासपोर्ट फोटो, लैमिनेशन, पीवीसी स्मार्ट आईडी कार्ड, शादी-तिलक निमंत्रण कार्ड, बिल बुक और प्रचार फ्लेक्स बैनर का उच्च-गुणवत्ता मुद्रण केंद्र।"
                    : "The printing wing dedicated to fast black & white and vibrant color printing, 5-minute instant passport photos, lamination, wedding invitation cards, visiting cards, bill books, and outdoor flex banners."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/printing"
                  className="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-brandred transition-colors"
                >
                  <span>{currentLang === "hi" ? "प्रिंटिंग सेवाएँ देखें" : "Explore Printing Services"}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Pillar 2: Online Service Center */}
            <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">
                  {currentLang === "hi" ? "ऑनलाइन सेवा केंद्र (CSC Helpdesk)" : "Online Service Center (CSC Helpdesk)"}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {currentLang === "hi"
                    ? "सरकारी नौकरी फॉर्म, प्रवेश परीक्षा, जाति-आय-निवास प्रमाण पत्र (RTPS), ई-श्रम, आधार प्रिंट, पेंशन योजनाएँ और स्थानीय व्यवसायों के लिए आधुनिक वेबसाइट निर्माण में समर्पित मार्गदर्शन।"
                    : "The digital facilitation desk assisting citizens with online job forms, RTPS certificate filings (caste/income/residence), pension applications, Aadhaar prints, and custom bilingual website development."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/online-services"
                  className="inline-flex items-center gap-2 text-sm font-bold text-leaf hover:text-navy transition-colors"
                >
                  <span>{currentLang === "hi" ? "ऑनलाइन सेवाएँ देखें" : "Explore Online Services"}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Core Values */}
        <section className="rounded-card border border-line bg-white p-6 sm:p-10 shadow-card">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold text-saffron uppercase tracking-wider bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full">
              {currentLang === "hi" ? "हमारे आधारभूत सिद्धांत" : "What Guides Us"}
            </span>
            <h2
              className={cn(
                "mt-3 font-display text-2xl font-extrabold text-navy sm:text-3xl",
                currentLang === "hi" && "font-hindi"
              )}
            >
              {currentLang === "hi" ? "हमारे मुख्य सिद्धांत (Core Values)" : "Our Core Values"}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: { en: "Quality & Precision", hi: "गुणवत्ता व सटीकता" },
                desc: {
                  en: "We maintain high standards across color reproduction, paper selection, typography, and finishing.",
                  hi: "हम कलर प्रिंटिंग, पेपर चयन, टाइपोग्राफी और फिनिशिंग के हर पहलू पर उच्च गुणवत्ता सुनिश्चित करते हैं।",
                },
              },
              {
                title: { en: "Customer-First Approach", hi: "ग्राहक-हित सर्वोपरि" },
                desc: {
                  en: "We actively listen to customer requirements and offer tailored solutions that fit both purpose and budget.",
                  hi: "हम ग्राहकों की आवश्यकताओं को ध्यान से समझते हैं और उनके बजट व उद्देश्य के अनुसार सही सलाह व सेवा देते हैं।",
                },
              },
              {
                title: { en: "Integrity & Transparency", hi: "ईमानदारी व पारदर्शिता" },
                desc: {
                  en: "Upfront pricing, authentic assistance, and complete confidentiality of personal and business documents.",
                  hi: "उचित व स्पष्ट मूल्य, वास्तविक सहायता और व्यक्तिगत व व्यावसायिक दस्तावेज़ों की पूर्ण गोपनीयता।",
                },
              },
              {
                title: { en: "Community Commitment", hi: "स्थानीय समाज के प्रति समर्पण" },
                desc: {
                  en: "Proudly supporting local students, small enterprises, and families across Chakia and surrounding areas.",
                  hi: "चकिया और आस-पास के विद्यार्थियों, छोटे व्यापारियों और परिवारों की ज़रूरतों को प्राथमिकता से पूरा करना।",
                },
              },
            ].map((v, i) => (
              <div
                key={i}
                className="rounded-2xl border border-line bg-canvas p-5 transition-all hover:border-navy/30 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white text-xs font-bold shadow-xs">
                  <CheckCircle2 size={20} className="text-saffron-light" />
                </div>
                <h4
                  className={cn(
                    "mt-3 font-display text-base font-bold text-navy sm:text-lg",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {v.title[currentLang]}
                </h4>
                <p
                  className={cn(
                    "mt-2 text-xs sm:text-sm leading-relaxed text-slate-600",
                    currentLang === "hi" && "font-hindi"
                  )}
                >
                  {v.desc[currentLang]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Service Philosophy & Official Verification Card */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="rounded-card border border-line bg-white p-6 sm:p-8 shadow-card flex flex-col justify-between h-full">
            <div>
              <h2
                className={cn(
                  "font-display text-2xl font-extrabold text-navy sm:text-3xl",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi" ? "हमारा कार्य दर्शन (Service Philosophy)" : "Our Service Philosophy"}
              </h2>
              <p
                className={cn(
                  "mt-4 text-base leading-relaxed text-slate-700",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi"
                  ? "हमारा मानना है कि चाहे ग्राहक को एक त्वरित प्रिंटेड बायोडाटा या पासपोर्ट फोटो चाहिए हो या दस हज़ार रंगीन प्रचार पम्पलेट, हर काम में उच्चतम ध्यान, स्पष्ट संवाद और समयबद्धता होनी चाहिए। पालक इंटरप्राइजेज और पालक प्रिंटिंग प्रेस की दोहरी पहचान हमें भारी प्रिंटिंग उत्पादन और संवेदनशील ऑनलाइन पोर्टल कार्यों दोनों में दक्ष बनाती है।"
                  : "We believe that whether a customer needs a single urgently printed biodata or ten thousand full-color promotional flyers, every job deserves the highest standard of care, clear communication, and timely execution. Our dual identity as Palak Enterprises and Palak Printing Press ensures versatility across heavy print production and intricate digital portal applications."}
              </p>
            </div>

            <div className="mt-8 border-t border-line pt-5 flex flex-wrap gap-4">
              <Link
                to="/services"
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill bg-brandred px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-navy transition-colors",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi" ? "हमारी सेवाएँ देखें" : "Explore All Services"}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/gallery"
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill border border-line bg-canvas px-5 py-2.5 text-sm font-bold text-navy hover:bg-slate-200 transition-colors",
                  currentLang === "hi" && "font-hindi"
                )}
              >
                {currentLang === "hi" ? "सैंपल कार्य देखें" : "View Samples Gallery"}
              </Link>
            </div>
          </div>

          {/* Official Verification Table Box */}
          <div className="rounded-card border border-slate-700 bg-slate-900 p-6 sm:p-8 text-white shadow-raised">
            <h3
              className={cn(
                "font-display text-xl font-bold text-amber-400 flex items-center gap-2",
                currentLang === "hi" && "font-hindi"
              )}
            >
              <ShieldCheck size={20} />
              <span>{currentLang === "hi" ? "आधिकारिक पंजीकरण व विवरण" : "Official Verification Details"}</span>
            </h3>
            <dl className="mt-5 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-slate-400">{currentLang === "hi" ? "मुख्य ब्रांड" : "Main Brand"}</dt>
                <dd className="font-bold text-white">{business.name[currentLang]}</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-slate-400">{currentLang === "hi" ? "प्रिंटिंग प्रेस यूनिट" : "Press Unit"}</dt>
                <dd className="font-bold text-white">{business.unit[currentLang]}</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-slate-400">{currentLang === "hi" ? "प्रोपराइटर" : "Proprietor"}</dt>
                <dd className="font-bold text-white">{business.owner[currentLang]}</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-slate-400">CSC Center ID</dt>
                <dd className="font-mono font-bold text-amber-300">{business.registrations.cscId}</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-slate-400">MSME Udyam No.</dt>
                <dd className="font-mono font-bold text-amber-300">{business.registrations.udyamNo}</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-slate-400">{currentLang === "hi" ? "पता" : "Location"}</dt>
                <dd className="font-semibold text-white text-right max-w-[200px] sm:max-w-xs">
                  {businessConfig.address.fullAddress[currentLang]}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 6. Contact CTA */}
        <section className="rounded-card bg-leaf/10 border border-leaf/30 p-8 text-center sm:p-12 shadow-card">
          <h2
            className={cn(
              "font-display text-2xl font-extrabold text-navy sm:text-3xl",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi"
              ? "क्या आपके पास कोई सवाल या प्रिंटिंग की ज़रूरत है?"
              : "Have a Question or Need a Service Quote?"}
          </h2>
          <p
            className={cn(
              "mt-3 text-base text-slate-700 max-w-2xl mx-auto leading-relaxed",
              currentLang === "hi" && "font-hindi"
            )}
          >
            {currentLang === "hi"
              ? "हमारी टीम आपकी सहायता के लिए तैयार है। सीधे कॉल करें या व्हाट्सएप पर बात करें।"
              : "Our team is ready to assist you. Contact us directly by phone, WhatsApp, or visit our center in Chakia for quick support."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href={getCallLink()}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill bg-brandred px-6 py-3 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]",
                currentLang === "hi" && "font-hindi"
              )}
            >
              <Phone size={16} />
              {currentLang === "hi" ? "कॉल करें: +91 99052 38015" : "Call: +91 99052 38015"}
            </a>
            <a
              href={getWhatsAppLink("Hello Palak Enterprises, I would like to inquire about your services.")}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-pill bg-leaf px-6 py-3 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]",
                currentLang === "hi" && "font-hindi"
              )}
            >
              <MessageCircle size={16} />
              WhatsApp Us
            </a>
            <a
              href={getDirectionsLink()}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-pill bg-navy px-6 py-3 text-sm font-bold text-white shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]",
                currentLang === "hi" && "font-hindi"
              )}
            >
              <MapPin size={16} />
              {currentLang === "hi" ? "गूगल मैप पर रास्ता देखें" : "Get Directions"}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
