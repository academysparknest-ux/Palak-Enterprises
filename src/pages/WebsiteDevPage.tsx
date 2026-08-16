import React from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import {
  Smartphone,
  Languages,
  MapPin,
  MessageSquare,
  Phone,
  ArrowRight,
} from "lucide-react";

interface WebsiteDevPageProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const WebsiteDevPage: React.FC<WebsiteDevPageProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const websitesWeBuild = [
    {
      title: { en: "School & College Websites", hi: "स्कूल एवं कॉलेज वेबसाइट" },
      desc: {
        en: "Showcase facilities, faculty, admission forms, notice boards, and student achievements online.",
        hi: "सुविधाएं, शिक्षक विवरण, ऑनलाइन एडमिशन फॉर्म, नोटिस बोर्ड और फोटो गैलरी।",
      },
      tag: { en: "Education", hi: "शिक्षा" },
    },
    {
      title: { en: "Coaching Institutes & Academies", hi: "कोचिंग संस्थान एवं ट्यूशन सेंटर" },
      desc: {
        en: "Display course offerings, batch timings, topper results, fee details, and inquiry forms.",
        hi: "कोर्स सूची, बैच समय, टॉपर्स परिणाम, फीस विवरण एवं पूछताछ फॉर्म।",
      },
      tag: { en: "Coaching", hi: "कोचिंग" },
    },
    {
      title: { en: "Local Shops & Retail Catalogs", hi: "दुकानें एवं खुदरा शोरूम" },
      desc: {
        en: "Product catalogs with direct WhatsApp ordering buttons, Google Maps location, and offers.",
        hi: "उत्पाद कैटलॉग, डायरेक्ट व्हाट्सएप ऑर्डर बटन, दुकान का लोकेशन और ऑफर।",
      },
      tag: { en: "Retail", hi: "व्यापार" },
    },
    {
      title: { en: "Doctors, Clinics & Hospitals", hi: "डॉक्टर एवं क्लिनिक वेबसाइट" },
      desc: {
        en: "Doctor credentials, consultation timings, clinic location, and appointment contact.",
        hi: "डॉक्टर प्रोफाइल, परामर्श समय, क्लिनिक का पता एवं डायरेक्ट कॉल सुविधा।",
      },
      tag: { en: "Healthcare", hi: "स्वास्थ्य" },
    },
    {
      title: { en: "Service Providers & Enterprises", hi: "व्यापारी एवं स्थानीय सेवा प्रदाता" },
      desc: {
        en: "Contractors, printing presses, manufacturers, event planners, and local businesses.",
        hi: "ठेकेदार, प्रिंटिंग प्रेस, विनिर्माता, इवेंट प्लानर और स्थानीय उद्यम।",
      },
      tag: { en: "Business", hi: "उद्यम" },
    },
    {
      title: { en: "Personal Portfolios & Resumes", hi: "व्यक्तिगत पोर्टफोलियो व बायोडाटा" },
      desc: {
        en: "Digital portfolio showcasing your skills, career experience, projects, and certifications.",
        hi: "अपने कौशल, प्रोजेक्ट्स, कार्य अनुभव और प्रमाणपत्रों को ऑनलाइन प्रदर्शित करें।",
      },
      tag: { en: "Personal", hi: "व्यक्तिगत" },
    },
  ];

  const processSteps = [
    {
      step: "01",
      title: { en: "Discuss", hi: "चर्चा (Discuss)" },
      desc: {
        en: "We understand your business needs, target customers, and essential features.",
        hi: "हम आपकी व्यावसायिक आवश्यकताओं, ग्राहकों और जरूरी सुविधाओं को समझते हैं।",
      },
    },
    {
      step: "02",
      title: { en: "Plan", hi: "योजना (Plan)" },
      desc: {
        en: "We organize the pages, bilingual content (Hindi + English), and navigation structure.",
        hi: "पेज संरचना, हिंदी-अंग्रेजी द्विभाषी सामग्री और नेविगेशन की योजना बनाते हैं।",
      },
    },
    {
      step: "03",
      title: { en: "Design", hi: "डिज़ाइन (Design)" },
      desc: {
        en: "Clean, fast-loading, mobile-friendly interface styled for your brand.",
        hi: "आधुनिक, तेज़ और मोबाइल पर बेहतरीन दिखने वाला साफ़-सुथरा लेआउट डिज़ाइन।",
      },
    },
    {
      step: "04",
      title: { en: "Develop", hi: "विकास (Develop)" },
      desc: {
        en: "Writing fast, accessible code with WhatsApp, Google Maps, and form integrations.",
        hi: "व्हाट्सएप चैट, गूगल मैप्स और फॉर्म इंटीग्रेशन के साथ कोड तैयार करना।",
      },
    },
    {
      step: "05",
      title: { en: "Launch", hi: "लॉन्च (Launch)" },
      desc: {
        en: "Domain connection, live deployment on Google, and ongoing maintenance support.",
        hi: "डोमेन कनेक्ट करना, वेबसाइट को गूगल पर लाइव करना और मेंटेनेंस सहायता।",
      },
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Custom Website Development in Chakia | Palak Enterprises",
          hi: "कस्टम वेबसाइट निर्माण चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Professional, fast, mobile-friendly bilingual websites for schools, coaching institutes, shops, and businesses in Chakia and Bihar. Google Maps and WhatsApp integrated.",
          hi: "चकिया और बिहार के स्कूलों, कोचिंग, दुकानों और व्यवसायों के लिए आधुनिक, तेज़, मोबाइल-फ्रेंडली द्विभाषी वेबसाइट निर्माण।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Services", hi: "सेवाएँ" }, path: "/services" },
          { label: { en: "Website Development", hi: "वेबसाइट डेवलपमेंट" } },
        ]}
        badge={{
          en: "Custom Digital Solutions",
          hi: "कस्टम डिजिटल समाधान",
        }}
        title={{
          en: "Professional Website Development",
          hi: "व्यवसाय व शिक्षण संस्थानों हेतु वेबसाइट निर्माण",
        }}
        subtitle={{
          en: "Modern, high-performance, mobile-first websites with bilingual Hindi/English support, direct WhatsApp integration, and local SEO presence.",
          hi: "गूगल पर अपने व्यापार की मजबूत पहचान बनाएं — मोबाइल-फ्रेंडली, हिंदी-अंग्रेजी द्विभाषी और व्हाट्सएप इंटीग्रेशन के साथ।",
        }}
        primaryCta={{
          label: { en: "Request Website Consultation", hi: "वेबसाइट परामर्श लें" },
          to: "/request?service=website-development",
        }}
        secondaryCta={{
          label: { en: "WhatsApp Discussion", hi: "व्हाट्सएप पर बात करें" },
          to: `https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20get%20a%20website%20developed.`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Key Highlights */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {[
            {
              icon: Smartphone,
              title: { en: "100% Mobile Friendly", hi: "पूर्णतः मोबाइल अनुकूल" },
              desc: { en: "Looks stunning on all smartphones, tablets, and laptops.", hi: "सभी मोबाइल और कंप्यूटर स्क्रीन पर एकदम साफ़ और सुंदर।" },
            },
            {
              icon: Languages,
              title: { en: "Bilingual (EN + हिन्दी)", hi: "द्विभाषी सुविधा" },
              desc: { en: "Easily switchable between English and Hindi for local reach.", hi: "स्थानीय ग्राहकों और अभिभावकों के लिए आसान भाषा स्विच।" },
            },
            {
              icon: MessageSquare,
              title: { en: "Direct WhatsApp Button", hi: "व्हाट्सएप चैट सुविधा" },
              desc: { en: "Visitors can contact and inquire with a single tap.", hi: "ग्राहक एक क्लिक में आपके व्हाट्सएप पर मैसेज भेज सकते हैं।" },
            },
            {
              icon: MapPin,
              title: { en: "Google Maps Presence", hi: "गूगल मैप्स लोकेशन" },
              desc: { en: "Help nearby customers find your exact business location.", hi: "ग्राहकों को आपकी दुकान या संस्थान का सही रास्ता दिखाना।" },
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-navy flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">{item.title[currentLang]}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc[currentLang]}</p>
              </div>
            );
          })}
        </div>

        {/* What We Build Grid */}
        <div className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-navy bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
              {currentLang === "hi" ? "हम क्या बनाते हैं?" : "What We Build"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
              {currentLang === "hi" ? "हर प्रकार के स्थानीय व्यवसाय के लिए वेबसाइट" : "Websites Tailored to Your Field"}
            </h2>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              {currentLang === "hi"
                ? "सरल, आधुनिक और उच्च गुणवत्ता वाली वेबसाइट जो आपके काम को आगे बढ़ाए।"
                : "Customized digital presence designed to attract more local clients."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {websitesWeBuild.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-navy/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-navy bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-block mb-3">
                    {item.tag[currentLang]}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg">{item.title[currentLang]}</h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">{item.desc[currentLang]}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenRequestModal("website-development")}
                    className="text-xs font-bold text-navy hover:text-brandred flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{currentLang === "hi" ? "इसकी चर्चा करें" : "Discuss This Option"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5-Step Process */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-raised mb-16 relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3.5 py-1 rounded-full uppercase tracking-wider">
              {currentLang === "hi" ? "निर्माण प्रक्रिया" : "Our Process"}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-3">
              {currentLang === "hi" ? "सरल 5 चरणों में आपकी वेबसाइट लाइव" : "From Concept to Live in 5 Simple Steps"}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {processSteps.map((p) => (
              <div
                key={p.step}
                className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 relative hover:border-slate-600 transition-all"
              >
                <span className="text-2xl font-black text-amber-400 block mb-2">{p.step}</span>
                <h4 className="font-bold text-white text-base mb-1">{p.title[currentLang]}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{p.desc[currentLang]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Consultation Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center max-w-3xl mx-auto space-y-6">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            {currentLang === "hi" ? "आज ही अपनी वेबसाइट पर चर्चा शुरू करें" : "Ready to Build Your Website?"}
          </h3>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {currentLang === "hi"
              ? "हमारे केंद्र पर आकर प्रो. कुमार पंकज से मिलें या सीधे फोन/व्हाट्सएप पर अपनी आवश्यकता साझा करें।"
              : "Meet Pro. Kumar Pankaj at our center near Block Gate, Chakia or contact us via phone/WhatsApp to get an instant transparent quote."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/request?service=website-development"
              className="px-6 py-3.5 rounded-pill bg-brandred hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all"
            >
              {currentLang === "hi" ? "वेबसाइट फॉर्म भरें" : "Submit Website Request"}
            </Link>

            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20discuss%20building%20a%20website.`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 rounded-pill bg-leaf hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Us</span>
            </a>

            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="px-6 py-3.5 rounded-pill bg-navy hover:bg-navy/90 text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call {businessConfig.phoneNumbers.primary}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteDevPage;
