import React, { useState } from "react";
import {
  UserCheck,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { GoogleIcon } from "./GoogleIcon";
import { cn } from "../lib/utils";

interface OrderAuthGateProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerEmail?: string;
  setCustomerEmail?: (email: string) => void;
  customerWhatsApp?: string;
  setCustomerWhatsApp?: (wa: string) => void;
  instructions?: string;
  setInstructions?: (ins: string) => void;
  stepNumber?: number;
  className?: string;
}

export const OrderAuthGate: React.FC<OrderAuthGateProps> = ({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail = "",
  setCustomerEmail,
  customerWhatsApp = "",
  setCustomerWhatsApp,
  instructions = "",
  setInstructions,
  stepNumber = 5,
  className,
}) => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const {
    user,
    isAuthenticated,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    logout,
  } = useAuth();

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState(customerName || "");
  const [phoneInput, setPhoneInput] = useState(customerPhone || "");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  // Handle Quick Account Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanName = nameInput.trim();
    const cleanPhone = phoneInput.trim().replace(/\D/g, "");
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanName) {
      setAuthError(currentLang === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }
    if (cleanPhone.length < 10) {
      setAuthError(currentLang === "hi" ? "कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError(currentLang === "hi" ? "कृपया एक मान्य ईमेल पता दर्ज करें।" : "Please enter a valid email address.");
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setAuthError(currentLang === "hi" ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters long.");
      return;
    }

    setIsProcessing(true);
    const res = await signUpWithEmail(cleanEmail, passwordInput, cleanName, cleanPhone);
    setIsProcessing(false);

    if (res.success) {
      setCustomerName(cleanName);
      setCustomerPhone(cleanPhone);
      if (setCustomerEmail) setCustomerEmail(cleanEmail);
      if (res.requiresEmailConfirmation) {
        setAuthSuccess(
          currentLang === "hi"
            ? "अकाउंट बनाया गया! पुष्टि ईमेल भेजा गया है। अब आप ऑर्डर जारी रख सकते हैं।"
            : "Account created! A confirmation link has been sent to your email. You can now proceed with your order."
        );
      } else {
        setAuthSuccess(currentLang === "hi" ? "✓ अकाउंट सफलतापूर्वक बन गया!" : "✓ Account created successfully!");
      }
    } else {
      setAuthError(res.error || (currentLang === "hi" ? "अकाउंट बनाने में समस्या हुई।" : "Failed to create account."));
    }
  };

  // Handle Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setAuthError(currentLang === "hi" ? "कृपया अपना ईमेल दर्ज करें।" : "Please enter your email.");
      return;
    }
    if (!passwordInput) {
      setAuthError(currentLang === "hi" ? "कृपया पासवर्ड दर्ज करें।" : "Please enter your password.");
      return;
    }

    setIsProcessing(true);
    const res = await loginWithEmail(cleanEmail, passwordInput);
    setIsProcessing(false);

    if (res.success) {
      setAuthSuccess(currentLang === "hi" ? "✓ सफलतापूर्वक लॉगिन हुआ!" : "✓ Successfully signed in!");
    } else {
      setAuthError(res.error || (currentLang === "hi" ? "ईमेल या पासवर्ड गलत है।" : "Invalid email or password."));
    }
  };

  // Handle 1-Click Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleProcessing(true);
    const currentPath = window.location.pathname + window.location.search;
    const res = await loginWithGoogle(currentPath);
    if (!res.success) {
      setIsGoogleProcessing(false);
      setAuthError(res.error || "Google Sign-In could not be initiated.");
    }
  };

  return (
    <section className={cn("rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-card space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm sm:text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-black">
            {stepNumber}
          </span>
          <span>
            {currentLang === "hi" ? "ग्राहक अकाउंट एवं संपर्क विवरण *" : "Customer Account & Contact *"}
          </span>
        </div>

        {isAuthenticated && user ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{currentLang === "hi" ? "अकाउंट सत्यापित" : "Verified Account"}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-700" />
            <span>{currentLang === "hi" ? "अकाउंट आवश्यक" : "Account Required"}</span>
          </span>
        )}
      </div>

      {/* Case 1: USER IS AUTHENTICATED */}
      {isAuthenticated && user ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Active Logged-In User Banner */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/60 p-4 sm:p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {user.name || customerName || "Palak Customer"}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-emerald-300 px-2 py-0.5 rounded-md text-emerald-800">
                      Active Customer
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {user.email || "No email"} • {user.phone || customerPhone || "No mobile"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 underline text-left sm:text-right cursor-pointer"
              >
                {currentLang === "hi" ? "दूसरे अकाउंट से लॉगिन करें" : "Switch Account"}
              </button>
            </div>

            <p className="text-[11px] text-emerald-900 font-medium pt-1 border-t border-emerald-200/60">
              {currentLang === "hi"
                ? "✓ आपका यह प्रिंट ऑर्डर सीधे आपके अकाउंट में सुरक्षित दर्ज होगा और आप इसे कभी भी लाइव ट्रैक कर सकेंगे।"
                : "✓ Your print order will be securely linked to this account for live order tracking and instant shop pickup."}
            </p>
          </div>

          {/* Contact Details Fields for this Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "ऑर्डर प्राप्तकर्ता का नाम *" : "Pickup Contact Name *"}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "संपर्क मोबाइल नंबर (SMS/कॉल) *" : "Mobile Number (For Alerts) *"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 9905238015"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {setCustomerWhatsApp && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "व्हाट्सएप नंबर (वैकल्पिक)" : "WhatsApp Number (Optional)"}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 9905238015"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {setCustomerEmail && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "ईमेल रसीद (वैकल्पिक)" : "Email for Receipt (Optional)"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {setInstructions && (
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                {currentLang === "hi" ? "अतिरिक्त प्रिंटिंग निर्देश (वैकल्पिक)" : "Special Printing Instructions (Optional)"}
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={
                  currentLang === "hi"
                    ? "पेज नंबर, बाइंडिंग का प्रकार या कोई विशेष निर्देश लिखें..."
                    : "Special requirements, specific pages, urgency notes..."
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
              />
            </div>
          )}
        </div>
      ) : (
        /* Case 2: USER IS NOT AUTHENTICATED -> MANDATORY ACCOUNT CREATION / SIGN IN */
        <div className="space-y-5 animate-in fade-in">
          {/* Prominent Account Notice */}
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-4 sm:p-5 space-y-2 text-slate-900">
            <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
              <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0" />
              <span>
                {currentLang === "hi"
                  ? "ऑनलाइन प्रिंटिंग के लिए अकाउंट आवश्यक है"
                  : "Account Creation Required for Instant Online Print"}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {currentLang === "hi"
                ? "आपके दस्तावेज़ की सुरक्षा, यूनिक ऑर्डर ट्रैकिंग और दुकान पर बिना लाइन में लगे तुरंत कलेक्शन के लिए कृपया नीचे तुरंत अपना अकाउंट बनाएं या लॉगिन करें। (आपके चुने हुए पेज व फाइलें सुरक्षित रहेंगी!)"
                : "To protect your confidential documents, assign your official Order ID, and allow zero-wait shop counter collection, please create a quick account or log in below. (Your uploaded files and selected settings will stay intact!)"}
            </p>
          </div>

          {/* Quick 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleProcessing}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 p-3 text-xs sm:text-sm font-bold text-slate-800 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            <span>
              {isGoogleProcessing
                ? (currentLang === "hi" ? "गूगल से कनेक्ट हो रहा है..." : "Connecting to Google...")
                : (currentLang === "hi" ? "1-क्लिक गूगल से जारी रखें (सबसे तेज)" : "1-Click Sign In with Google (Fastest)")}
            </span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {currentLang === "hi" ? "या ईमेल व मोबाइल से" : "Or with Email & Phone"}
            </span>
          </div>

          {/* Mode Tabs: Create Account vs Sign In */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError(null);
              }}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                authMode === "register"
                  ? "bg-[#123B70] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 inline mr-1" />
              <span>{currentLang === "hi" ? "1. नया अकाउंट बनाएं" : "1. Create Account"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError(null);
              }}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                authMode === "login"
                  ? "bg-[#123B70] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Lock className="h-3.5 w-3.5 inline mr-1" />
              <span>{currentLang === "hi" ? "2. पहले से अकाउंट है (लॉगिन)" : "2. Sign In"}</span>
            </button>
          </div>

          {/* Error / Success Notifications */}
          {authError && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Register Form */}
          {authMode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पूरा नाम *" : "Your Full Name *"}
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        setCustomerName(e.target.value);
                      }}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "मोबाइल नंबर *" : "10-Digit Mobile *"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phoneInput}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        setPhoneInput(cleaned);
                        setCustomerPhone(cleaned);
                      }}
                      placeholder="e.g. 9905238015"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "ईमेल पता *" : "Email Address *"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (setCustomerEmail) setCustomerEmail(e.target.value);
                      }}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "नया पासवर्ड बनाएं *" : "Create Password (Min 6 chars) *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] p-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{isProcessing ? "Creating Account..." : (currentLang === "hi" ? "अकाउंट बनाएं और ऑर्डर जारी रखें →" : "Create Account & Proceed to Order →")}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "ईमेल पता *" : "Email Address *"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पासवर्ड *" : "Password *"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] p-3 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{isProcessing ? "Signing in..." : (currentLang === "hi" ? "लॉगिन करें और ऑर्डर जारी रखें →" : "Sign In & Proceed to Order →")}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
