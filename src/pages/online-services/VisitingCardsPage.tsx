import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Upload,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Calculator,
  X,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import { getPrintPricingConfig, submitPrintOrder, uploadOrderFile } from "../../lib/supabase/database";
import { initiateRazorpayPayment } from "../../lib/razorpay";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { cn } from "../../lib/utils";

export const VisitingCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();

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
  const [cardWebsite, setCardWebsite] = useState<string>("www.palakchakia.com");

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

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_shop" | "pay_online">("pay_at_shop");

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
            setSubmitError(err?.description || "Online payment was cancelled. You can retry or choose 'Pay at Shop Counter'.");
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
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
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

            {/* Step 3: Customer Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    3
                  </span>
                  <span>{currentLang === "hi" ? "ग्राहक विवरण" : "Your Contact Details"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9905238015"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-slate-800">Special Instructions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Mention delivery preference, rounded corners, or design tweaks..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                />
              </div>
            </section>

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
                        {currentLang === "hi" ? "दुकान पर भुगतान (Pay at Shop)" : "Pay at Shop Counter"}
                      </span>
                      <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.2">
                        Cash / UPI
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {currentLang === "hi"
                        ? "ऑर्डर अभी दर्ज करें। दुकान (ब्लॉक गेट, चकिया) पहुँचकर काउंटर पर भुगतान कर कार्ड प्राप्त करें।"
                        : "Order is registered now. Pay at the shop counter when you arrive for collection."}
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
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-50 py-3.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {currentLang === "hi"
                        ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`
                        : `Submit Card Order (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
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
