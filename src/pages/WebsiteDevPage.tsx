import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { businessConfig } from "../config/business";
import { websiteProjects, type WebsiteProject, type ProjectFilterCategory } from "../config/projects";
import { AnimatedButton } from "../components/ui/motion/AnimatedButton";
import { cn } from "../lib/utils";
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
  Monitor,
  Tablet,
  Globe,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Building2,
  Cpu,
  GraduationCap,
  AlertCircle,
} from "lucide-react";

interface WebsiteDevPageProps {
  onOpenRequestModal: (serviceId?: string) => void;
}

export const WebsiteDevPage: React.FC<WebsiteDevPageProps> = ({ onOpenRequestModal }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Filter & Project Showcase State
  const [selectedFilter, setSelectedFilter] = useState<ProjectFilterCategory>("all");
  const [activeProjectId, setActiveProjectId] = useState<string>(websiteProjects[0]?.id || "roshani-public-school");
  const [previewMode, setPreviewMode] = useState<"screenshot" | "interactive">("screenshot");
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeState, setIframeState] = useState<"loading" | "loaded" | "blocked">("loading");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const showcaseTopRef = useRef<HTMLDivElement>(null);

  const filteredProjects = useMemo(() => {
    if (selectedFilter === "all") return websiteProjects;
    return websiteProjects.filter((p) => p.filterCategory === selectedFilter);
  }, [selectedFilter]);

  const activeProject: WebsiteProject = useMemo(() => {
    return websiteProjects.find((p) => p.id === activeProjectId) || filteredProjects[0] || websiteProjects[0];
  }, [activeProjectId, filteredProjects]);

  const handleFilterSelect = (cat: ProjectFilterCategory) => {
    setSelectedFilter(cat);
    const matching = cat === "all" ? websiteProjects : websiteProjects.filter((p) => p.filterCategory === cat);
    if (matching.length > 0 && !matching.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(matching[0].id);
      setPreviewMode("screenshot");
      setIframeState("loading");
    }
  };

  const handleProjectSelect = (id: string) => {
    setActiveProjectId(id);
    setPreviewMode("screenshot");
    setIframeState("loading");
    setIframeKey((prev) => prev + 1);
  };

  // Reset iframe state and trigger timeout fallback whenever switching to interactive or changing project
  useEffect(() => {
    if (previewMode === "interactive") {
      setIframeState("loading");
      const timeout = setTimeout(() => {
        setIframeState((curr) => (curr === "loading" ? "blocked" : curr));
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [previewMode, activeProjectId, iframeKey]);

  const projectIcons: Record<string, React.ReactNode> = {
    "roshani-public-school": <GraduationCap className="h-4 w-4 text-blue-600" />,
    "roshani-public-school-erp": <Layers className="h-4 w-4 text-purple-600" />,
    "ekaagra-technologies": <Cpu className="h-4 w-4 text-emerald-600" />,
    "palak-enterprises-platform": <Building2 className="h-4 w-4 text-amber-600" />,
    "sparknest-academy": <Sparkles className="h-4 w-4 text-indigo-600" />,
  };

  const filterTabs: { id: ProjectFilterCategory; label: { en: string; hi: string } }[] = [
    { id: "all", label: { en: "All", hi: "सभी" } },
    { id: "schools", label: { en: "Schools", hi: "स्कूल व शिक्षा" } },
    { id: "business", label: { en: "Business", hi: "व्यावसायिक" } },
    { id: "ecommerce", label: { en: "E-commerce", hi: "ई-कॉमर्स" } },
    { id: "custom", label: { en: "Custom", hi: "कस्टम" } },
  ];

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
    <div className="bg-slate-50 min-h-screen pb-28 sm:pb-32">
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
        {/* 1. INTERACTIVE WEBSITE DESIGNS SHOWCASE (PORTFOLIO CORE) */}
        {/* ========================================================================= */}
        <section ref={showcaseTopRef} className="space-y-8 sm:space-y-10 scroll-mt-24">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#123B70]">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{currentLang === "hi" ? "वेबसाइट डिज़ाइन व डेवलपमेंट शोकेस" : "WEBSITE DESIGN & DEVELOPMENT SHOWCASE"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              {currentLang === "hi" ? "हमारे द्वारा निर्मित लाइव वेबसाइट्स" : "OUR WEBSITE DESIGNS"}
            </h2>
            <p className="text-sm sm:text-lg font-semibold text-slate-700">
              {currentLang === "hi"
                ? "देखें कि हम आपके व्यवसाय, स्कूल व संस्थान के लिए वास्तव में क्या डिज़ाइन और तैयार कर सकते हैं।"
                : "See what we can actually design and build for you."}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
              {currentLang === "hi"
                ? "पालक इंटरप्राइजेज एवं एकाग्र टेक्नोलॉजीज द्वारा विकसित वास्तविक, गतिशील एवं मोबाइल-फ्रेंडली डिजिटल प्लेटफॉर्म।"
                : "Real websites. Real designs. Built for real businesses by Palak Enterprises & Ekaagra Technologies."}
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
              {filterTabs.map((tab) => {
                const isActive = selectedFilter === tab.id;
                const count = tab.id === "all" ? websiteProjects.length : websiteProjects.filter((p) => p.filterCategory === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFilterSelect(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer active-press",
                      isActive
                        ? "bg-[#123B70] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white/80"
                    )}
                  >
                    <span>{tab.label[currentLang]}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Live Website Preview Mockup Box */}
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-lg overflow-hidden transition-all duration-300">
            {/* Top Browser Bar Chrome */}
            <div className="bg-slate-100/95 border-b border-slate-200/90 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              {/* Left Traffic Lights & Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400 inline-block shadow-2xs" />
                  <span className="h-3 w-3 rounded-full bg-amber-400 inline-block shadow-2xs" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block shadow-2xs" />
                </div>

                {/* Viewport Width Controls */}
                <div className="hidden md:flex items-center bg-white rounded-lg border border-slate-200/80 p-0.5 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setDeviceViewport("desktop")}
                    title="Desktop Preview"
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      deviceViewport === "desktop" ? "bg-slate-100 text-[#123B70] font-bold" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceViewport("tablet")}
                    title="Tablet Preview"
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      deviceViewport === "tablet" ? "bg-slate-100 text-[#123B70] font-bold" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceViewport("mobile")}
                    title="Mobile Preview"
                    className={cn(
                      "p-1.5 rounded-md transition-colors cursor-pointer",
                      deviceViewport === "mobile" ? "bg-slate-100 text-[#123B70] font-bold" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Center Address Bar */}
              <div className="flex items-center justify-center flex-1 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs text-slate-700 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">https://{activeProject.displayUrl}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 ml-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LIVE</span>
                  </div>
                </div>
              </div>

              {/* Right Mode Switcher (Screenshot vs Interactive Live) */}
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("screenshot")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      previewMode === "screenshot"
                        ? "bg-[#123B70] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <ImageIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">{currentLang === "hi" ? "स्क्रीनशॉट" : "Screenshot"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode("interactive");
                      setIframeState("loading");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      previewMode === "interactive"
                        ? "bg-[#123B70] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Globe className="h-3 w-3" />
                    <span className="hidden sm:inline">{currentLang === "hi" ? "लाइव इंटरएक्टिव" : "Live Preview"}</span>
                  </button>
                </div>

                <a
                  href={activeProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open live website in new tab"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#123B70] hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Viewport Frame */}
            <div className="bg-slate-950 p-3 sm:p-6 flex items-center justify-center min-h-[380px] sm:min-h-[500px] overflow-hidden">
              <div
                className={cn(
                  "w-full transition-all duration-300 overflow-hidden relative shadow-2xl",
                  deviceViewport === "desktop" && "max-w-full aspect-[16/10] rounded-xl border border-slate-800",
                  deviceViewport === "tablet" && "max-w-[680px] aspect-[4/3] rounded-2xl border-4 border-slate-800 bg-slate-900 p-1.5",
                  deviceViewport === "mobile" && "max-w-[340px] aspect-[9/18] max-h-[580px] rounded-[32px] border-[6px] border-slate-800 bg-slate-900 p-2"
                )}
              >
                {previewMode === "screenshot" ? (
                  /* High-Resolution Screenshot View */
                  <div className="relative w-full h-full bg-slate-900 group/screen overflow-hidden">
                    <img
                      src={activeProject.image}
                      alt={`${activeProject.name[currentLang]} preview`}
                      loading="eager"
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover/screen:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-end justify-between p-4 text-white pointer-events-none">
                      <span className="text-xs font-semibold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/20">
                        {activeProject.name[currentLang]}
                      </span>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <span>Click Visit Live Website below to open</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Live Interactive Iframe View with Smart Fallback */
                  <div className="relative w-full h-full bg-slate-900">
                    {iframeState === "loading" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 p-6 text-center">
                        <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" />
                        <p className="text-sm font-bold text-slate-200">
                          {currentLang === "hi" ? "लाइव वेबसाइट लोड हो रही है..." : "Connecting to Live Production Portal..."}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm font-mono truncate">
                          https://{activeProject.displayUrl}
                        </p>
                      </div>
                    )}

                    {iframeState === "blocked" ? (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1.5 max-w-md">
                          <h4 className="text-base sm:text-lg font-bold">
                            {currentLang === "hi" ? "सुरक्षित लाइव प्रिव्यू" : "Production Security Sandbox"}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {currentLang === "hi"
                              ? "इस वेबसाइट की सुरक्षा नीतियां सीधे एम्बेडेड फ्रेम में खुलने को सीमित करती हैं। आप इसे सीधे खोल सकते हैं या नीचे इसका हाई-रेजोल्यूशन स्क्रीनशॉट देख सकते हैं।"
                              : "This production website restricts direct third-party iframe embedding for security. You can open the live website directly or switch back to the high-res screenshot view."}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setPreviewMode("screenshot")}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition-colors cursor-pointer"
                          >
                            {currentLang === "hi" ? "स्क्रीनशॉट देखें" : "Switch to High-Res Screenshot"}
                          </button>
                          <a
                            href={activeProject.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>{currentLang === "hi" ? "लाइव वेबसाइट खोलें ↗" : "Visit Live Website ↗"}</span>
                          </a>
                        </div>
                      </div>
                    ) : null}

                    <iframe
                      key={`${activeProject.id}-${iframeKey}`}
                      src={activeProject.url}
                      title={activeProject.name[currentLang]}
                      onLoad={() => setIframeState("loaded")}
                      onError={() => setIframeState("blocked")}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Project Details & Primary Actions (Matching User Wireframe) */}
            <div className="p-6 sm:p-8 bg-white border-t border-slate-200/90 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#123B70] bg-blue-50 px-3 py-1 rounded-md border border-blue-200/60">
                      {activeProject.category[currentLang]}
                    </span>
                    {activeProject.highlightBadge && (
                      <span className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide">
                        {activeProject.highlightBadge[currentLang]}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {activeProject.name[currentLang]}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                    {activeProject.description[currentLang]}
                  </p>

                  {/* Key Highlights with Checkmarks */}
                  {activeProject.keyHighlights && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        {currentLang === "hi" ? "मुख्य विशेषताएं" : "Key Platform Features"}
                      </span>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {activeProject.keyHighlights.map((hl, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{hl[currentLang]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tech Stack Pills */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      {currentLang === "hi" ? "तकनीक (Technology Stack)" : "Technology Stack"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProject.technologies.map((tech) => (
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

                {/* Right Action Buttons (Matching User Wireframe) */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-64 pt-2 lg:pt-0">
                  <a
                    href={activeProject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex"
                  >
                    <AnimatedButton
                      variant="primary"
                      size="lg"
                      iconLeft={<ExternalLink className="h-4 w-4" />}
                      className="w-full bg-[#123B70] hover:bg-[#0c274c] text-white font-extrabold shadow-md justify-center py-3.5"
                    >
                      {currentLang === "hi" ? "पूरी वेबसाइट देखें ↗" : "View Full Website ↗"}
                    </AnimatedButton>
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenRequestModal("website-development")}
                    className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-300 hover:border-[#123B70] text-slate-800 hover:text-[#123B70] hover:bg-blue-50/50 text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active-press shadow-2xs"
                  >
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <span>{currentLang === "hi" ? "समान प्रोजेक्ट पर चर्चा करें" : "Discuss Similar Project"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OTHER PROJECTS Carousel / Grid */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                  {currentLang === "hi" ? "अन्य वेबसाइट प्रोजेक्ट्स" : "OTHER PROJECTS"}
                </h4>
                <p className="text-xs text-slate-500">
                  {currentLang === "hi"
                    ? "ऊपर लाइव प्रिव्यू देखने के लिए किसी भी प्रोजेक्ट पर क्लिक करें"
                    : "Click any project to inspect its live preview above"}
                </p>
              </div>
              <span className="text-xs font-bold text-[#123B70] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {filteredProjects.length} {currentLang === "hi" ? "प्रोजेक्ट्स" : "Projects"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProjects.map((project) => {
                const isSelected = project.id === activeProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      handleProjectSelect(project.id);
                      showcaseTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "group text-left rounded-2xl p-3 border transition-all duration-200 flex flex-col justify-between cursor-pointer active-press",
                      isSelected
                        ? "bg-blue-50/60 border-[#123B70] ring-2 ring-[#123B70] shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <div className="space-y-2.5 w-full">
                      {/* Thumbnail with mini browser frame */}
                      <div className="relative aspect-16/10 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80">
                        <img
                          src={project.image}
                          alt={project.name[currentLang]}
                          loading="lazy"
                          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#123B70] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                            {currentLang === "hi" ? "सक्रिय" : "Active Preview"}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#123B70] uppercase">
                          <span>{projectIcons[project.id]}</span>
                          <span className="truncate">{project.filterCategory}</span>
                        </div>
                        <h5 className="font-extrabold text-slate-900 text-sm mt-0.5 line-clamp-1 group-hover:text-[#123B70] transition-colors">
                          {project.name[currentLang]}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {project.category[currentLang]}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#123B70]">
                      <span>{isSelected ? (currentLang === "hi" ? "प्रिव्यू हो रहा है" : "Viewing Now") : (currentLang === "hi" ? "प्रिव्यू देखें" : "View Preview")}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
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
