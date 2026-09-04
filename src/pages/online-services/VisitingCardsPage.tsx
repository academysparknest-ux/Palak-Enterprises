import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  CreditCard,
  Upload,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Calculator,
  X,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import { getPrintPricingConfig, submitPrintOrder, uploadOrderFile } from "../../lib/supabase/database";
import { initiateRazorpayPayment } from "../../lib/razorpay";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { OrderAuthGate } from "../../components/OrderAuthGate";
import { QuickServiceUnavailableBanner } from "../../components/QuickServiceUnavailableBanner";
import { useQuickServiceAvailability } from "../../hooks/useQuickServiceAvailability";
import { cn } from "../../lib/utils";
import { SEO } from "../../components/SEO";

export const VisitingCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();
  const { isStopped, stopReason } = useQuickServiceAvailability("visiting-cards");

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  const [mode, setMode] = useState<"upload" | "template">("upload");

  // Template fields
  const [cardName, setCardName] = useState<string>("Kumar Pankaj");
  const [cardDesignation, setCardDesignation] = useState<string>("Proprietor");
  const [cardCompany, setCardCompany] = useState<string>("Palak Enterprises");
  const [cardTagline, setCardTagline] = useState<string>("Printing Press & Online Services");
  const [cardMobile, setCardMobile] = useState<string>("+91 99052 38015");
  const [cardWhatsApp, setCardWhatsApp] = useState<string>("+91 99052 38015");
  const [cardEmail, setCardEmail] = useState<string>("palakchakia@gmail.com");
  const [cardAddress, setCardAddress] = useState<string>("Near Block Gate, Chakia");
  const [cardWebsite, setCardWebsite] = useState<string>("www.palakenterprises.shop");

  // Printing Specs
  const [sides, setSides] = useState<"single" | "double">("single");
  const [quantity, setQuantity] = useState<number>(100);
  const [paperType, setPaperType] = useState<"300gsm" | "350gsm">("350gsm");
  const [finish, setFinish] = useState<"matte" | "gloss" | "velvet">("matte");

  // Upload file
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: number;
    previewUrl?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Customer Details
  const [customerName, setCustomerName] = useState<string>(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || "");
  const [instructions, setInstructions] = useState<string>("");

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || "");
      setCustomerPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  const [searchParams] = useSearchParams();
  const location = useLocation();

  const resolvePaymentMethod = (): "pay_at_shop" | "pay_online" => {
    const payParam = searchParams.get("payment") || searchParams.get("paymentMethod") || searchParams.get("pay") || (location.state as any)?.paymentMethod;
    if (payParam) {
      const p = String(payParam).toLowerCase();
      if (p === "pay_online" || p === "online" || p === "pay-online" || p === "priority" || p === "upi_online" || p === "paid") {
        return "pay_online";
      }
      if (p === "pay_at_shop" || p === "send_document" || p === "send-document" || p === "pay_at_store" || p === "shop" || p === "store" || p === "normal") {
        return "pay_at_shop";
      }
    }
    return "pay_at_shop";
  };

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_shop" | "pay_online">(resolvePaymentMethod);

  useEffect(() => {
    const payParam = searchParams.get("payment") || searchParams.get("paymentMethod") || searchParams.get("pay") || (location.state as any)?.paymentMethod;
    if (payParam) {
      const p = String(payParam).toLowerCase();
      if (p === "pay_online" || p === "online" || p === "pay-online" || p === "priority" || p === "upi_online" || p === "paid") {
        setPaymentMethod("pay_online");
      } else if (p === "pay_at_shop" || p === "send_document" || p === "send-document" || p === "pay_at_store" || p === "shop" || p === "store" || p === "normal") {
        setPaymentMethod("pay_at_shop");
      }
    }
  }, [searchParams, location.state]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    isOpen: boolean;
    orderCode: string;
    totalAmount: number;
    specifications: Record<string, string>;
    paymentMethod: string;
    paymentStatus: string;
  } | null>(null);

  useEffect(() => {
    getPrintPricingConfig().then(setPricingConfig).catch(() => setPricingConfig(DEFAULT_PRINT_PRICING));
    const handleUpdate = (e: any) => {
      if (e?.detail) setPricingConfig(e.detail);
    };
    window.addEventListener("palak_print_pricing_updated", handleUpdate);
    return () => window.removeEventListener("palak_print_pricing_updated", handleUpdate);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 50 * 1024 * 1024) {
      setFileError(currentLang === "hi" ? "फ़ाइल 50MB से कम होनी चाहिए।" : "File must be under 50MB.");
      return;
    }

    let previewUrl: string | undefined = undefined;
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
    }

    setUploadedFile({
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    });
  };

  // Price Calculation
  const calculatePrice = () => {
    let base = 250;
    if (quantity === 100) {
      base = sides === "single" ? pricingConfig.visitingCards.base100Single : pricingConfig.visitingCards.base100Double;
    } else if (quantity === 500) {
      base = sides === "single" ? pricingConfig.visitingCards.base500Single : pricingConfig.visitingCards.base500Double;
    } else if (quantity === 1000) {
      base = sides === "single" ? pricingConfig.visitingCards.base1000Single : pricingConfig.visitingCards.base1000Double;
    } else {
      // 250
      base = Math.round((sides === "single" ? 500 : 750));
    }

    let finishExtra = 0;
    if (finish === "velvet") finishExtra = pricingConfig.visitingCards.velvetFinishExtra;
    else if (finish === "matte") finishExtra = pricingConfig.visitingCards.matteFinishExtra;

    return base + finishExtra;
  };

  const totalPrice = calculatePrice();

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isStopped) {
      setSubmitError(
        stopReason
          ? `Visiting Card Printing is temporarily unavailable (${stopReason}). Please try again later.`
          : "Visiting Card Printing is currently temporarily paused and not accepting new orders."
      );
      return;
    }

    if (mode === "upload" && !uploadedFile) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया अपना कार्ड डिज़ाइन अपलोड करें।"
          : "Please upload your visiting card design file."
      );
      return;
    }

    if (mode === "template" && (!cardName.trim() || !cardCompany.trim() || !cardMobile.trim())) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया टेम्पलेट में नाम, कंपनी और मोबाइल नंबर भरें।"
          : "Please fill in Name, Company, and Mobile number in the template."
      );
      return;
    }

    if (!user) {
      setSubmitError(
        currentLang === "hi"
          ? "ऑनलाइन प्रिंटिंग ऑर्डर के लिए अकाउंट आवश्यक है। कृपया नीचे दिए गए फॉर्म से तुरंत अकाउंट बनाएं या लॉगिन करें।"
          : "An account is required to place an instant online print order. Please create an account or sign in below."
      );
      return;
    }

    if (!customerName.trim()) {
      setSubmitError(currentLang === "hi" ? "कृपया अपना नाम दर्ज करें।" : "Please enter your name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें।"
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = "";
      let storagePath = "";
      if (uploadedFile?.file) {
        const uploadRes = await uploadOrderFile(uploadedFile.file, `CARD-${Date.now()}`);
        if (uploadRes) {
          fileUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        }
      }

      const specifications: Record<string, string> = {
        Mode: mode === "upload" ? "Uploaded Custom Design" : "Template Customized",
        Sides: sides === "single" ? "Single Side Front" : "Front & Back (Double Side)",
        Quantity: `${quantity} Cards`,
        Paper: paperType === "350gsm" ? "350 GSM Premium Card" : "300 GSM Art Card",
        Finish: finish.toUpperCase() + " Lamination",
      };

      const processCardOrder = async (razorpayPaymentId?: string) => {
        const orderNotesWithPayment = razorpayPaymentId
          ? `${instructions.trim() ? instructions.trim() + " " : ""}[Razorpay ID: ${razorpayPaymentId}]`
          : (instructions.trim() || undefined);

        const res = await submitPrintOrder({
          serviceId: "visiting-cards",
          serviceName: "Visiting Card Printing",
          documentType: mode === "template" ? `Card Template (${cardCompany})` : "Custom Card Design",
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          instructions: orderNotesWithPayment,
          userId: user?.id,
          paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_store",
          paymentStatus: razorpayPaymentId ? "confirmed" : "pending",
          pricingSnapshot: {
            unitPrice: totalPrice,
            subtotal: totalPrice,
            totalAmount: totalPrice,
            breakdown: { baseRate: totalPrice, quantity },
          },
          options: {
            mode,
            sides,
            quantity,
            paperType,
            finish,
            templateData: mode === "template" ? {
              name: cardName,
              designation: cardDesignation,
              company: cardCompany,
              tagline: cardTagline,
              mobile: cardMobile,
              whatsapp: cardWhatsApp,
              email: cardEmail,
              address: cardAddress,
              website: cardWebsite,
            } : undefined,
          },
          optionsLabels: specifications,
          file: uploadedFile ? {
            name: uploadedFile.name,
            size: uploadedFile.size,
            url: fileUrl,
            storagePath,
            mimeType: uploadedFile.file.type,
          } : undefined,
        });

        if (res.success) {
          setSuccessData({
            isOpen: true,
            orderCode: res.orderCode,
            totalAmount: totalPrice,
            specifications,
            paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_shop",
            paymentStatus: razorpayPaymentId ? "confirmed" : "pending",
          });
        } else {
          setSubmitError(res.error || "Failed to submit order.");
        }
        setSubmitting(false);
      };

      if (paymentMethod === "pay_online") {
        await initiateRazorpayPayment({
          amount: totalPrice,
          name: "Palak Enterprises",
          description: `Visiting Cards Order (${quantity} cards)`,
          prefill: {
            name: customerName.trim(),
            contact: cleanPhone,
          },
          onSuccess: async (paymentId) => {
            await processCardOrder(paymentId);
          },
          onDismiss: () => {
            setSubmitting(false);
          },
          onError: (err) => {
            setSubmitError(
              err?.description ||
                (currentLang === "hi"
                  ? "ऑनलाइन भुगतान रद्द हुआ। आप पुनः प्रयास कर सकते हैं या 'दस्तावेज भेजें (दुकान पर भुगतान)' चुन सकते हैं।"
                  : "Online payment was cancelled. You can retry or choose 'Send Document (Pay on Pickup)'.")
            );
            setSubmitting(false);
          },
        });
      } else {
        await processCardOrder();
      }
    } catch (err: any) {
      console.error("Visiting card exception:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <SEO
        title={{
          en: "Visiting Card & Business Card Printing in Chakia | Palak Enterprises",
          hi: "विजिटिंग कार्ड एवं बिजनेस कार्ड प्रिंटिंग चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Custom visiting card & business card printing in Chakia, Bihar. 350 GSM card stock, single or double sided, matte or glossy lamination, fast dispatch & pickup.",
          hi: "चकिया में प्रीमियम विजिटिंग कार्ड प्रिंटिंग। 350 GSM मोटा कार्ड, सिंगल/डबल साइडेड, मैट या ग्लॉस लेमिनेशन, 100 से 1000 कार्ड पैक।",
        }}
        canonical="/online-services/visiting-cards"
        keywords="Visiting Card Printing Chakia, Business Card Maker Chakia, Visiting Card Printing Bihar, Palak Enterprises"
        schema={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Visiting Card & Business Card Printing",
          "provider": {
            "@type": "LocalBusiness",
            "name": "Palak Enterprises",
            "url": "https://www.palakenterprises.shop"
          },
          "serviceType": "Commercial Printing Service",
          "areaServed": "Chakia, East Champaran, Bihar"
        }}
      />
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-10 sm:py-12 px-4 sm:px-6">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
          }}
        />
        {/* Subtle geometric dot grid pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="mx-auto max-w-5xl space-y-2.5">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> /{" "}
            <Link to="/online-services" className="hover:underline">Instant Online Services</Link> /{" "}
            <span className="text-amber-300">Visiting Card Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              💳 {currentLang === "hi" ? "विजिटिंग कार्ड प्रिंटिंग" : "Visiting Card Printing"}
            </h1>
            <span className="rounded-full bg-indigo-400/20 text-indigo-300 border border-indigo-400/30 px-3 py-0.5 text-xs font-bold">
              350 GSM Heavy Card
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "अपना डिज़ाइन अपलोड करें या हमारी लाइव टेम्पलेट से विवरण भरें। 100 से 1000 कार्ड प्रीमियम मैट/ग्लॉस फिनिश के साथ ऑर्डर करें।"
              : "Upload your existing design or build a card with our live business template. Premium 350 GSM card stock with matte or gloss lamination."}
          </p>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        {isStopped && (
          <QuickServiceUnavailableBanner
            serviceName={currentLang === "hi" ? "विजिटिंग कार्ड प्रिंटिंग" : "Visiting Card Printing"}
            stopReason={stopReason}
          />
        )}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Mode Selector (Upload vs Template) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "डिज़ाइन का तरीका चुनें" : "How will you design your card?"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
                    mode === "upload"
                      ? "border-[#123B70] bg-blue-50/70 text-[#123B70] shadow-xs ring-1 ring-[#123B70]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs sm:text-sm font-bold">
                    {currentLang === "hi" ? "अपना डिज़ाइन अपलोड करें" : "Upload Your Design"}
                  </span>
                  <span className="text-[11px] text-slate-500">PDF, CDR, JPG, PNG, PSD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("template")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all cursor-pointer",
                    mode === "template"
                      ? "border-[#123B70] bg-blue-50/70 text-[#123B70] shadow-xs ring-1 ring-[#123B70]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <LayoutTemplate className="h-6 w-6" />
                  <span className="text-xs sm:text-sm font-bold">
                    {currentLang === "hi" ? "टेम्पलेट से विवरण भरें" : "Create with Template"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {currentLang === "hi" ? "लाइव कार्ड प्रीव्यू" : "Live card preview"}
                  </span>
                </button>
              </div>

              {/* Mode: Upload */}
              {mode === "upload" && (
                <div className="pt-2 animate-in fade-in space-y-3">
                  {uploadedFile ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {uploadedFile.previewUrl ? (
                          <img
                            src={uploadedFile.previewUrl}
                            alt="Design Preview"
                            className="h-12 w-20 rounded-md object-cover border border-emerald-200 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <CreditCard className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{uploadedFile.name}</p>
                          <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Design ready</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-emerald-100 hover:text-rose-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-[#123B70] hover:bg-blue-50/30 transition-all cursor-pointer">
                      <Upload className="h-7 w-7 text-slate-400 group-hover:text-[#123B70] mb-1.5" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {currentLang === "hi" ? "कार्ड डिज़ाइन फ़ाइल चुनें" : "Upload Visiting Card Artwork"}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        PDF, JPG, PNG, CDR, AI, PSD (Max 50MB)
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.cdr,.ai,.psd"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  {fileError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Template Form + Live Preview */}
              {mode === "template" && (
                <div className="pt-2 animate-in fade-in space-y-4">
                  {/* Live Card Mockup */}
                  <div className="rounded-2xl bg-linear-to-r from-slate-900 via-[#123B70] to-blue-950 p-5 text-white shadow-lg space-y-4 max-w-md mx-auto aspect-16/9 flex flex-col justify-between border border-white/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base sm:text-lg font-black tracking-tight">{cardCompany || "Your Company Name"}</h4>
                        <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">{cardTagline || "Tagline / Services"}</p>
                      </div>
                      <CreditCard className="h-5 w-5 text-amber-400 opacity-80" />
                    </div>

                    <div className="space-y-0.5">
                      <h5 className="text-sm font-bold text-white">{cardName || "Your Name"}</h5>
                      <p className="text-[11px] text-blue-200">{cardDesignation || "Designation"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-200 pt-2 border-t border-white/10">
                      <div className="truncate">📞 {cardMobile}</div>
                      <div className="truncate">💬 {cardWhatsApp}</div>
                      <div className="truncate">✉️ {cardEmail}</div>
                      <div className="truncate">📍 {cardAddress}</div>
                    </div>
                  </div>

                  {/* Template Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={cardCompany}
                        onChange={(e) => setCardCompany(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Slogan</label>
                      <input
                        type="text"
                        value={cardTagline}
                        onChange={(e) => setCardTagline(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                      <input
                        type="text"
                        value={cardDesignation}
                        onChange={(e) => setCardDesignation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                      <input
                        type="text"
                        value={cardMobile}
                        onChange={(e) => setCardMobile(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={cardWhatsApp}
                        onChange={(e) => setCardWhatsApp(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                      <input
                        type="text"
                        value={cardEmail}
                        onChange={(e) => setCardEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Address / Landmark</label>
                      <input
                        type="text"
                        value={cardAddress}
                        onChange={(e) => setCardAddress(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Website (Optional)</label>
                      <input
                        type="text"
                        value={cardWebsite}
                        onChange={(e) => setCardWebsite(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Step 2: Card Specs (Sides, Quantity, Paper, Finish) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "कार्ड स्पेसिफिकेशन व मात्रा" : "Card Specifications & Quantity"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sides */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "प्रिंटिंग साइड" : "Sides"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSides("single")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        sides === "single"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Single Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setSides("double")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        sides === "double"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Front & Back
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "मात्रा (Quantity)" : "Quantity"}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[100, 250, 500, 1000].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setQuantity(qty)}
                        className={cn(
                          "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                          quantity === qty
                            ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paper & Finish */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                {/* Paper */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Paper GSM</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperType("350gsm")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        paperType === "350gsm"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      350 GSM (Heavy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperType("300gsm")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        paperType === "300gsm"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      300 GSM Standard
                    </button>
                  </div>
                </div>

                {/* Finish */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Lamination Finish</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["matte", "gloss", "velvet"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFinish(f)}
                        className={cn(
                          "rounded-xl border py-2 text-center text-xs font-bold capitalize transition-all cursor-pointer",
                          finish === f
                            ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Customer Account & Contact Details */}
            <OrderAuthGate
              stepNumber={3}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              instructions={instructions}
              setInstructions={setInstructions}
            />

            {/* Step 4: Choose Payment Method */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    4
                  </span>
                  <span>{currentLang === "hi" ? "भुगतान माध्यम चुनें (Choose Payment Method)" : "Choose Payment Method"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                    paymentMethod === "pay_online"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_online"
                    checked={paymentMethod === "pay_online"}
                    onChange={() => setPaymentMethod("pay_online")}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "ऑनलाइन भुगतान (Pay Online)" : "Pay Online (UPI / QR)"}
                      </span>
                      <span className="rounded-full bg-emerald-600 text-white text-[10px] font-black px-2 py-0.2 uppercase">
                        {currentLang === "hi" ? "0 इंतज़ार" : "FASTEST"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {currentLang === "hi"
                        ? "⚡ बिना लाइन लगे सीधे तैयार विजिटिंग कार्ड बॉक्स लें! आपके पहुँचने से पहले ही कार्ड तैयार व पैक रहेंगे।"
                        : "⚡ Skip the line! Cards printed & packed in advance. Walk in, show Order ID, and collect instantly."}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                    paymentMethod === "pay_at_shop"
                      ? "border-[#123B70] bg-blue-50/50 ring-2 ring-[#123B70]/10"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_at_shop"
                    checked={paymentMethod === "pay_at_shop"}
                    onChange={() => setPaymentMethod("pay_at_shop")}
                    className="mt-1 text-[#123B70] focus:ring-[#123B70]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "दस्तावेज भेजें (दुकान पर भुगतान)" : "Send Document (Pay on Pickup)"}
                      </span>
                      <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.2">
                        PAY ON PICKUP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {currentLang === "hi"
                        ? "डिजाइन अभी भेजें। हम कार्ड तैयार रखेंगे और आप दुकान पर लेने के समय भुगतान करें।"
                        : "Send your file now. We'll prepare your cards in advance, and you can pay when you collect them."}
                    </p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Right 1 Column */}
          <div className="space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#123B70]" />
                  <h3 className="text-base font-extrabold text-slate-900">Visiting Card Order</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Quote</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Design Mode:</span>
                  <span className="font-bold text-slate-900 capitalize">{mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sides:</span>
                  <span className="font-semibold text-slate-800">{sides === "single" ? "Single Side" : "Front & Back"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="font-bold text-slate-900">{quantity} Cards</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paper & Finish:</span>
                  <span className="font-semibold text-slate-800">{paperType.toUpperCase()} • {finish}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">Total Price</span>
                <span className="text-2xl font-black text-[#123B70]">₹{totalPrice}</span>
              </div>

              {submitError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isStopped}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-extrabold shadow-card transition-all",
                  isStopped
                    ? "bg-slate-300 text-slate-600 border border-slate-300 cursor-not-allowed"
                    : "bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-50 text-white cursor-pointer"
                )}
              >
                {isStopped ? (
                  <span>
                    {currentLang === "hi"
                      ? "⚠️ सेवा अस्थायी रूप से बंद है (Service Unavailable)"
                      : "⚠️ Service Temporarily Unavailable"}
                  </span>
                ) : submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {currentLang === "hi"
                        ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`
                        : `Submit Card Order (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Informative Editorial & Visiting Card Specifications Section */}
        <div className="mt-14 space-y-10 border-t border-slate-200 pt-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#123B70] text-xs font-bold border border-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Commercial Offset & Digital Quality</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentLang === "hi"
                ? "चकिया में प्रीमियम विजिटिंग कार्ड प्रिंटिंग — विकल्प व विशेषताएं"
                : "Premium Visiting Cards Printing in Chakia — Quality & Finishes"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {currentLang === "hi"
                ? "व्यापारियों, डॉक्टरों, वकीलों एवं प्रोफेशनल्स के लिए उच्च श्रेणी के बिजनेस कार्ड, विभिन्न फिनिश और सटीक कटिंग के साथ उपलब्ध।"
                : "Make a powerful first impression with heavy cardstock, velvet or matte lamination, and sharp color rendering from Palak Enterprises."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Cardstock GSM */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#123B70] flex items-center justify-center font-bold text-lg">
                💳
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {currentLang === "hi" ? "कार्डस्टॉक व मोटाई" : "Cardstock & Weight"}
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-slate-800">300 GSM Art Card:</strong> {currentLang === "hi" ? "स्टैंडर्ड व्यावसायिक कार्ड, टिकाऊ एवं आर्थिक रूप से किफ़ायती।" : "High-density bright white art board for crisp corporate printing."}</li>
                <li><strong className="text-slate-800">350 GSM Heavy Board:</strong> {currentLang === "hi" ? "प्रीमियम कठोर बोर्ड, हाथ में लेने पर भारी व लग्जरी अनुभव।" : "Rigid non-bendable executive board delivering elite tactile feel."}</li>
                <li><strong className="text-slate-800">Corner Styles:</strong> {currentLang === "hi" ? "क्लासिक शार्प कॉर्नर अथवा मॉडर्न राउंड कॉर्नर फिनिशिंग।" : "Precision die-cut square or modern rounded corner radius options."}</li>
              </ul>
            </div>

            {/* Card 2: Lamination & Finishes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                ✨
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {currentLang === "hi" ? "फिनिश एवं लेमिनेशन" : "Lamination & Effects"}
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-slate-800">Matte Lamination:</strong> {currentLang === "hi" ? "एंटी-ग्लेयर, परिपक्व एवं फिंगरप्रिंट-रेसिस्टेंट मैट कोट।" : "Velvety non-reflective thermal coating resisting scratches and fingerprints."}</li>
                <li><strong className="text-slate-800">Gloss Lamination:</strong> {currentLang === "hi" ? "चमकदार एवं वाइब्रेंट कलर्स जो दूर से ध्यान आकर्षित करें।" : "High-shine protective layer enhancing bright graphics and logos."}</li>
                <li><strong className="text-slate-800">Velvet Soft Touch:</strong> {currentLang === "hi" ? "रॉयल मखमली फील के साथ प्रीमियम स्पॉट-यूवी फिनिश।" : "Ultra-luxurious peach-skin texture designed for leadership profiles."}</li>
              </ul>
            </div>

            {/* Card 3: Business Profiles in Chakia */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg">
                👔
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {currentLang === "hi" ? "स्थानीय उपयोग एवं सेक्टर्स" : "Chakia Business Profiles"}
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-slate-800">Advocates & Legal:</strong> {currentLang === "hi" ? "चकिया अनुमंडल कोर्ट व रजिस्ट्री कार्यालय के वकीलों हेतु।" : "Tailored clean layouts for legal practitioners at Chakia Court."}</li>
                <li><strong className="text-slate-800">Retail & Merchants:</strong> {currentLang === "hi" ? "चकिया बाजार के थोक व खुदरा व्यापारियों के लिए क्यूआर कोड सहित।" : "Store branding with integrated UPI payment QR codes."}</li>
                <li><strong className="text-slate-800">Clinics & Doctors:</strong> {currentLang === "hi" ? "ओपीडी समय व क्लिनिक पते के साथ दो-तरफ़ा प्रिंटिंग।" : "Appointment details and consulting hours on rear side."}</li>
              </ul>
            </div>

            {/* Card 4: Local Chakia Delivery */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {currentLang === "hi" ? "टर्नअराउंड व काउंटर पिकअप" : "Turnaround & Pickup"}
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-slate-800">24-48 Hr Fast Delivery:</strong> {currentLang === "hi" ? "डिजिटल कार्ड्स 24 घंटे में एवं ऑफसेट बल्क 48 घंटे में तैयार।" : "Digital batch in 24 hours; bulk offset runs ready in 48 hours."}</li>
                <li><strong className="text-slate-800">Store Address:</strong> {currentLang === "hi" ? "ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार।" : "Near Block Gate, Chakia, East Champaran, Bihar."}</li>
                <li><strong className="text-slate-800">Free Design Review:</strong> {currentLang === "hi" ? "प्रिंटिंग से पूर्व व्हाट्सएप पर प्रूफ अनुमोदन निःशुल्क।" : "WhatsApp soft-proofing included before final print run."}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {successData && (
        <OrderSuccessModal
          isOpen={successData.isOpen}
          onClose={() => setSuccessData(null)}
          orderCode={successData.orderCode}
          serviceName="Visiting Card Printing"
          documentType="Visiting Cards"
          specifications={successData.specifications}
          totalAmount={successData.totalAmount}
          customerName={customerName}
          customerPhone={customerPhone}
          paymentMethod={successData.paymentMethod}
          paymentStatus={successData.paymentStatus}
        />
      )}
    </div>
  );
};
