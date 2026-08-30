import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Share2,
  Printer,
  Check,
  Lock,
  Sparkles,
  ArrowLeft,
  Building2,
  Shield,
  FileCheck2,
  Fingerprint,
} from "lucide-react";
import {
  verifyDigitalId,
  type DigitalIdVerificationResult,
} from "../lib/digitalId/digitalIdService";
import { StudentDigitalIdCard } from "../components/digital-id/StudentDigitalIdCard";
import { TeacherDigitalIdCard } from "../components/digital-id/TeacherDigitalIdCard";
import { VerificationStatusBadge } from "../components/digital-id/VerificationStatusBadge";
import { business } from "../config/business";
import { cn } from "../lib/utils";

export const DigitalIdVerificationPage: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState(paramId || "");
  const [loading, setLoading] = useState(Boolean(paramId));
  const [result, setResult] = useState<DigitalIdVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [headerLogoError, setHeaderLogoError] = useState(false);

  const executeVerification = useCallback(async (identifierToVerify: string) => {
    const cleanId = (identifierToVerify || "").trim();
    if (!cleanId) {
      setLoading(false);
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const res = await verifyDigitalId(cleanId);
      setResult(res);
    } catch {
      setResult({
        success: false,
        error: "NETWORK_ERROR",
        rawStatus: "invalid",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger verification whenever URL param changes
  useEffect(() => {
    if (paramId) {
      setInputQuery(paramId);
      executeVerification(paramId);
    } else {
      setLoading(false);
      setResult(null);
    }
  }, [paramId, executeVerification]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputQuery.trim();
    if (clean) {
      navigate(`/verify/${encodeURIComponent(clean)}`);
      setIsSearching(false);
    }
  };

  const handleShare = async () => {
    const currentUrl = window.location.href;
    const title = result?.profile
      ? `Digital ID Verification - ${result.profile.name}`
      : "Digital ID Verification";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Official Digital ID Verification for ${result?.profile?.name || "Student/Staff"}`,
          url: currentUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Share API fallback:", err);
        }
      }
    }

    // Fallback: Copy to clipboard with toast
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Non-fatal
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const org = result?.profile?.organization;
  const orgName = org?.name || business.name.en;
  const orgLogo = !headerLogoError && org?.logoUrl ? org.logoUrl : business.logoPath;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between relative selection:bg-[#123B70] selection:text-white">
      {/* Subtle Premium Background Gradients & Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Radial Ambient Lighting */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-sky-100/50 via-indigo-50/30 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-40 w-96 h-96 bg-emerald-50/40 rounded-full blur-3xl" />

        {/* Faint Micro-Grid Geometry */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `radial-gradient(#94A3B8 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Toast Notification for Clipboard Copy */}
      {copied && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 flex items-center gap-2.5 text-xs font-bold">
            <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span>Verification link copied to clipboard</span>
          </div>
        </div>
      )}

      {/* TOP INSTITUTIONAL BRANDING HEADER */}
      <header className="relative z-10 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Organization Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white border border-slate-200 shadow-2xs p-1 flex items-center justify-center shrink-0 overflow-hidden">
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt={orgName}
                  onError={() => setHeaderLogoError(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-5 w-5 text-[#123B70]" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase truncate">
                {orgName}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Shield className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">Official Digital Identity System</span>
              </div>
            </div>
          </div>

          {/* Right: Verification Status Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-slate-700 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verification Portal</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] sm:text-xs font-black">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden xs:inline">256-Bit Encrypted</span>
              <span className="xs:hidden">Secure</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* SKELETON LOADING STATE */}
        {loading && (
          <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
            {/* Hero Banner Skeleton */}
            <div className="h-24 sm:h-28 rounded-3xl bg-slate-200/70 border border-slate-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-300" />
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-300 rounded-md" />
                  <div className="h-3.5 w-72 bg-slate-300/80 rounded-md" />
                </div>
              </div>
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ID Card Skeleton */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="h-16 bg-slate-200 rounded-2xl" />
                <div className="flex gap-5">
                  <div className="w-32 h-40 bg-slate-200 rounded-2xl shrink-0" />
                  <div className="space-y-3 flex-1 pt-2">
                    <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
                    <div className="h-4 w-2/3 bg-slate-200 rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
              </div>

              {/* Sidebar Skeleton */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="h-5 w-1/2 bg-slate-200 rounded-md" />
                  <div className="space-y-2.5">
                    <div className="h-8 bg-slate-100 rounded-lg" />
                    <div className="h-8 bg-slate-100 rounded-lg" />
                    <div className="h-8 bg-slate-100 rounded-lg" />
                  </div>
                </div>
                <div className="h-14 bg-slate-200 rounded-2xl" />
              </div>
            </div>

            <div className="text-center pt-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <Sparkles className="h-4 w-4 animate-spin text-[#123B70]" />
                <span>Authenticating record from central repository...</span>
              </div>
            </div>
          </div>
        )}

        {/* LOADED: VALID VERIFIED RECORD */}
        {!loading && result?.success && result.profile && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* HERO VERIFICATION STATUS BANNER */}
            <div className="print:hidden">
              <VerificationStatusBadge
                size="hero"
                status={result.profile.status}
                verifiedAt={result.profile.verifiedAt}
              />
            </div>

            {/* TWO-COLUMN SOPHISTICATED GRID FOR DESKTOP / STACKED FOR MOBILE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* LEFT / MAIN COLUMN: THE OFFICIAL DIGITAL ID CARD */}
              <div className="lg:col-span-7 xl:col-span-7 w-full">
                {result.profile.personType === "teacher" ? (
                  <TeacherDigitalIdCard profile={result.profile} />
                ) : (
                  <StudentDigitalIdCard profile={result.profile} />
                )}
              </div>

              {/* RIGHT / SIDEBAR COLUMN: AUTHENTICITY DETAILS & ACTIONS */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-5 print:hidden">
                {/* METADATA AUTHENTICITY PANEL */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/5 border border-slate-200/90 space-y-5">
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-5 w-5 text-[#123B70]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Verification Details
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Active Record
                    </span>
                  </div>

                  {/* Metadata Key-Value List */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Record Status
                      </span>
                      <span className="font-extrabold text-emerald-700 uppercase flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        {result.profile.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Identity Type
                      </span>
                      <span className="font-extrabold text-slate-800 uppercase">
                        {result.profile.personType === "teacher" ? "FACULTY / STAFF" : "STUDENT"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Verification State
                      </span>
                      <span className="font-extrabold text-slate-900 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        AUTHENTIC RECORD
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Record ID
                      </span>
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {result.profile.id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Issuing Authority
                      </span>
                      <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">
                        {result.profile.organization.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Timestamp
                      </span>
                      <span className="font-semibold text-slate-600 text-right">
                        {new Date(result.profile.verifiedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Anti-Fraud Institutional Note */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
                    <Fingerprint className="h-4 w-4 text-[#123B70] shrink-0 mt-0.5" />
                    <span>
                      This public verification confirms that the displayed identity is genuine and actively registered within the official system database.
                    </span>
                  </div>
                </div>

                {/* PRIMARY ACTIONS TOOLBAR */}
                <div className="space-y-2.5">
                  {/* Share Verification Button (Primary Dominant) */}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#0F2747] hover:bg-[#0A1A2F] active:scale-[0.99] text-white shadow-lg shadow-slate-900/10 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer focus:outline-hidden focus:ring-3 focus:ring-sky-400"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-300">Link Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-sky-300" />
                        <span>Share Verification</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2.5">
                    {/* Print ID Button (Secondary) */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200/90 shadow-2xs text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-300"
                    >
                      <Printer className="h-4 w-4 text-slate-600" />
                      <span>Print ID Card</span>
                    </button>

                    {/* Verify Another ID Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsSearching(!isSearching)}
                      className={cn(
                        "py-3 px-4 rounded-2xl border shadow-2xs text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-300",
                        isSearching
                          ? "bg-blue-50 border-blue-200 text-[#123B70]"
                          : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700"
                      )}
                    >
                      <Search className="h-4 w-4" />
                      <span>Verify Another</span>
                    </button>
                  </div>
                </div>

                {/* COLLAPSIBLE MANUAL LOOKUP DRAWER */}
                {isSearching && (
                  <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-900/5 border border-slate-200/90 animate-in slide-in-from-top-3 duration-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Search Another Identity Record
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSearching(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleManualSearch} className="space-y-2.5">
                      <div className="relative">
                        <input
                          type="text"
                          value={inputQuery}
                          onChange={(e) => setInputQuery(e.target.value)}
                          placeholder="e.g. STU-0001, 0001, or T-001"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#123B70] focus:bg-white"
                          required
                          autoFocus
                        />
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#123B70] hover:bg-[#0A1A2F] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Lookup Record
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LOADED: INVALID / NOT FOUND / MANUAL SEARCH HOME STATE */}
        {!loading && (result === null || !result.success) && (
          <div className="max-w-md mx-auto my-6 sm:my-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-slate-900/10 border border-slate-200/90 text-center space-y-6">
              {/* State Icon */}
              <div className="relative mx-auto w-16 h-16 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                {paramId ? (
                  <ShieldAlert className="h-8 w-8 text-rose-600" />
                ) : (
                  <Search className="h-8 w-8 text-[#123B70]" />
                )}
                <span
                  className={cn(
                    "absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white",
                    paramId ? "bg-rose-500" : "bg-[#123B70]"
                  )}
                />
              </div>

              {/* State Headings & Copy */}
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {paramId ? "Identity Record Not Found" : "Digital Identity Verification"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {paramId
                    ? "The provided QR code or identifier does not correspond to an active identity record in our system."
                    : "Enter a Student ID, Employee ID, or scan a verified credential QR code to validate authenticity."}
                </p>
              </div>

              {/* Manual Lookup Form */}
              <form onSubmit={handleManualSearch} className="space-y-3 text-left">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Search Record by ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="e.g. STU-0001, 0001, or T-001"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#123B70] focus:bg-white transition-all uppercase tracking-wider"
                    required
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#0F2747] hover:bg-[#0A1A2F] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-98"
                >
                  Verify Official Record
                </button>
              </form>

              {/* Bottom Institutional Return Navigation */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return Home</span>
                </Link>

                <span className="text-[10px] font-bold text-slate-600">
                  Protected System
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER BRANDING */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/60 backdrop-blur-xs py-6 text-center text-xs text-slate-600 font-medium print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {orgName}. Official Digital Identity Verification System.</p>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-600" />
              Secure 256-bit Portal
            </span>
            <span>•</span>
            <span>Real-Time Database Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

