import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { SEO } from "../components/SEO";
import { business } from "../config/business";

export const ResetPasswordPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(currentLang === "hi" ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError(currentLang === "hi" ? "पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।" : "Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const res = await updatePassword(password);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || (currentLang === "hi" ? "पासवर्ड अपडेट करने में विफल। कृपया पुनः प्रयास करें।" : "Failed to update password. Please try again."));
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 flex items-center justify-center">
      <SEO
        title={{
          en: "Set New Password | Palak Enterprises",
          hi: "नया पासवर्ड सेट करें | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Enter your new password to secure your Palak Enterprises account.",
          hi: "अपने पालक इंटरप्राइजेज अकाउंट के लिए नया सुरक्षित पासवर्ड दर्ज करें।",
        }}
        noIndex={true}
      />

      <div className="w-full max-w-md space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img
                src={business.logoPath}
                alt={business.name[currentLang]}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-400/60 shadow-xs group-hover:scale-105 transition-transform mx-auto"
              />
            </Link>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentLang === "hi" ? "नया पासवर्ड बनाएं" : "Set New Password"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === "hi"
                  ? "कृपया अपना नया पासवर्ड दर्ज करें"
                  : "Please choose a strong new password for your account"}
              </p>
            </div>
          </div>

          {/* Success State */}
          {success ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3 animate-in fade-in">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold text-emerald-950">
                {currentLang === "hi" ? "पासवर्ड सफलतापूर्वक अपडेट हो गया!" : "Password Updated Successfully!"}
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {currentLang === "hi"
                  ? "आपका पासवर्ड सफलतापूर्वक बदल दिया गया है। अब आप अपने अकाउंट में लॉगिन कर सकते हैं।"
                  : "Your account password has been updated. You can now continue to your account."}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/account", { replace: true })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>{currentLang === "hi" ? "अकाउंट पर जाएँ →" : "Continue to Account →"}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1">
                  <label htmlFor="reset-new-password" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "नया पासवर्ड (न्यूनतम 6 अक्षर) *" : "New Password (Min 6 Characters) *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#123B70] focus:bg-white focus:outline-hidden transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label htmlFor="reset-confirm-password" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पासवर्ड की पुष्टि करें *" : "Confirm New Password *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#123B70] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#123B70] hover:bg-[#0c274c] py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{submitting ? (currentLang === "hi" ? "अपडेट हो रहा है..." : "Updating Password...") : (currentLang === "hi" ? "पासवर्ड अपडेट करें" : "Update Password")}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{currentLang === "hi" ? "सुरक्षित पासवर्ड अपडेट" : "Secure Authentication by Supabase"}</span>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
