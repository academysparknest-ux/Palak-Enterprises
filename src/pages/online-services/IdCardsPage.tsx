import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  Calculator,
  User,
  Plus,
  Minus,
  Crop,
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
import { ImageCropModal } from "../../components/idcard/ImageCropModal";
import { cn } from "../../lib/utils";

export const IdCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();
  const { isStopped, stopReason } = useQuickServiceAvailability("id-cards");

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  // ID Card Fields
  const [holderName, setHolderName] = useState<string>("Amit Kumar");
  const [idNumber, setIdNumber] = useState<string>("STU-2026-084");
  const [designation, setDesignation] = useState<string>("Class X - Roll 14");
  const [organization, setOrganization] = useState<string>("Chakia Public School");
  const [bloodGroup, setBloodGroup] = useState<string>("B+");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("+91 99052 38015");
  const [address, setAddress] = useState<string>("Saniganj, Chakia, Bihar");
  const [validity, setValidity] = useState<string>("2026 - 2027");

  // Options
  const [cardSides, setCardSides] = useState<"single" | "double">("double");
  const [includeLanyard, setIncludeLanyard] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);

  // Photo
  const [uploadedPhoto, setUploadedPhoto] = useState<{
    file: File;
    name: string;
    size: number;
    previewUrl: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showPhotoCrop, setShowPhotoCrop] = useState<boolean>(false);
  const [rawPhotoSrc, setRawPhotoSrc] = useState<string | null>(null);
  const [rawPhotoName, setRawPhotoName] = useState<string>("holder-photo.jpg");

  // School / Organization Logo
  const [uploadedLogo, setUploadedLogo] = useState<{
    file: File;
    name: string;
    size: number;
    previewUrl: string;
  } | null>(null);
  const [logoFileError, setLogoFileError] = useState<string | null>(null);

  // Customer Contact
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
    if (!file.type.startsWith("image/")) {
      setFileError(currentLang === "hi" ? "केवल JPG, PNG, WEBP फोटो फ़ाइल समर्थित है।" : "Only image files (JPG, PNG, WEBP) allowed.");
      return;
    }

    if (file.size < 10 * 1024) {
      setFileError(currentLang === "hi" ? "फोटो बहुत छोटी है (न्यूनतम: 10 KB)।" : "Image is too small (Min: 10 KB).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError(currentLang === "hi" ? "फोटो 10MB से कम होनी चाहिए (अधिकतम: 10 MB)।" : "Image exceeds maximum limit (Max: 10 MB).");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setRawPhotoSrc(previewUrl);
    setRawPhotoName(file.name);
    setShowPhotoCrop(true);
    e.target.value = "";
  };

  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setUploadedPhoto({
      file: croppedFile,
      name: croppedFile.name,
      size: croppedFile.size,
      previewUrl,
    });
    setFileError(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFileError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setLogoFileError(currentLang === "hi" ? "केवल फोटो या लोगो फ़ाइल समर्थित है।" : "Only image files allowed.");
      return;
    }

    if (file.size < 10 * 1024) {
      setLogoFileError(currentLang === "hi" ? "लोगो फ़ाइल बहुत छोटी है (न्यूनतम: 10 KB)।" : "Logo file too small (Min: 10 KB).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLogoFileError(currentLang === "hi" ? "लोगो फ़ाइल 10MB से कम होनी चाहिए (अधिकतम: 10 MB)।" : "Logo exceeds maximum limit (Max: 10 MB).");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedLogo({
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    });
    e.target.value = "";
  };

  // Price Calculation
  const baseCardRate = cardSides === "single" ? pricingConfig.idCards.pvcSingle : pricingConfig.idCards.pvcDouble;
  const lanyardRate = includeLanyard ? pricingConfig.idCards.withLanyardHolder : 0;
  const unitPrice = baseCardRate + lanyardRate;
  const totalAmount = unitPrice * Math.max(1, quantity);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isStopped) {
      setSubmitError(
        stopReason
          ? `ID Card Printing is temporarily unavailable (${stopReason}). Please try again later.`
          : "ID Card Printing is currently temporarily paused and not accepting new orders."
      );
      return;
    }

    if (!holderName.trim() || !organization.trim()) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया नाम एवं संस्था का नाम दर्ज करें।"
          : "Please enter cardholder name and organization."
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
          ? "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।"
          : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = "";
      let storagePath = "";
      if (uploadedPhoto?.file) {
        const uploadRes = await uploadOrderFile(uploadedPhoto.file, `IDCARD-${Date.now()}`);
        if (uploadRes) {
          fileUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        }
      }

      let logoUrl = "";
      let logoStoragePath = "";
      if (uploadedLogo?.file) {
        const logoUploadRes = await uploadOrderFile(uploadedLogo.file, `LOGO-${Date.now()}`);
        if (logoUploadRes) {
          logoUrl = logoUploadRes.url;
          logoStoragePath = logoUploadRes.storagePath;
        }
      }

      const specifications: Record<string, string> = {
        Holder: holderName,
        Organization: organization,
        Sides: cardSides === "single" ? "Single Side Front" : "Double Side (Front & Back)",
        Lanyard: includeLanyard ? "With Premium Lanyard & Holder" : "Card Only",
        Quantity: `${quantity} ID Card(s)`,
        ...(uploadedLogo ? { "School Logo": "Custom Logo Uploaded" } : {}),
      };

      const processIdCardOrder = async (razorpayPaymentId?: string) => {
        const orderNotesWithPayment = razorpayPaymentId
          ? `${instructions.trim() ? instructions.trim() + " " : ""}[Razorpay ID: ${razorpayPaymentId}]`
          : (instructions.trim() || undefined);

        const res = await submitPrintOrder({
          serviceId: "id-cards",
          serviceName: "ID Card Printing",
          documentType: `PVC ID Card (${organization})`,
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
            breakdown: { baseCardRate, lanyardRate, quantity },
          },
          options: {
            holderName,
            idNumber,
            designation,
            organization,
            bloodGroup,
            emergencyPhone,
            address,
            validity,
            cardSides,
            includeLanyard,
            quantity,
            schoolLogoUrl: logoUrl || undefined,
            schoolLogoName: uploadedLogo?.name || undefined,
            schoolLogoStoragePath: logoStoragePath || undefined,
          },
          optionsLabels: specifications,
          file: uploadedPhoto ? {
            name: uploadedPhoto.name,
            size: uploadedPhoto.size,
            url: fileUrl,
            storagePath,
            mimeType: uploadedPhoto.file.type,
          } : undefined,
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
          setSubmitError(res.error || "Failed to submit order.");
        }
        setSubmitting(false);
      };

      if (paymentMethod === "pay_online") {
        await initiateRazorpayPayment({
          amount: totalAmount,
          name: "Palak Enterprises",
          description: `ID Cards Order (${quantity} cards - ${organization})`,
          prefill: {
            name: customerName.trim(),
            contact: cleanPhone,
          },
          onSuccess: async (paymentId) => {
            await processIdCardOrder(paymentId);
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
        await processIdCardOrder();
      }
    } catch (err: any) {
      console.error("ID Card order exception:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
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
            <span className="text-amber-300">ID Card Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              🪪 {currentLang === "hi" ? "पहचान पत्र (ID Card) प्रिंटिंग" : "Smart PVC ID Card Printing"}
            </h1>
            <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-xs font-bold">
              High Durability Thermal PVC
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "छात्र, स्टाफ, क्लब व संस्थागत पीवीसी स्मार्ट आईडी कार्ड प्रिंटिंग। डोरी (Lanyard) एवं कार्ड होल्डर के साथ ऑर्डर करें।"
              : "Thermal PVC smart ID cards for schools, coaching centers, corporate staff & events. Includes optional printed lanyard & protective case."}
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        {isStopped && (
          <QuickServiceUnavailableBanner
            serviceName={currentLang === "hi" ? "पहचान पत्र (ID Card)" : "ID Card Printing"}
            stopReason={stopReason}
          />
        )}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: ID Card Details & Live Preview */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "आईडी कार्ड का विवरण भरें" : "Enter ID Card Details"}</span>
                </div>
              </div>

              {/* Live ID Card Mockup */}
              <div className="rounded-2xl bg-white border-2 border-slate-300 p-4 shadow-md max-w-xs mx-auto space-y-3">
                <div className="rounded-xl bg-[#123B70] text-white p-2.5 text-center flex items-center justify-center gap-2">
                  {uploadedLogo ? (
                    <img
                      src={uploadedLogo.previewUrl}
                      alt="School Logo"
                      className="h-8 w-8 rounded-full bg-white object-contain p-0.5 shrink-0 border border-amber-300 shadow-xs"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h4 className="text-xs font-black tracking-tight uppercase truncate">{organization || "ORGANIZATION NAME"}</h4>
                    <p className="text-[9px] text-amber-300 font-semibold tracking-wider">IDENTITY CARD</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {uploadedPhoto ? (
                    <img
                      src={uploadedPhoto.previewUrl}
                      alt="Holder"
                      className="h-20 w-16 object-cover rounded-lg border border-slate-300 shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-16 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 text-[11px]">
                    <h5 className="font-bold text-slate-900 truncate">{holderName || "Name"}</h5>
                    <p className="text-slate-600 truncate text-[10px]">{designation || "Designation"}</p>
                    <p className="text-slate-500 font-mono text-[10px]">ID: {idNumber || "0000"}</p>
                    <p className="text-slate-500 text-[10px]">Blood: {bloodGroup || "-"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[9px] text-slate-500 space-y-0.5">
                  <div className="truncate">📞 {emergencyPhone}</div>
                  <div className="truncate">📍 {address}</div>
                </div>
              </div>

              {/* Uploads Section: Photo & School Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Photo Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      {currentLang === "hi" ? "पासपोर्ट फोटो अपलोड करें *" : "Upload Cardholder Photo *"}
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Min 10KB • Max 10MB</span>
                  </div>
                  {uploadedPhoto ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 truncate">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{uploadedPhoto.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRawPhotoSrc(uploadedPhoto.previewUrl);
                            setRawPhotoName(uploadedPhoto.name);
                            setShowPhotoCrop(true);
                          }}
                          className="flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 bg-amber-100/80 px-2 py-1 rounded-md font-bold transition"
                        >
                          <Crop size={12} />
                          <span>Crop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadedPhoto(null)}
                          className="text-xs text-rose-600 hover:underline font-bold px-1"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3 text-center hover:border-[#123B70] cursor-pointer bg-slate-50 h-[58px]">
                      <Upload className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose Photo (JPG, PNG)</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                  {fileError && <p className="text-xs text-rose-600">{fileError}</p>}
                </div>

                {/* School / Org Logo Upload */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "स्कूल / संस्थान का लोगो (ऐच्छिक)" : "School / Org Logo (Optional)"}
                  </label>
                  {uploadedLogo ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 truncate">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">{uploadedLogo.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedLogo(null)}
                        className="text-xs text-rose-600 hover:underline font-bold shrink-0 ml-2"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3 text-center hover:border-[#123B70] cursor-pointer bg-slate-50 h-[58px]">
                      <Upload className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose Logo (PNG, JPG, SVG)</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  )}
                  {logoFileError && <p className="text-xs text-rose-600">{logoFileError}</p>}
                </div>
              </div>

              {/* ID Card Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Organization / School *</label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class / Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID / Roll Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address / Center</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Session / Validity</label>
                  <input
                    type="text"
                    value={validity}
                    onChange={(e) => setValidity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              </div>
            </section>

            {/* Step 2: Card Options (Sides, Lanyard, Quantity) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "कार्ड ऑप्शंस व मात्रा" : "Card Options"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sides */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Card Sides</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCardSides("single")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        cardSides === "single"
                          ? "border-[#123B70] bg-[#123B70] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Single Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardSides("double")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        cardSides === "double"
                          ? "border-[#123B70] bg-[#123B70] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Both Sides
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-10 text-center font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-[#123B70] focus:outline-hidden text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lanyard Addon */}
              <label
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3.5 transition-all cursor-pointer mt-2",
                  includeLanyard ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeLanyard}
                    onChange={(e) => setIncludeLanyard(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#123B70]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {currentLang === "hi" ? "डोरी (Lanyard) एवं होल्डर जोड़ें" : "Include Neck Lanyard & Clear Card Holder"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Premium 16mm woven ribbon lanyard with clip
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#123B70]">
                  +₹{pricingConfig.idCards.withLanyardHolder} / card
                </span>
              </label>
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
                        ? "⚡ बिना लाइन लगे सीधे तैयार स्मार्ट PVC कार्ड लें! आपके पहुँचने से पहले ही कार्ड प्रिंट व लैमिनेट रहेगा।"
                        : "⚡ Skip the line! PVC card printed & laminated in advance. Walk in, show Order ID, and collect instantly."}
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
                        ? "दस्तावेज अभी भेजें। हम कार्ड तैयार रखेंगे और आप दुकान पर लेने के समय भुगतान करें।"
                        : "Send your file now. We'll prepare your cards, and you can pay when you collect them."}
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
                  <h3 className="text-base font-extrabold text-slate-900">ID Card Order</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Quote</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Card Type:</span>
                  <span className="font-bold text-slate-900">PVC Thermal Smart Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sides:</span>
                  <span className="font-semibold text-slate-800">{cardSides === "single" ? "Single Side" : "Double Side"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lanyard:</span>
                  <span className="font-semibold text-slate-800">{includeLanyard ? "Yes (+₹25)" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="font-bold text-slate-900">{quantity}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">Total Amount</span>
                <span className="text-2xl font-black text-[#123B70]">₹{totalAmount}</span>
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
                    {currentLang === "hi"
                      ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`
                      : `Submit ID Card Order (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`}
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
          serviceName="ID Card Printing"
          documentType="Smart PVC ID Card"
          specifications={successData.specifications}
          totalAmount={successData.totalAmount}
          customerName={customerName}
          customerPhone={customerPhone}
          paymentMethod={successData.paymentMethod}
          paymentStatus={successData.paymentStatus}
        />
      )}

      {/* Image Crop Modal for ID Card photo */}
      <ImageCropModal
        isOpen={showPhotoCrop}
        imageSrc={rawPhotoSrc}
        fileName={rawPhotoName}
        cropShape="circle"
        title="Crop Cardholder Photo (Circular / Card)"
        onClose={() => {
          setShowPhotoCrop(false);
          setRawPhotoSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};
