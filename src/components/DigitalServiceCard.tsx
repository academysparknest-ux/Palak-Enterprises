import React from "react";
import { Link } from "react-router-dom";
import { FileCheck, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { LocalService } from "../lib/storage/catalogData";
import { DynamicIcon } from "./DynamicIcon";
import { cn } from "../lib/utils";

interface DigitalServiceCardProps {
  service: LocalService;
  className?: string;
}

export const DigitalServiceCard: React.FC<DigitalServiceCardProps> = React.memo(({ service, className }) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#123B70]/40 hover:shadow-md",
        className
      )}
    >
      <div>
        {/* Header with Icon and Official Portal Tag */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100/60 p-2 text-[#123B70] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#123B70] group-hover:text-white transition-all">
            <DynamicIcon name={service.iconName} size={22} />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Assisted CSC</span>
          </span>
        </div>

        <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-[#123B70] transition-colors leading-snug">
          {service.name[currentLang]}
        </h3>

        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {service.shortDesc[currentLang]}
        </p>

        {/* Required Documents Badge Count */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800 border border-amber-200/60">
            <FileCheck className="h-3 w-3 text-amber-600" />
            <span>
              {service.requiredDocuments.length} {currentLang === "hi" ? "जरूरी दस्तावेज" : "Docs Required"}
            </span>
          </span>

          <span className="inline-flex items-center gap-1 text-slate-500">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="truncate max-w-[140px]">{service.processingTime[currentLang]}</span>
          </span>
        </div>
      </div>

      {/* CTA Bottom Bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
            {currentLang === "hi" ? "सेवा शुल्क" : "Assistance Fee"}
          </span>
          <span className="text-sm font-bold text-slate-900">
            ₹{service.estimatedFee} <span className="text-[11px] font-normal text-slate-500">approx</span>
          </span>
        </div>

        <Link
          to={`/digital-services/${service.slug}`}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-all group-hover:bg-[#123B70] hover:shadow-md cursor-pointer shrink-0"
        >
          <span>{currentLang === "hi" ? "शुरू करें" : "Start Service"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
});
