import React, { useState } from "react";
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  Calendar,
  Phone,
  User,
  Heart,
  MapPin,
  Sparkles,
  QrCode,
  CheckCircle2,
  Users,
  Shield,
} from "lucide-react";
import type { DigitalIdProfile } from "../../lib/digitalId/digitalIdService";
import { formatDisplayDate } from "../../lib/digitalId/digitalIdService";
import { cn } from "../../lib/utils";

import { business } from "../../config/business";

interface StudentDigitalIdCardProps {
  profile: DigitalIdProfile;
  className?: string;
}

export const StudentDigitalIdCard: React.FC<StudentDigitalIdCardProps> = ({
  profile,
  className,
}) => {
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { name, id, photoUrl, organization, fields, status } = profile;
  const logoSource = !logoError && organization.logoUrl ? organization.logoUrl : business.logoPath;

  // 1. Personal Academic Group
  const personalItems: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }> }> = [];
  if (fields.class) personalItems.push({ label: "Class", value: fields.class, icon: GraduationCap });
  if (fields.section) personalItems.push({ label: "Section", value: fields.section });
  if (fields.rollNumber) personalItems.push({ label: "Roll Number", value: fields.rollNumber });
  if (fields.bloodGroup) personalItems.push({ label: "Blood Group", value: fields.bloodGroup, icon: Heart });

  // 2. Family Information Group
  const familyItems: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }> }> = [];
  if (fields.fatherName) familyItems.push({ label: "Father's Name", value: fields.fatherName, icon: User });
  if (fields.motherName) familyItems.push({ label: "Mother's Name", value: fields.motherName, icon: User });

  // 3. Academic Details Group
  const academicItems: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }> }> = [];
  if (fields.dateOfBirth) academicItems.push({ label: "Date of Birth", value: formatDisplayDate(fields.dateOfBirth), icon: Calendar });
  if (fields.academicYear || organization.academicYear) {
    academicItems.push({ label: "Session", value: fields.academicYear || organization.academicYear || "", icon: Calendar });
  }

  // 4. Contact Information Group
  const contactItems: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }>; fullWidth?: boolean }> = [];
  if (fields.phone) contactItems.push({ label: "Phone", value: fields.phone, icon: Phone });
  if (fields.emergencyNumber) contactItems.push({ label: "Emergency Contact", value: fields.emergencyNumber, icon: Phone });
  if (fields.address) contactItems.push({ label: "Address", value: fields.address, icon: MapPin, fullWidth: true });

  // 5. Catch any additional dynamic fields that are not in the standard lists
  const standardKeys = new Set([
    "studentId", "employeeId", "class", "section", "rollNumber",
    "bloodGroup", "fatherName", "motherName", "dateOfBirth",
    "academicYear", "phone", "emergencyNumber", "address",
    "designation", "department", "email", "joiningDate"
  ]);
  const extraItems: Array<{ label: string; value: string }> = [];
  Object.entries(fields).forEach(([key, val]) => {
    if (!standardKeys.has(key) && val && typeof val === "string" && val.trim() !== "") {
      const formattedLabel = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      extraItems.push({ label: formattedLabel, value: val.trim() });
    }
  });

  return (
    <div
      id="digital-id-card-element"
      className={cn(
        "w-full bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden relative transition-all duration-300 select-none print:shadow-none print:border-slate-400 print:rounded-none",
        className
      )}
    >
      {/* CARD TOP OFFICIAL HEADER (Dark Navy/Indigo with Institutional Accent) */}
      <div className="relative bg-gradient-to-br from-[#0A1A2F] via-[#0F2747] to-[#163D6B] text-white p-5 sm:p-7 border-b border-amber-400/30 overflow-hidden">
        {/* Subtle Security Background Guilloche Watermark */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px), radial-gradient(#38BDF8 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
          {/* Organization Logo or Seal */}
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white shadow-md border border-white/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
            {logoSource ? (
              <img
                src={logoSource}
                alt={organization.name}
                onError={() => setLogoError(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-7 w-7 text-amber-500" />
            )}
          </div>

          {/* Organization Name & Document Title */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <Shield className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-300/90">
                Official Digital Identity
              </span>
            </div>
            <h2 className="text-sm sm:text-lg font-black tracking-tight text-white uppercase truncate drop-shadow-xs mt-0.5">
              {organization.name}
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-200 border border-white/10">
                STUDENT IDENTITY CARD
              </span>
            </div>
          </div>

          {/* Holographic Security Stamp */}
          <div className="hidden xs:flex h-11 w-11 rounded-full bg-gradient-to-tr from-amber-300 via-sky-200 to-indigo-300 p-0.5 shadow-md shrink-0 opacity-90">
            <div className="h-full w-full rounded-full bg-[#0A1A2F]/90 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* CARD BODY: PHOTO, NAME & IDENTITY DETAILS */}
      <div className="p-5 sm:p-8 space-y-6 sm:space-y-7">
        {/* Primary Profile Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 pb-6 border-b border-slate-100">
          {/* Profile Photo with Official Frame */}
          <div className="relative shrink-0">
            <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200/90 shadow-md group">
              {photoUrl && !imgError ? (
                <img
                  src={photoUrl}
                  alt={name}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 text-slate-400 p-3 text-center">
                  <User className="h-12 w-12 mb-1 text-slate-400 stroke-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Official Photo
                  </span>
                </div>
              )}
            </div>

            {/* Official Green Verification Stamp Badge on Photo Corner */}
            {status === "active" && (
              <div
                title="Verified Active Credential"
                className="absolute -bottom-2 -right-2 bg-emerald-600 text-white rounded-full p-1.5 shadow-lg ring-3 ring-white flex items-center justify-center"
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Profile Name & Primary Identifiers */}
          <div className="flex-1 text-center sm:text-left flex flex-col justify-center min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-bold tracking-tight mx-auto sm:mx-0 w-fit mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Identity</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight capitalize leading-tight">
              {name}
            </h1>

            {/* Student ID Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mt-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-black tracking-wide mx-auto sm:mx-0 w-fit">
              <QrCode className="h-4 w-4 text-[#123B70]" />
              <span>Student ID • {id}</span>
            </div>

            {/* Academic Session Summary if available */}
            {(fields.academicYear || organization.academicYear) && (
              <p className="text-xs font-semibold text-slate-500 mt-2">
                Academic Session: <span className="text-slate-800 font-bold">{fields.academicYear || organization.academicYear}</span>
              </p>
            )}
          </div>
        </div>

        {/* SECTION 1: PERSONAL / CLASS INFORMATION */}
        {personalItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Personal & Academic Record
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {personalItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-center"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {Icon && <Icon className="h-3 w-3 text-slate-400 shrink-0" />}
                      <span>{item.label}</span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 mt-1 break-words">
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: FAMILY INFORMATION */}
        {familyItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Family Information
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {familyItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {item.label}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: ACADEMIC DETAILS */}
        {academicItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Institutional Details
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {academicItems.map((item, idx) => {
                const Icon = item.icon || Calendar;
                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {item.label}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: CONTACT INFORMATION */}
        {contactItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Contact & Address
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contactItems.map((item, idx) => {
                const Icon = item.icon || Phone;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-start gap-3",
                      item.fullWidth ? "sm:col-span-2" : "col-span-1"
                    )}
                  >
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {item.label}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 break-words block mt-0.5">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 5: EXTRA ATTRIBUTES (IF ANY) */}
        {extraItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Additional Information
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {extraItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-center"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CARD FOOTER: OFFICIAL VERIFICATION GUARANTEE SEAL */}
      <div className="bg-slate-50/90 border-t border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                ✓ VERIFIED DIGITAL IDENTITY
              </span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Authenticated against the official {organization.name} records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 shrink-0">
          <span>Status:</span>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
            status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"
          )}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

