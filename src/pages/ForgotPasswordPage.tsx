import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { SEO } from "../components/SEO";
import { business } from "../config/business";

export const ForgotPasswordPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(currentLang === "hi" ? "कृपया अपना ईमेल पता दर्ज करें।" : "Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError(currentLang === "hi" ? "कृपया एक मान्य ईमेल पता दर्ज करें।" : "Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const res = await resetPasswordForEmail(cleanEmail);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || (currentLang === "hi" ? "पासवर्ड रीसेट लिंक भेजने में विफल। कृपया पुनः प्रयास करें।" : "Could not send reset link. Please try again."));
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 flex items-center justify-center">
      <SEO
        title={{
          en: "Forgot Password | Palak Enterprises",
          hi: "पासवर्ड रीसेट करें | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Reset your Palak Enterprises account password securely.",
          hi: "अपना पालक इंटरप्राइजेज अकाउंट पासवर्ड सुरक्षित रूप से रीसेट करें।",
        }}
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
                {currentLang === "hi" ? "पासवर्ड भूल गए?" : "Reset Your Password"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === "hi"
                  ? "अपना पंजीकृत ईमेल दर्ज करें, हम आपको पासवर्ड रीसेट लिंक भेजेंगे"
                  : "Enter your registered email and we'll send a password recovery link"}
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
                {currentLang === "hi" ? "रीसेट लिंक भेज दिया गया है!" : "Reset Link Sent!"}
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {currentLang === "hi"
                  ? `हमने ${email} पर पासवर्ड रीसेट लिंक भेज दिया है। कृपया अपना ईमेल इनबॉक्स और स्पैम फोल्डर देखें।`
                  : `We have sent a secure password recovery link to ${email}. Please check your inbox and follow the instructions.`}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 shadow-xs transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{currentLang === "hi" ? "लॉगिन पेज पर वापस जाएँ" : "Back to Login"}</span>
                </Link>
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

              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="reset-email" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पंजीकृत ईमेल पता *" : "Registered Email Address *"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#123B70] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#123B70] hover:bg-[#0c274c] py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{submitting ? (currentLang === "hi" ? "भेजा जा रहा है..." : "Sending Link...") : (currentLang === "hi" ? "रीसेट लिंक भेजें" : "Send Reset Link")}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-slate-600">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-bold text-[#123B70] hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>{currentLang === "hi" ? "लॉगिन पेज पर वापस जाएँ" : "Back to Sign In"}</span>
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{currentLang === "hi" ? "सुरक्षित पासवर्ड रीसेट प्रक्रिया" : "Secure Authentication by Supabase"}</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
