import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Sparkles,
  ArrowRight,
  Code2,
  CheckCircle2,
  Lock,
  GraduationCap,
  Building2,
  Cpu,
  Layers,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { websiteProjects, type WebsiteProject } from "../config/projects";
import { ScrollReveal } from "./ui/motion/ScrollReveal";
import { AnimatedButton } from "./ui/motion/AnimatedButton";
import { cn } from "../lib/utils";

interface WebsiteProjectsSectionProps {
  onOpenRequestModal?: (serviceId?: string) => void;
}

export const WebsiteProjectsSection: React.FC<WebsiteProjectsSectionProps> = ({
  onOpenRequestModal: _onOpenRequestModal,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  // Exclude self/internal Palak Enterprises platform and Ekaagra Technologies from the homepage showcase
  const homeProjects = websiteProjects.filter(
    (p) => p.id !== "palak-enterprises-platform" && p.id !== "ekaagra-technologies"
  );

  const [activeProjectId, setActiveProjectId] = useState<string>(
    homeProjects[0]?.id || "roshani-public-school"
  );

  const activeProject: WebsiteProject =
    homeProjects.find((p) => p.id === activeProjectId) || homeProjects[0];

  const projectIcons: Record<string, React.ReactNode> = {
    "roshani-public-school": <GraduationCap className="h-3.5 w-3.5 text-blue-600" />,
    "roshani-public-school-erp": <Layers className="h-3.5 w-3.5 text-purple-600" />,
    "ekaagra-technologies": <Cpu className="h-3.5 w-3.5 text-emerald-600" />,
    "palak-enterprises-platform": <Building2 className="h-3.5 w-3.5 text-amber-600" />,
  };

  return (
    <section
      className="relative overflow-hidden p-6 sm:p-8 bg-linear-to-b from-slate-50 via-white to-slate-50/70 text-slate-900 rounded-3xl border border-slate-200/90 shadow-xs"
      aria-label={currentLang === "hi" ? "वेबसाइट डेवलपमेंट संक्षिप्त विवरण" : "Website Development Overview"}
    >
      {/* Subtle ambient light gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(18, 59, 112, 0.05) 0, transparent 40%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.06) 0, transparent 45%)",
        }}
      />

      <div className="relative z-10 space-y-6 sm:space-y-8">
        {/* Section Header with Quick Switcher */}
        <ScrollReveal direction="up" distancePx={16}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#123B70] mb-2 shadow-2xs">
                <Code2 className="h-3 w-3 text-[#123B70]" />
                <span>{currentLang === "hi" ? "वेबसाइट डेवलपमेंट" : "DIGITAL DEVELOPMENT"}</span>
              </div>

              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {currentLang === "hi" ? "हमारे द्वारा बनाई गई वेबसाइट्स" : "Websites We've Built"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                {currentLang === "hi"
                  ? "दुकानों, स्कूलों, कोचिंग व व्यवसायों के लिए आधुनिक, तेज़ और मोबाइल-फ्रेंडली वेबसाइट्स।"
                  : "Modern, fast and responsive websites designed to help businesses grow online."}
              </p>
            </div>

            {/* Concise Project Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 self-start lg:self-center shadow-2xs">
              {homeProjects.map((p) => {
                const isActive = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProjectId(p.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active-press",
                      isActive
                        ? "bg-[#123B70] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white/80"
                    )}
                  >
                    <span>{projectIcons[p.id]}</span>
                    <span>{p.name[currentLang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Compact Featured Project Preview Card */}
        <ScrollReveal direction="up" distancePx={20} delayMs={80}>
          <div className="group rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-center">
              {/* Left Column: Sleek Browser Preview (7 cols) */}
              <div className="lg:col-span-7">
                <div className="relative rounded-xl overflow-hidden bg-white border border-slate-300/80 shadow-md transition-all duration-300 group-hover:-translate-y-0.5">
                  {/* Browser Bar */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 text-slate-500 text-xs select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                    </div>

                    <div className="flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 max-w-[220px] sm:max-w-xs w-full truncate font-mono">
                      <Lock className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                      <span className="truncate">https://{activeProject.displayUrl}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE</span>
                    </div>
                  </div>

                  {/* Browser Image */}
                  <div className="relative aspect-16/9 sm:aspect-16/9 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={activeProject.image}
                      alt={`${activeProject.name[currentLang]} preview`}
                      loading="lazy"
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02] will-change-transform"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-40 group-hover:opacity-60 transition-opacity"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Project Overview Info (5 cols) */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#123B70] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                    {activeProject.category[currentLang]}
                  </span>
                  {activeProject.highlightBadge && (
                    <span className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                      {activeProject.highlightBadge[currentLang]}
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900">
                  {activeProject.name[currentLang]}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {activeProject.description[currentLang]}
                </p>

                {/* Key Highlights */}
                {activeProject.keyHighlights && (
                  <div className="space-y-1 py-0.5">
                    {activeProject.keyHighlights.slice(0, 2).map((hl, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{hl[currentLang]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {activeProject.technologies.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70"
                    >
                      {tech}
                    </span>
                  ))}
                  {activeProject.technologies.length > 4 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500">
                      +{activeProject.technologies.length - 4} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <a
                    href={activeProject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <AnimatedButton
                      variant="primary"
                      size="sm"
                      iconLeft={<ExternalLink className="h-3.5 w-3.5" />}
                      className="bg-[#123B70] hover:bg-[#0c274c] text-white font-bold"
                    >
                      {currentLang === "hi" ? "लाइव देखें" : "View Live Website"}
                    </AnimatedButton>
                  </a>

                  <Link to="/website-development" className="inline-flex">
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      {currentLang === "hi" ? "सभी प्रोजेक्ट्स व सेवाएँ" : "Explore All Details"}
                    </AnimatedButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Minimal Bottom Quick Bar linking to /website-development */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              {currentLang === "hi"
                ? "स्कूल, दुकान, कोचिंग या उद्यम के लिए कस्टम वेबसाइट निर्माण व ईआरपी समाधान।"
                : "Looking for a custom business website, school portal, or cloud ERP system?"}
            </span>
          </div>

          <Link
            to="/website-development"
            className="inline-flex items-center gap-1 font-bold text-[#123B70] hover:underline shrink-0"
          >
            <span>{currentLang === "hi" ? "वेबसाइट डेवलपमेंट पेज देखें →" : "View Website Development Page →"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WebsiteProjectsSection;
