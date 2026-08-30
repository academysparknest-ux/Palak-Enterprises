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
} from "lucide-react";
import {
  verifyDigitalId,
  type DigitalIdVerificationResult,
} from "../lib/digitalId/digitalIdService";
import { StudentDigitalIdCard } from "../components/digital-id/StudentDigitalIdCard";
import { TeacherDigitalIdCard } from "../components/digital-id/TeacherDigitalIdCard";
import { VerificationStatusBadge } from "../components/digital-id/VerificationStatusBadge";

export const DigitalIdVerificationPage: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState(paramId || "");
  const [loading, setLoading] = useState(Boolean(paramId));
  const [result, setResult] = useState<DigitalIdVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Non-fatal
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F7FB] via-[#FAF8F5] to-[#EEF2F6] text-slate-800 font-sans flex flex-col justify-between py-6 px-3 sm:px-6 relative">
      {/* Decorative Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex-grow flex flex-col justify-center my-auto">
        {/* Top Official Portal Header */}
        <header className="text-center mb-6 print:hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 shadow-xs border border-slate-200/80 mb-3">
            <ShieldCheck className="h-4 w-4 text-[#123B70]" />
            <span className="text-[11px] font-black text-slate-800 tracking-wider uppercase">
              Online ID Verification Portal
            </span>
          </div>

          <p className="text-xs text-slate-700 font-medium max-w-sm mx-auto">
            Scan verification & official identity confirmation system
          </p>
        </header>

        {/* LOADING STATE */}
        {loading && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-200/90 text-center max-w-md mx-auto w-full space-y-6 animate-pulse">
            <div className="relative h-20 w-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#123B70] to-sky-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Verifying Digital ID...
              </h2>
              <p className="text-xs text-slate-700 font-medium">
                Securely querying institution records from Supabase
              </p>
            </div>

            {/* Skeleton Card Placeholder */}
            <div className="h-48 rounded-2xl bg-slate-100/90 border border-slate-200/60 p-4 space-y-3">
              <div className="h-4 w-3/4 mx-auto bg-slate-200 rounded-full" />
              <div className="h-20 w-20 mx-auto bg-slate-200 rounded-xl" />
              <div className="h-3 w-1/2 mx-auto bg-slate-200 rounded-full" />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>256-Bit Encrypted Verification</span>
            </div>
          </div>
        )}

        {/* LOADED: VALID RECORD STATE */}
        {!loading && result?.success && result.profile && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Top Status Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 print:hidden">
              <VerificationStatusBadge status={result.profile.status} size="md" />

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Live Supabase Record</span>
              </div>
            </div>

            {/* Render Student or Teacher Digital ID Card Component */}
            {result.profile.personType === "teacher" ? (
              <TeacherDigitalIdCard profile={result.profile} />
            ) : (
              <StudentDigitalIdCard profile={result.profile} />
            )}

            {/* Action Buttons Toolbar */}
            <div className="flex items-center justify-center gap-2.5 pt-2 print:hidden">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-slate-500" />
                    <span>Share ID</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#123B70] hover:bg-[#0c284e] shadow-md shadow-blue-900/10 text-xs font-bold text-white transition-all cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Print Card</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSearching(!isSearching)}
                title="Verify another ID"
                className="inline-flex items-center justify-center p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Verification Watermark & Security Confirmation */}
            <div className="text-center pt-2 text-[11px] text-slate-600 print:hidden space-y-1">
              <p>
                Verified at: {new Date(result.profile.verifiedAt).toLocaleString()}
              </p>
              <p className="font-semibold text-slate-700">
                This verification page displays official records directly from the institution's database.
              </p>
            </div>
          </div>
        )}

        {/* LOADED: INVALID / NOT FOUND / ERROR STATE */}
        {!loading && (result === null || !result.success) && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center max-w-md mx-auto w-full space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Warning Icon Badge */}
            <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {paramId ? "⚠ INVALID DIGITAL ID" : "Verify Digital ID"}
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed max-w-xs mx-auto">
                {paramId
                  ? "This QR code or ID does not correspond to an active student or faculty record in our database. Please contact the institution for verification."
                  : "Enter a Student ID, Employee ID, or scan a QR code to verify identity."}
              </p>
            </div>

            {/* Manual Lookup Form */}
            <form onSubmit={handleManualSearch} className="space-y-3 pt-2">
              <div className="relative">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="e.g. STU-0001, 0001, or T-001"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#123B70] focus:bg-white transition-all uppercase tracking-wider"
                  required
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#123B70] hover:bg-[#0c284e] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-98"
              >
                Verify Record
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return Home</span>
              </Link>

              <span className="text-[10px] text-slate-600 font-semibold">
                Protected by Palak Portal
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Manual Search Drawer if active on a valid card view */}
        {!loading && result?.success && isSearching && (
          <div className="mt-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-200 max-w-md mx-auto w-full animate-in slide-in-from-top-3 duration-200 print:hidden">
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Enter another Student or Teacher ID..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#123B70]"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#123B70] text-white text-xs font-bold rounded-lg hover:bg-[#0c284e] cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="text-center pt-8 text-[11px] text-slate-600 font-medium print:hidden">
        <p>© {new Date().getFullYear()} Palak Enterprises. Secure Digital Identity Verification System.</p>
      </footer>
    </div>
  );
};
