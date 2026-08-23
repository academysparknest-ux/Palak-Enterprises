import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { GoogleIcon } from "../components/GoogleIcon";
import { SEO } from "../components/SEO";
import { business } from "../config/business";

export const SignupPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { signUpWithEmail, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect") || "/account";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // If error is passed in URL (e.g. from OAuth redirect callback)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  // If already authenticated, redirect
  useEffect(() => {
    if (!loading && isAuthenticated && !successMessage) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, loading, returnTo, navigate, successMessage]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setError(currentLang === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }

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

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length < 10) {
      setError(currentLang === "hi" ? "कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }

    if (password.length < 6) {
      setError(currentLang === "hi" ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError(currentLang === "hi" ? "पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।" : "Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const res = await signUpWithEmail(cleanEmail, password, cleanName, cleanPhone);
    setSubmitting(false);

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setSuccessMessage(
          currentLang === "hi"
            ? "खाता सफलतापूर्वक बन गया! कृपया अपने ईमेल इनबॉक्स की पुष्टि करें।"
            : "Account created successfully! Please check your email inbox to verify your account."
        );
      } else {
        // Automatically signed in by session sync
        navigate(returnTo, { replace: true });
      }
    } else {
      setError(res.error || (currentLang === "hi" ? "खाता बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।" : "Failed to create account. Please try again."));
    }
  };

  const handleGoogleSignup = async () => {
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
          en: "Create an Account | Palak Enterprises",
          hi: "नया खाता बनाएं | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Create your Palak Enterprises account for instant online printing, order tracking, and citizen services.",
          hi: "ऑनलाइन प्रिंटिंग, ऑर्डर ट्रैकिंग और नागरिक सेवाओं के लिए अपना पालक इंटरप्राइजेज खाता बनाएं।",
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
                {currentLang === "hi" ? "नया खाता बनाएं" : "Create Your Account"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === "hi"
                  ? "प्रिंट ऑर्डर एवं सेवाओं के त्वरित प्रबंधन के लिए रजिस्टर करें"
                  : "Join to track your printing orders, upload designs & save proofs"}
              </p>
            </div>
          </div>

          {/* Success / Email Verification Banner */}
          {successMessage && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{successMessage}</p>
              </div>
              <div className="pt-2 border-t border-emerald-200">
                <Link
                  to={`/login${returnTo !== "/account" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                  className="inline-flex items-center gap-1 text-emerald-900 font-extrabold hover:underline"
                >
                  <span>{currentLang === "hi" ? "लॉगिन पेज पर जाएँ →" : "Continue to Login →"}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {!successMessage && (
            <>
              {/* Form */}
              <form onSubmit={handleSignup} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label htmlFor="signup-name" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पूरा नाम *" : "Full Name *"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#123B70] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label htmlFor="signup-email" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "ईमेल पता *" : "Email Address *"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-email"
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

                {/* Phone Number (Optional) */}
                <div className="space-y-1">
                  <label htmlFor="signup-phone" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "मोबाइल नंबर (वैकल्पिक)" : "Mobile Number (Optional)"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9905238015"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#123B70] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label htmlFor="signup-password" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पासवर्ड (न्यूनतम 6 अक्षर) *" : "Password (Min 6 Characters) *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-password"
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

                {/* Confirm Password Field */}
                <div className="space-y-1">
                  <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पासवर्ड की पुष्टि करें *" : "Confirm Password *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || googleSubmitting}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  <span>
                    {submitting
                      ? (currentLang === "hi" ? "खाता बनाया जा रहा है..." : "Creating Account...")
                      : (currentLang === "hi" ? "खाता बनाएं" : "Create Account")}
                  </span>
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
                onClick={handleGoogleSignup}
                disabled={submitting || googleSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:border-slate-400 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
                aria-label="Continue with Google"
              >
                <GoogleIcon className="h-4.5 w-4.5 shrink-0" />
                <span>
                  {googleSubmitting
                    ? (currentLang === "hi" ? "गूगल से कनेक्ट हो रहा है..." : "Connecting to Google...")
                    : (currentLang === "hi" ? "गूगल से साइन अप करें" : "Continue with Google")}
                </span>
              </button>
            </>
          )}

          {/* Switch to Login */}
          <div className="pt-2 text-center text-xs text-slate-600">
            <span>{currentLang === "hi" ? "पहले से खाता मौजूद है?" : "Already have an account?"}{" "}</span>
            <Link
              to={`/login${returnTo !== "/account" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-bold text-[#123B70] hover:underline"
            >
              {currentLang === "hi" ? "साइन इन करें" : "Sign In"}
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

export default SignupPage;
