import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { GoogleIcon } from "../components/GoogleIcon";
import { SEO } from "../components/SEO";
import { business } from "../config/business";

export const LoginPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { loginWithEmail, loginWithGoogle, isAuthenticated, isStaff, isReady, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // If error is passed in URL (e.g. from OAuth redirect callback)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // Clear the error parameter from the browser URL bar so refreshing does not replay stale errors
      try {
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.delete("error");
        const nextSearch = nextParams.toString() ? `?${nextParams.toString()}` : "";
        window.history.replaceState({}, document.title, `${window.location.pathname}${nextSearch}`);
      } catch {
        // Fallback safely if browser history api restricted
      }
    }
  }, [searchParams]);

  // If already authenticated and role is resolved, redirect cleanly
  useEffect(() => {
    if (isReady && !loading && isAuthenticated) {
      if (isStaff && (returnTo === "/account" || returnTo === "/")) {
        navigate("/admin", { replace: true });
      } else {
        navigate(returnTo, { replace: true });
      }
    }
  }, [isReady, isAuthenticated, loading, isStaff, returnTo, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
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

    if (!password) {
      setError(currentLang === "hi" ? "कृपया अपना पासवर्ड दर्ज करें।" : "Please enter your password.");
      return;
    }

    setSubmitting(true);
    const res = await loginWithEmail(cleanEmail, password);
    setSubmitting(false);

    if (res.success) {
      // Auth listener in context will update session & redirect in useEffect
    } else {
      setError(res.error || (currentLang === "hi" ? "ईमेल या पासवर्ड गलत है।" : "Email or password is incorrect."));
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const res = await loginWithGoogle(returnTo);
    if (!res.success) {
      setGoogleSubmitting(false);
      setError(
        res.error ||
          (currentLang === "hi"
            ? "गूगल साइन-इन वर्तमान में अनुपलब्ध है। कृपया ईमेल और पासवर्ड का उपयोग करें।"
            : "Google sign-in is temporarily unavailable. Please use email and password.")
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#FAF8F5] py-12 px-4 sm:px-6 flex items-center justify-center">
      <SEO
        title={{
          en: "Login to Your Account | Palak Enterprises",
          hi: "अकाउंट में लॉगिन करें | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Sign in to track orders, review proofs, access printing quotes, and manage citizen services.",
          hi: "ऑर्डर ट्रैक करने, डिज़ाइन प्रूफ देखने और प्रिंटिंग व नागरिक सेवाओं के प्रबंधन हेतु लॉगिन करें।",
        }}
      />

      <div className="w-full max-w-md space-y-6">
        {/* Main Auth Card */}
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
                {currentLang === "hi" ? "अकाउंट में लॉगिन करें" : "Sign In to Your Account"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === "hi"
                  ? "ऑर्डर ट्रैक करने एवं सेवाओं के प्रबंधन के लिए विवरण भरें"
                  : "Enter your details to access orders, proofs & services"}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "ईमेल पता *" : "Email Address *"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
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

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "पासवर्ड *" : "Password *"}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-[#123B70] hover:underline"
                >
                  {currentLang === "hi" ? "पासवर्ड भूल गए?" : "Forgot Password?"}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full rounded-xl bg-[#123B70] hover:bg-[#0c274c] py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{submitting ? (currentLang === "hi" ? "लॉगिन हो रहा है..." : "Signing In...") : (currentLang === "hi" ? "साइन इन करें" : "Sign In")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              {currentLang === "hi" ? "या" : "OR"}
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting || googleSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:border-slate-400 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
            aria-label="Continue with Google"
          >
            <GoogleIcon className="h-4.5 w-4.5 shrink-0" />
            <span>
              {googleSubmitting
                ? (currentLang === "hi" ? "गूगल से कनेक्ट हो रहा है..." : "Connecting to Google...")
                : (currentLang === "hi" ? "गूगल से साइन इन करें" : "Continue with Google")}
            </span>
          </button>

          {/* Switch to Sign Up */}
          <div className="pt-2 text-center text-xs text-slate-600">
            <span>{currentLang === "hi" ? "नया अकाउंट बनाना चाहते हैं?" : "Don't have an account?"}{" "}</span>
            <Link
              to={`/signup${returnTo !== "/account" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-bold text-[#123B70] hover:underline"
            >
              {currentLang === "hi" ? "नया खाता बनाएं" : "Create Account"}
            </Link>
          </div>
        </div>

        {/* Security & Trust Footer */}
        <div className="text-center text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>{currentLang === "hi" ? "सुरक्षित 256-बिट SSL प्रमाणीकरण" : "Encrypted & Secure 256-bit SSL Authentication"}</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
