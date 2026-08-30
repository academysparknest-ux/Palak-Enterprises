import React from "react";
import { ShieldCheck, ShieldAlert, AlertCircle, Clock } from "lucide-react";
import type { VerificationState } from "../../lib/digitalId/digitalIdService";
import { cn } from "../../lib/utils";

interface VerificationStatusBadgeProps {
  status: VerificationState;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  className,
  size = "md",
}) => {
  const configs = {
    active: {
      label: "VERIFIED ACTIVE ID",
      subLabel: "Authentic Official Record",
      bgClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      glowClass: "shadow-[0_0_15px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/40",
      icon: ShieldCheck,
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-700",
    },
    inactive: {
      label: "ID INACTIVE",
      subLabel: "Suspended or Archived",
      bgClass: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      glowClass: "shadow-[0_0_15px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/40",
      icon: AlertCircle,
      dotColor: "bg-amber-500",
      textColor: "text-amber-700",
    },
    expired: {
      label: "ID EXPIRED",
      subLabel: "Previous Academic Term",
      bgClass: "bg-slate-500/10 text-slate-700 border-slate-500/30",
      glowClass: "shadow-[0_0_15px_rgba(100,116,139,0.18)] ring-1 ring-slate-400/40",
      icon: Clock,
      dotColor: "bg-slate-500",
      textColor: "text-slate-700",
    },
    invalid: {
      label: "INVALID RECORD",
      subLabel: "Unverified Identifier",
      bgClass: "bg-rose-500/10 text-rose-700 border-rose-500/30",
      glowClass: "shadow-[0_0_15px_rgba(244,63,94,0.18)] ring-1 ring-rose-400/40",
      icon: ShieldAlert,
      dotColor: "bg-rose-500",
      textColor: "text-rose-700",
    },
  };

  const current = configs[status] || configs.invalid;
  const Icon = current.icon;

  if (size === "sm") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-xs transition-all",
          current.bgClass,
          current.glowClass,
          className
        )}
      >
        <span className={cn("h-2 w-2 rounded-full animate-pulse", current.dotColor)} />
        <span>{current.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all select-none",
        current.bgClass,
        current.glowClass,
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-ping opacity-75",
            current.dotColor
          )}
        />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs font-extrabold uppercase tracking-wider leading-none">
          {current.label}
        </span>
        <span className="text-[10px] opacity-80 font-medium tracking-tight mt-0.5">
          {current.subLabel}
        </span>
      </div>
    </div>
  );
};
