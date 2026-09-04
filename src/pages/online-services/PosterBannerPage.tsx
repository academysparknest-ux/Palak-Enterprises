import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Calculator,
  X,
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

const SIZES = [
  { id: "a4", label: "A4 (8.3 × 11.7 in)", isStandard: true, price: 20 },
  { id: "a3", label: "A3 (11.7 × 16.5 in)", isStandard: true, price: 40 },
  { id: "a2", label: "A2 (16.5 × 23.4 in)", isStandard: true, price: 120 },
  { id: "2x3ft", label: "2 × 3 Feet Banner", isStandard: false, price: 0 },
  { id: "3x4ft", label: "3 × 4 Feet Banner", isStandard: false, price: 0 },
  { id: "4x6ft", label: "4 × 6 Feet Hoarding", isStandard: false, price: 0 },
  { id: "custom", label: "Custom Dimension", isStandard: false, price: 0 },
];

const MATERIALS = [
  { id: "photo_gloss", label: "250 GSM High Glossy Photo Paper", suitableFor: "Posters" },
  { id: "vinyl_sticker", label: "Self-Adhesive Vinyl Sticker", suitableFor: "Signs & Glass" },
  { id: "star_flex", label: "Star Flex Banner (Outdoor Heavy Duty)", suitableFor: "Banners" },
  { id: "normal_flex", label: "Normal Flex Banner", suitableFor: "Promotions" },
];

export const PosterBannerPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();
  const { isStopped, stopReason } = useQuickServiceAvailability("poster-banner");

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  const [selectedSize, setSelectedSize] = useState<string>("a3");
  const [customSizeText, setCustomSizeText] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("photo_gloss");
  const [finish, setFinish] = useState<"plain" | "laminated" | "eyelets">("laminated");
  const [quantity, setQuantity] = useState<number>(1);

  // File
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: number;
    previewUrl?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Contact
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

  // Payment Method
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

  const sizeObj = SIZES.find((s) => s.id === selectedSize) || SIZES[1];
  const isStandardPricing = sizeObj.isStandard;

  let unitPrice = 0;
  if (selectedSize === "a4") unitPrice = pricingConfig.posters.a4Photo;
  else if (selectedSize === "a3") unitPrice = pricingConfig.posters.a3Glossy;
  else if (selectedSize === "a2") unitPrice = pricingConfig.posters.a2Photo;

  if (finish === "laminated" && isStandardPricing) {
    unitPrice += 15;
  }

  const totalAmount = isStandardPricing ? unitPrice * Math.max(1, quantity) : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 50 * 1024 * 1024) {
      setFileError("File must be under 50MB.");
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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isStopped) {
      setSubmitError(
        stopReason
          ? `Poster & Banner Printing is temporarily unavailable (${stopReason}). Please try again later.`
          : "Poster & Banner Printing is currently temporarily paused and not accepting new orders."
      );
      return;
    }

    if (!uploadedFile) {
      setSubmitError(
        currentLang === "hi" ? "कृपया अपना पोस्टर/बैनर डिज़ाइन अपलोड करें।" : "Please upload your poster/banner design."
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
      setSubmitError(currentLang === "hi" ? "कृपया नाम दर्ज करें।" : "Please enter your name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setSubmitError(
        currentLang === "hi" ? "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = "";
      let storagePath = "";
      if (uploadedFile.file) {
        const uploadRes = await uploadOrderFile(uploadedFile.file, `POSTER-${Date.now()}`);
        if (uploadRes) {
          fileUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        }
      }

      const matObj = MATERIALS.find((m) => m.id === selectedMaterial);

      const specifications: Record<string, string> = {
        Size: selectedSize === "custom" ? `Custom (${customSizeText})` : sizeObj.label,
        Material: matObj?.label || selectedMaterial,
        Finish: finish.toUpperCase(),
        Quantity: `${quantity}`,
        QuoteType: isStandardPricing ? "Direct Order" : "Custom Quote Request",
      };

      const processPosterOrder = async (razorpayPaymentId?: string) => {
        const orderNotesWithPayment = razorpayPaymentId
          ? `${instructions.trim() ? instructions.trim() + " " : ""}[Razorpay ID: ${razorpayPaymentId}]`
          : (instructions.trim() || undefined);

        const res = await submitPrintOrder({
          serviceId: "poster-banner",
          serviceName: "Poster & Banner Printing",
          documentType: `Poster / Banner (${sizeObj.label})`,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          instructions: orderNotesWithPayment,
          userId: user?.id,
          paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_store",
          paymentStatus: razorpayPaymentId ? "confirmed" : "pending",
          pricingSnapshot: {
            unitPrice,
            subtotal: totalAmount,
            totalAmount,
            breakdown: { isStandardPricing, unitPrice, quantity },
          },
          options: {
            size: selectedSize,
            customSizeText: selectedSize === "custom" ? customSizeText : undefined,
            material: selectedMaterial,
            finish,
            quantity,
            isStandardPricing,
          },
          optionsLabels: specifications,
          file: {
            name: uploadedFile.name,
            size: uploadedFile.size,
            url: fileUrl,
            storagePath,
            mimeType: uploadedFile.file.type,
          },
        });

        if (res.success) {
          setSuccessData({
            isOpen: true,
            orderCode: res.orderCode,
            totalAmount,
            specifications,
            paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_shop",
            paymentStatus: razorpayPaymentId ? "confirmed" : "pending",
          });
        } else {
          setSubmitError(res.error || "Failed to submit request.");
        }
        setSubmitting(false);
      };

      if (paymentMethod === "pay_online" && isStandardPricing && totalAmount > 0) {
        await initiateRazorpayPayment({
          amount: totalAmount,
          name: "Palak Enterprises",
          description: `Poster/Banner Order (${sizeObj.label})`,
          prefill: {
            name: customerName.trim(),
            contact: cleanPhone,
          },
          onSuccess: async (paymentId) => {
            await processPosterOrder(paymentId);
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
        await processPosterOrder();
      }
    } catch (err: any) {
      console.error("Poster order exception:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <SEO
        title={{
          en: "Flex Banner, Poster & Vinyl Printing in Chakia | Palak Enterprises",
          hi: "फ्लेक्स बैनर, पोस्टर व विनाइल प्रिंटिंग चकिया | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "High-resolution outdoor star flex banner, shop signage board, vinyl sticker and poster printing in Chakia, East Champaran. Fast delivery & custom sizes.",
          hi: "चकिया में स्टार फ्लेक्स बैनर, दुकान के बोर्ड, विनाइल स्टीकर और हाई-ग्लॉस पोस्टर प्रिंटिंग। वाटरप्रूफ एवं टिकाऊ प्रिंट।",
        }}
        canonical="/online-services/poster-banner"
        keywords="Flex Printing in Chakia, Banner Printing Chakia, Vinyl Printing East Champaran, Poster Printing Bihar, Palak Enterprises"
        schema={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Flex Banner & Poster Printing",
          "provider": {
            "@type": "LocalBusiness",
            "name": "Palak Enterprises",
            "url": "https://www.palakenterprises.shop"
          },
          "serviceType": "Signage & Banner Printing Service",
          "areaServed": "Chakia, East Champaran, Bihar"
        }}
      />
      {/* Header */}
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
            <span className="text-amber-300">Poster & Banner Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              🖼️ {currentLang === "hi" ? "पोस्टर एवं बैनर प्रिंटिंग" : "Poster & Banner Printing"}
            </h1>
            <span className="rounded-full bg-purple-400/20 text-purple-300 border border-purple-400/30 px-3 py-0.5 text-xs font-bold">
              HD Large Format Print
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "हाई-डेफिनिशन ग्लॉसी पोस्टर, विनाइल स्टिकर व फ्लेक्स बैनर प्रिंटिंग। स्टैंडर्ड साइज़ के लिए तुरंत ऑर्डर करें या बड़े साइज़ के लिए कोटेशन मांगें।"
              : "High-definition photo posters, self-adhesive vinyl stickers & weather-resistant flex banners for events, shop boards & marketing."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        {isStopped && (
          <QuickServiceUnavailableBanner
            serviceName={currentLang === "hi" ? "पोस्टर एवं बैनर प्रिंटिंग" : "Poster & Banner Printing"}
            stopReason={stopReason}
          />
        )}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Design */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "डिज़ाइन अपलोड करें" : "Upload Design / Artwork"}</span>
                </div>
              </div>

              {uploadedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {uploadedFile.previewUrl ? (
                      <img src={uploadedFile.previewUrl} alt="Preview" className="h-14 w-14 rounded-lg object-cover border border-emerald-200 shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{uploadedFile.name}</p>
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready</span>
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setUploadedFile(null)} className="p-2 text-slate-400 hover:text-rose-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-[#123B70] hover:bg-blue-50/30 transition-all cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-[#123B70] mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Choose Poster / Banner Image</span>
                  <span className="text-[11px] text-slate-500 mt-1">PDF, JPG, PNG, PSD, TIFF (Max 50MB)</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.psd,.tiff" onChange={handleFileChange} className="hidden" />
                </label>
              )}
              {fileError && <p className="text-xs text-rose-600 font-semibold">{fileError}</p>}
            </section>

            {/* Step 2: Size & Material */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "साइज एवं मटेरियल चुनें" : "Select Size & Material"}</span>
                </div>
              </div>

              {/* Sizes Grid */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Print Size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SIZES.map((s) => {
                    const isSelected = selectedSize === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSize(s.id)}
                        className={cn(
                          "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                          isSelected
                            ? "border-[#123B70] bg-[#123B70] text-white font-bold"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        )}
                      >
                        <span className="text-xs block truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSize === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom Dimensions (e.g. 5 ft × 8 ft)</label>
                  <input
                    type="text"
                    required
                    value={customSizeText}
                    onChange={(e) => setCustomSizeText(e.target.value)}
                    placeholder="Width × Height in Feet / Inches"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              )}

              {/* Material Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">Printing Material</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MATERIALS.map((mat) => {
                    const isSelected = selectedMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-[#123B70] bg-blue-50/70 text-[#123B70] ring-1 ring-[#123B70]"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <span className="text-xs font-bold block text-slate-900">{mat.label}</span>
                        <span className="text-[11px] text-slate-500 block">Best for: {mat.suitableFor}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Finish & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Finish</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["plain", "laminated", "eyelets"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFinish(f)}
                        className={cn(
                          "rounded-xl border py-2 text-center text-xs font-bold capitalize transition-all cursor-pointer",
                          finish === f ? "border-[#123B70] bg-[#123B70] text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-center focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
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
                        ? "⚡ बिना लाइन लगे सीधे तैयार पोस्टर / बैनर रोल प्राप्त करें! आपके पहुँचने से पहले ही प्रिंट तैयार रहेगा।"
                        : "⚡ Skip the line! Banners pre-printed & rolled in advance. Walk in, show Order ID, and collect instantly."}
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
                        ? "डिजाइन अभी भेजें। हम प्रिंट तैयार रखेंगे और आप दुकान पर लेने के समय भुगतान करें।"
                        : "Send your file now. We'll prepare your print in advance, and you can pay when you collect it."}
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
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isStandardPricing ? "Order Estimate" : "Custom Quote"}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {isStandardPricing ? "Calculated" : "Quote Request"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Size:</span>
                  <span className="font-bold text-slate-900">{sizeObj.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Finish:</span>
                  <span className="font-semibold text-slate-800 capitalize">{finish}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="font-bold text-slate-900">{quantity}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">
                  {isStandardPricing ? "Estimated Total" : "Pricing Notice"}
                </span>
                <span className="text-xl font-black text-[#123B70]">
                  {isStandardPricing ? `₹${totalAmount}` : "Quote on Review"}
                </span>
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
                  "Submitting..."
                ) : (
                  <span>
                    {isStandardPricing
                      ? currentLang === "hi"
                        ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`
                        : `Submit Print Order (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`
                      : "Request Custom Quote →"}
                  </span>
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
          serviceName="Poster & Banner Printing"
          documentType={`Poster / Banner (${sizeObj.label})`}
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
