import React from "react";
import { Zap, FileText, ShieldCheck } from "lucide-react";
import { cn } from "../../../lib/utils";

interface BadgeProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export const PriorityBadge: React.FC<BadgeProps> = ({
  label = "🔥 PRIORITY QUEUE",
  className = "",
  size = "sm",
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-xs",
        size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[11px] px-3 py-1",
        className
      )}
    >
      <Zap className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5", "text-emerald-400")} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export const NormalQueueBadge: React.FC<BadgeProps> = ({
  label = "📄 NORMAL QUEUE",
  className = "",
  size = "sm",
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-full border bg-amber-400/15 text-amber-300 border-amber-400/40 shadow-xs",
        size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[11px] px-3 py-1",
        className
      )}
    >
      <FileText className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5", "text-amber-300")} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export const VerifiedCSCBadge: React.FC<BadgeProps> = ({
  label = "Official CSC Certified",
  className = "",
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg",
        className
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
      <span>{label}</span>
    </span>
  );
};
