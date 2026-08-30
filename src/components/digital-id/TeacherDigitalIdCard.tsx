import React, { useState } from "react";
import {
  Briefcase,
  ShieldCheck,
  Building2,
  Calendar,
  Phone,
  User,
  Heart,
  MapPin,
  Mail,
  Award,
  Sparkles,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import type { DigitalIdProfile } from "../../lib/digitalId/digitalIdService";
import { formatDisplayDate } from "../../lib/digitalId/digitalIdService";
import { cn } from "../../lib/utils";

interface TeacherDigitalIdCardProps {
  profile: DigitalIdProfile;
  className?: string;
}

export const TeacherDigitalIdCard: React.FC<TeacherDigitalIdCardProps> = ({
  profile,
  className,
}) => {
  const [imgError, setImgError] = useState(false);
  const { name, id, photoUrl, organization, fields, status } = profile;

  // Prepare non-empty dynamic attributes strictly
  const detailItems: Array<{
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
    fullWidth?: boolean;
    isEmail?: boolean;
  }> = [];

  if (fields.designation) {
    detailItems.push({
      label: "Designation",
      value: fields.designation,
      icon: Briefcase,
      fullWidth: true,
    });
  }

  if (fields.department) {
    detailItems.push({
      label: "Department",
      value: fields.department,
      icon: Award,
      fullWidth: true,
    });
  }

  if (fields.email) {
    detailItems.push({
      label: "Email",
      value: fields.email,
      icon: Mail,
      fullWidth: true,
      isEmail: true,
    });
  }

  if (fields.bloodGroup) {
    detailItems.push({
      label: "Blood Group",
      value: fields.bloodGroup,
      icon: Heart,
    });
  }

  if (fields.joiningDate) {
    detailItems.push({
      label: "Joining Date",
      value: formatDisplayDate(fields.joiningDate),
      icon: Calendar,
    });
  }

  if (fields.phone) {
    detailItems.push({
      label: "Phone",
      value: fields.phone,
      icon: Phone,
    });
  }

  if (fields.emergencyNumber) {
    detailItems.push({
      label: "Emergency No.",
      value: fields.emergencyNumber,
      icon: Phone,
    });
  }

  if (fields.address) {
    detailItems.push({
      label: "Address",
      value: fields.address,
      icon: MapPin,
      fullWidth: true,
    });
  }

  return (
    <div
      id="digital-id-card-element"
      className={cn(
        "w-full max-w-sm sm:max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 transition-all duration-300 relative select-none print:shadow-none print:border-slate-400",
        className
      )}
    >
      {/* Premium Crimson/Navy Gradient Header for Faculty/Staff */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E3A8A] opacity-95" />

      {/* Subtle Security Guilloche Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, #fff 1px)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 10px",
        }}
      />

      {/* Card Header Content */}
      <div className="relative z-10 p-5 sm:p-6 pb-4 text-white text-center">
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Organization Logo */}
          <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Building2 className="h-6 w-6 text-white/90" />
            )}
          </div>

          {/* Header Title */}
          <div className="flex-1 text-center pr-1">
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase leading-tight line-clamp-1 drop-shadow-xs">
              {organization.name}
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400/20 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-widest text-amber-300 border border-amber-400/30">
                FACULTY & STAFF ID
              </span>
            </div>
          </div>

          {/* Hologram Badge Stamp */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-sky-300 p-0.5 shadow-md shrink-0 opacity-90 animate-pulse">
            <div className="h-full w-full rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Photo & Profile Identity Section */}
      <div className="relative z-10 px-5 sm:px-6 pt-1 pb-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-100/90 text-center">
          {/* Profile Photo with Frame and Glow */}
          <div className="relative mx-auto w-28 h-36 sm:w-32 sm:h-40 mb-3.5 group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 opacity-70 blur-xs" />
            <div className="relative h-full w-full rounded-xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center">
              {photoUrl && !imgError ? (
                <img
                  src={photoUrl}
                  alt={name}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  loading="eager"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 text-slate-400">
                  <User className="h-14 w-14 mb-1 text-slate-400 stroke-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Staff Photo
                  </span>
                </div>
              )}
            </div>

            {/* Verification Check Stamp */}
            {status === "active" && (
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md ring-2 ring-white">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Teacher Name */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize leading-tight">
            {name}
          </h1>

          {/* Designation Subtitle if present */}
          {fields.designation && (
            <div className="text-xs sm:text-sm font-bold text-indigo-900 mt-1 flex items-center justify-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
              <span>{fields.designation}</span>
            </div>
          )}

          {/* Employee ID Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-black tracking-wider">
            <QrCode className="h-3.5 w-3.5 text-amber-700" />
            <span>Employee ID: {id}</span>
          </div>

          {/* Dynamic Information Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-2.5 text-left border-t border-slate-100 pt-4">
            {detailItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={cn(
                    "p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center transition-colors",
                    item.fullWidth ? "col-span-2" : "col-span-1"
                  )}
                >
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {Icon && <Icon className="h-3 w-3 text-slate-500 shrink-0" />}
                    <span>{item.label}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 break-words">
                    {item.isEmail ? (
                      <a
                        href={`mailto:${item.value}`}
                        className="text-indigo-600 hover:underline hover:text-indigo-800"
                      >
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Official Security Footer */}
      <div className="relative z-10 bg-slate-50 border-t border-slate-200/70 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-slate-600">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              {status === "active" ? "✓ OFFICIAL VERIFIED ID" : `STATUS: ${status.toUpperCase()}`}
            </span>
            <span className="text-[9px] text-slate-600 font-semibold">
              Authenticated identity from Supabase cloud
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        </div>
      </div>
    </div>
  );
};
