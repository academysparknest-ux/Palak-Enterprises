import React from "react";
import { ShieldCheck, ShieldAlert, AlertCircle, Clock, CheckCircle } from "lucide-react";
import type { VerificationState } from "../../lib/digitalId/digitalIdService";
import { cn } from "../../lib/utils";

interface VerificationStatusBadgeProps {
  status: VerificationState;
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  verifiedAt?: string;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  className,
  size = "md",
  verifiedAt,
}) => {
  const configs = {
    active: {
      label: "VERIFIED & AUTHENTIC",
      subLabel: "Official identity record",
      description: "Authenticated against the central institution database",
      bgClass: "bg-emerald-500/10 text-emerald-800 border-emerald-500/30",
      heroBg: "bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-emerald-500/5 border-emerald-500/30",
      glowClass: "shadow-[0_0_20px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20",
      icon: ShieldCheck,
      heroIcon: CheckCircle,
      dotColor: "bg-emerald-600",
      textColor: "text-emerald-800",
      badgeColor: "bg-emerald-600 text-white",
    },
    inactive: {
      label: "IDENTITY INACTIVE",
      subLabel: "Suspended or Archived",
      description: "This record is currently marked inactive in the system",
      bgClass: "bg-amber-500/10 text-amber-800 border-amber-500/30",
      heroBg: "bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-amber-500/5 border-amber-500/30",
      glowClass: "shadow-[0_0_20px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/20",
      icon: AlertCircle,
      heroIcon: AlertCircle,
      dotColor: "bg-amber-600",
      textColor: "text-amber-800",
      badgeColor: "bg-amber-600 text-white",
    },
    expired: {
      label: "IDENTITY EXPIRED",
      subLabel: "Previous Academic Term",
      description: "The validity period for this credential has elapsed",
      bgClass: "bg-slate-500/10 text-slate-800 border-slate-500/30",
      heroBg: "bg-gradient-to-r from-slate-500/15 via-slate-500/8 to-slate-500/5 border-slate-500/30",
      glowClass: "shadow-[0_0_20px_rgba(100,116,139,0.12)] ring-1 ring-slate-500/20",
      icon: Clock,
      heroIcon: Clock,
      dotColor: "bg-slate-600",
      textColor: "text-slate-800",
      badgeColor: "bg-slate-600 text-white",
    },
    invalid: {
      label: "UNVERIFIED RECORD",
      subLabel: "Record Not Found",
      description: "Identifier could not be validated against official records",
      bgClass: "bg-rose-500/10 text-rose-800 border-rose-500/30",
      heroBg: "bg-gradient-to-r from-rose-500/15 via-rose-500/8 to-rose-500/5 border-rose-500/30",
      glowClass: "shadow-[0_0_20px_rgba(244,63,94,0.12)] ring-1 ring-rose-500/20",
      icon: ShieldAlert,
      heroIcon: ShieldAlert,
      dotColor: "bg-rose-600",
      textColor: "text-rose-800",
      badgeColor: "bg-rose-600 text-white",
    },
  };

  const current = configs[status] || configs.invalid;
  const Icon = current.icon;

  if (size === "hero") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl sm:rounded-3xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all backdrop-blur-md relative overflow-hidden",
          current.heroBg,
          current.glowClass,
          className
        )}
      >
        <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
          <div className="relative shrink-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center">
              <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", current.textColor)} />
            </div>
            <span
              className={cn(
                "absolute -top-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white animate-ping",
                current.dotColor
              )}
            />
            <span
              className={cn(
                "absolute -top-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white",
                current.dotColor
              )}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={cn("text-base sm:text-lg font-black tracking-tight uppercase", current.textColor)}>
                {current.label}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                <span className={cn("h-1.5 w-1.5 rounded-full", current.dotColor)} />
                {current.subLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              {current.description}
            </p>
          </div>
        </div>

        {verifiedAt && (
          <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50 w-full sm:w-auto relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Last Verified
            </span>
            <span className="text-xs font-bold text-slate-700">
              {new Date(verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(verifiedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    );
  }

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
