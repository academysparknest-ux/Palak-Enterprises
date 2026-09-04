import React from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { websiteProjects } from "../config/projects";
import { ScrollReveal } from "../components/ui/motion/ScrollReveal";
import { AnimatedButton } from "../components/ui/motion/AnimatedButton";
import {
  Smartphone,
  Languages,
  MapPin,
  MessageSquare,
  Phone,
  ArrowRight,
  ExternalLink,
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
  Database,
} from "lucide-react";

interface WebsiteDevPageProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const WebsiteDevPage: React.FC<WebsiteDevPageProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const websitesWeBuild = [
    {
      title: { en: "School & College Websites & ERP", hi: "स्कूल एवं कॉलेज वेबसाइट व ईआरपी" },
      desc: {
        en: "Showcase facilities, faculty, admission forms, notice boards, student fee management, and report cards online.",
        hi: "सुविधाएं, शिक्षक विवरण, ऑनलाइन एडमिशन फॉर्म, नोटिस बोर्ड, फीस प्रबंधन एवं डिजिटल रिपोर्ट कार्ड।",
      },
      tag: { en: "Education & ERP", hi: "शिक्षा एवं ईआरपी" },
    },
    {
      title: { en: "Coaching Institutes & Academies", hi: "कोचिंग संस्थान एवं ट्यूशन सेंटर" },
      desc: {
        en: "Display course offerings, batch timings, topper results, fee details, and student inquiry forms.",
        hi: "कोर्स सूची, बैच समय, टॉपर्स परिणाम, फीस विवरण एवं पूछताछ फॉर्म।",
      },
      tag: { en: "Coaching", hi: "कोचिंग" },
    },
    {
      title: { en: "Local Shops & Retail Catalogs", hi: "दुकानें एवं खुदरा शोरूम" },
      desc: {
        en: "Product catalogs with direct WhatsApp ordering buttons, Google Maps location, and seasonal offers.",
        hi: "उत्पाद कैटलॉग, डायरेक्ट व्हाट्सएप ऑर्डर बटन, दुकान का लोकेशन और विशेष ऑफर।",
      },
      tag: { en: "Retail & Commerce", hi: "व्यापार" },
    },
    {
      title: { en: "Doctors, Clinics & Hospitals", hi: "डॉक्टर एवं क्लिनिक वेबसाइट" },
      desc: {
        en: "Doctor credentials, consultation timings, clinic location, and appointment booking inquiries.",
        hi: "डॉक्टर प्रोफाइल, परामर्श समय, क्लिनिक का पता एवं डायरेक्ट कॉल/अपॉइंटमेंट सुविधा।",
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
      title: { en: "Plan & Architecture", hi: "योजना (Plan)" },
      desc: {
        en: "We organize the pages, bilingual content (Hindi + English), and navigation structure.",
        hi: "पेज संरचना, हिंदी-अंग्रेजी द्विभाषी सामग्री और नेविगेशन की योजना बनाते हैं।",
      },
    },
    {
      step: "03",
      title: { en: "Design & UI/UX", hi: "डिज़ाइन (Design)" },
      desc: {
        en: "Clean, fast-loading, mobile-friendly interface styled specifically for your brand.",
        hi: "आधुनिक, तेज़ और मोबाइल पर बेहतरीन दिखने वाला साफ़-सुथरा लेआउट डिज़ाइन।",
      },
    },
    {
      step: "04",
      title: { en: "Develop & Integrate", hi: "विकास (Develop)" },
      desc: {
        en: "Writing high-speed code with WhatsApp, Google Maps, databases, and secure forms.",
        hi: "व्हाट्सएप चैट, गूगल मैप्स, डेटाबेस और फॉर्म इंटीग्रेशन के साथ कोड तैयार करना।",
      },
    },
    {
      step: "05",
      title: { en: "Launch & Support", hi: "लॉन्च (Launch)" },
      desc: {
        en: "Domain connection, live deployment on Google, and ongoing maintenance support.",
        hi: "डोमेन कनेक्ट करना, वेबसाइट को गूगल पर लाइव करना और मेंटेनेंस सहायता।",
      },
    },
  ];

  const techFeatures = [
    {
      icon: Zap,
      title: { en: "Blazing Fast Performance", hi: "सुपरफ़ास्ट परफॉरमेंस" },
      desc: { en: "Sub-second initial load and 99+ Lighthouse performance scores.", hi: "तुरंत लोड होने वाले आधुनिक वेब पेज और 99+ स्पीड स्कोर।" },
    },
    {
      icon: Languages,
      title: { en: "Bilingual Ready (EN + हिन्दी)", hi: "द्विभाषी अनुभव (हिंदी + अंग्रेजी)" },
      desc: { en: "Instant bilingual switching for local rural & urban audience engagement.", hi: "स्थानीय ग्राहकों और अभिभावकों के लिए तुरंत भाषा बदलने की सुविधा।" },
    },
    {
      icon: MessageSquare,
      title: { en: "Direct WhatsApp Inquiries", hi: "व्हाट्सएप 1-क्लिक ऑर्डरिंग" },
      desc: { en: "Visitors can message your business directly on WhatsApp in one click.", hi: "ग्राहक सीधे एक क्लिक में आपके व्हाट्सएप पर संपर्क कर सकते हैं।" },
    },
    {
      icon: Database,
      title: { en: "Secure Cloud Databases", hi: "सुरक्षित क्लाउड डेटाबेस" },
      desc: { en: "PostgreSQL & Supabase cloud databases with automatic daily backups.", hi: "सुरक्षित क्लाउड स्टोरेज, ऑटो बैकअप और रीयल-टाइम डेटा सिंक।" },
    },
    {
      icon: Smartphone,
      title: { en: "100% Mobile Responsive", hi: "सभी डिवाइस पर अनुकूल" },
      desc: { en: "Custom tailored viewports for mobile phones, tablets, and desktops.", hi: "हर स्क्रीन साइज और स्मार्टफोन पर खूबसूरत लेआउट।" },
    },
    {
      icon: MapPin,
      title: { en: "Google Maps & Local SEO", hi: "गूगल मैप्स व लोकल एसईओ" },
      desc: { en: "Optimized for Google search and Google Business Profile discovery in Bihar.", hi: "गूगल सर्च और मैप्स पर आपकी दुकान व संस्थान को आसानी से खोजना।" },
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Custom Website Development & Portfolios in Chakia | Palak Enterprises",
          hi: "कस्टम वेबसाइट निर्माण एवं पोर्टफोलियो चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Professional, fast, mobile-friendly bilingual websites and ERP systems for schools, coaching institutes, shops, and businesses in Chakia, East Champaran, Bihar.",
          hi: "चकिया और बिहार के स्कूलों, कोचिंग, दुकानों और व्यवसायों के लिए आधुनिक, तेज़, मोबाइल-फ्रेंडली द्विभाषी वेबसाइट व ईआरपी निर्माण।",
        }}
        canonicalUrl="/website-development"
        keywords="website development Chakia, website designer East Champaran, school ERP Bihar, coaching institute website, web design Bihar, Palak Enterprises tech"
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Services", hi: "सेवाएँ" }, path: "/services" },
          { label: { en: "Website Development", hi: "वेबसाइट डेवलपमेंट" } },
        ]}
        badge={{
          en: "Custom Digital Solutions & ERP",
          hi: "कस्टम डिजिटल समाधान एवं ईआरपी",
        }}
        title={{
          en: "Professional Website Development & Portfolios",
          hi: "व्यवसाय, स्कूल व संस्थानों हेतु वेबसाइट एवं डिजिटल पोर्टफोलियो",
        }}
        subtitle={{
          en: "Modern, high-performance, mobile-first websites with bilingual Hindi/English support, direct WhatsApp integration, and local SEO presence.",
          hi: "गूगल पर अपने व्यापार और संस्थान की मजबूत डिजिटल पहचान बनाएं — मोबाइल-फ्रेंडली, हिंदी-अंग्रेजी द्विभाषी और व्हाट्सएप इंटीग्रेशन के साथ।",
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 space-y-16 sm:space-y-20">
        {/* ========================================================================= */}
        {/* 1. DETAILED LIVE PROJECTS & CASE STUDIES SHOWCASE GALLERY */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#123B70]">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{currentLang === "hi" ? "हमारे लाइव प्रोजेक्ट्स" : "Featured Case Studies"}</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2.5">
              {currentLang === "hi" ? "हमारे द्वारा निर्मित लाइव वेबसाइट्स एवं सिस्टम्स" : "Websites & Software We've Built"}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1.5">
              {currentLang === "hi"
                ? "पूर्वी चंपारण और बिहार के प्रतिष्ठित स्कूलों, संस्थानों एवं व्यवसायों के लिए विकसित आधुनिक वेब समाधान।"
                : "Explore production-grade digital platforms, school portals, and web applications built for real institutions."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {websiteProjects.map((project) => (
              <ScrollReveal key={project.id} direction="up" distancePx={20}>
                <div className="group rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between h-full">
                  <div>
                    {/* Top Browser Frame Mockup */}
                    <div className="bg-slate-100/90 border-b border-slate-200 p-2.5 px-4 flex items-center justify-between text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                      </div>

                      <div className="flex items-center justify-center gap-1 px-3 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 max-w-[240px] truncate font-mono shadow-2xs">
                        <Lock className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate">https://{project.displayUrl}</span>
                      </div>

                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        LIVE
                      </span>
                    </div>

                    {/* Screenshot Viewport */}
                    <div className="relative aspect-16/10 w-full bg-slate-900 overflow-hidden">
                      <img
                        src={project.image}
                        alt={`${project.name[currentLang]} screenshot`}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.025] will-change-transform"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-40 group-hover:opacity-60 transition-opacity"
                      />
                    </div>

                    {/* Case Study Details */}
                    <div className="p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#123B70] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                          {project.category[currentLang]}
                        </span>
                        {project.highlightBadge && (
                          <span className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                            {project.highlightBadge[currentLang]}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                        {project.name[currentLang]}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {project.description[currentLang]}
                      </p>

                      {/* Key Highlights */}
                      {project.keyHighlights && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            {currentLang === "hi" ? "मुख्य विशेषताएं" : "Key Platform Features"}
                          </span>
                          <div className="space-y-1">
                            {project.keyHighlights.map((hl, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{hl[currentLang]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tech Stack Pills */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          {currentLang === "hi" ? "तकनीक (Tech Stack)" : "Technology Stack"}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {project.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-4">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1"
                    >
                      <AnimatedButton
                        variant="primary"
                        size="md"
                        iconLeft={<ExternalLink className="h-4 w-4" />}
                        className="w-full bg-[#123B70] hover:bg-[#0c274c] text-white font-extrabold shadow-sm"
                      >
                        {currentLang === "hi" ? "लाइव वेबसाइट खोलें ↗" : "Launch Live Website ↗"}
                      </AnimatedButton>
                    </a>

                    <button
                      type="button"
                      onClick={() => onOpenRequestModal("website-development")}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {currentLang === "hi" ? "समान बनवाएं" : "Build Similar"}
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. TECHNICAL CAPABILITIES & VALUE PILLARS */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#123B70] bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
              {currentLang === "hi" ? "तकनीकी क्षमताएं" : "Engineering Standards"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
              {currentLang === "hi" ? "हम केवल टेम्पलेट नहीं, तेज़ और सुरक्षित सिस्टम बनाते हैं" : "Why Our Websites Perform Better"}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {techFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123B70] border border-blue-200/60 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{feat.title[currentLang]}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{feat.desc[currentLang]}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. WHAT WE BUILD CATEGORIES */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#123B70] bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
              {currentLang === "hi" ? "हम क्या बनाते हैं?" : "What We Build"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
              {currentLang === "hi" ? "हर प्रकार के स्थानीय व्यवसाय के लिए वेबसाइट" : "Websites Tailored to Your Domain"}
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
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-md hover:border-[#123B70]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#123B70] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md inline-block mb-3">
                    {item.tag[currentLang]}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg">{item.title[currentLang]}</h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">{item.desc[currentLang]}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenRequestModal("website-development")}
                    className="text-xs font-bold text-[#123B70] hover:text-amber-600 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{currentLang === "hi" ? "इसकी चर्चा करें" : "Discuss This Option"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. 5-STEP DEVELOPMENT ROADMAP */}
        {/* ========================================================================= */}
        <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3.5 py-1 rounded-full uppercase tracking-wider">
              {currentLang === "hi" ? "निर्माण प्रक्रिया" : "Our Process"}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mt-3">
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
        </section>

        {/* ========================================================================= */}
        {/* 5. ACTION CONSULTATION BOX */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{currentLang === "hi" ? "पारदर्शी मूल्य निर्धारण व सहायता" : "Transparent Pricing & Direct Support"}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
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
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-md transition-all"
            >
              {currentLang === "hi" ? "वेबसाइट फॉर्म भरें" : "Submit Website Request"}
            </Link>

            <a
              href={`https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20discuss%20building%20a%20website.`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Us</span>
            </a>

            <a
              href={`tel:${businessConfig.phoneNumbers.primary}`}
              className="px-6 py-3.5 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white font-bold text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call {businessConfig.phoneNumbers.primary}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WebsiteDevPage;
