import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Plus,
  Minus,
  X,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import {
  getPrintPricingConfig,
  submitPrintOrder,
  uploadOrderFile,
} from "../../lib/supabase/database";
import { initiateRazorpayPayment } from "../../lib/razorpay";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { OrderAuthGate } from "../../components/OrderAuthGate";
import { cn } from "../../lib/utils";

const PHOTO_LAYOUTS = [
  { id: "sheet8", labelEn: "8 Passport Photos (Single Sheet)", labelHi: "8 पासपोर्ट फोटो (1 शीट)", photosCount: 8, baseKey: "sheet8" as const },
  { id: "sheet16", labelEn: "16 Passport Photos (2 Sheets)", labelHi: "16 पासपोर्ट फोटो (2 शीट)", photosCount: 16, baseKey: "sheet16" as const },
  { id: "sheet32", labelEn: "32 Passport Photos (Bulk Pack)", labelHi: "32 पासपोर्ट फोटो (बल्क पैक)", photosCount: 32, baseKey: "sheet32" as const },
  { id: "singlePrint", labelEn: "4×6 Single Photo Print", labelHi: "4×6 सिंगल फोटो प्रिंट", photosCount: 1, baseKey: "singlePrint" as const },
];

export const PassportPhotoPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  const [selectedLayout, setSelectedLayout] = useState<"sheet8" | "sheet16" | "sheet32" | "singlePrint">("sheet8");
  const [paperFinish, setPaperFinish] = useState<"glossy" | "matte">("glossy");
  const [copies, setCopies] = useState<number>(1);

  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: number;
    previewUrl: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

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
    if (!file.type.startsWith("image/")) {
      setFileError(
        currentLang === "hi"
          ? "कृपया केवल JPG, JPEG या PNG फोटो फ़ाइल चुनें।"
          : "Please upload a JPG, JPEG, or PNG image."
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFileError(
        currentLang === "hi"
          ? "फोटो का साइज़ 25MB से कम होना चाहिए।"
          : "Image size must be under 25MB."
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedFile({
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    });
  };

  const handleRemoveFile = () => {
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
    setFileError(null);
  };

  // Price Calculation
  const layoutObj = PHOTO_LAYOUTS.find((l) => l.id === selectedLayout) || PHOTO_LAYOUTS[0];
  const unitPrice = pricingConfig.passportPhoto[layoutObj.baseKey] || 50;
  const totalAmount = unitPrice * Math.max(1, copies);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!uploadedFile) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया अपनी फोटो अपलोड करें।"
          : "Please upload your portrait photo."
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
      if (uploadedFile.file) {
        const uploadRes = await uploadOrderFile(uploadedFile.file, `PHOTO-${Date.now()}`);
        if (uploadRes) {
          fileUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        }
      }

      const specifications: Record<string, string> = {
        Layout: currentLang === "hi" ? layoutObj.labelHi : layoutObj.labelEn,
        Finish: paperFinish === "glossy" ? "Glossy Premium Photo Paper" : "Matte Finish",
        Quantity: `${copies} sheet(s) (${layoutObj.photosCount * copies} total photos)`,
      };

      const processPhotoOrder = async (razorpayPaymentId?: string) => {
        const orderNotesWithPayment = razorpayPaymentId
          ? `${instructions.trim() ? instructions.trim() + " " : ""}[Razorpay ID: ${razorpayPaymentId}]`
          : (instructions.trim() || undefined);

        const res = await submitPrintOrder({
          serviceId: "passport-photo",
          serviceName: "Passport Photo Printing",
          documentType: "Passport Photo Sheet",
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
            breakdown: { baseRate: unitPrice, copies },
          },
          options: {
            layout: selectedLayout,
            paperFinish,
            copies,
            totalPhotos: layoutObj.photosCount * copies,
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
          setSubmitError(res.error || "Failed to submit order.");
        }
        setSubmitting(false);
      };

      if (paymentMethod === "pay_online") {
        await initiateRazorpayPayment({
          amount: totalAmount,
          name: "Palak Enterprises",
          description: `Passport Photo Order (${layoutObj.photosCount * copies} photos)`,
          prefill: {
            name: customerName.trim(),
            contact: cleanPhone,
          },
          onSuccess: async (paymentId) => {
            await processPhotoOrder(paymentId);
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
        await processPhotoOrder();
      }
    } catch (err: any) {
      console.error("Photo order exception:", err);
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
            <span className="text-amber-300">Passport Photo Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              📸 {currentLang === "hi" ? "पासपोर्ट फोटो प्रिंटिंग" : "Passport Photo Printing"}
            </h1>
            <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold">
              ⚡ Instant 5-Min Pickup
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "अपनी फोटो अपलोड करें, शीट लेआउट व पेपर फिनिश चुनें, ऑर्डर सबमिट करें और दुकान पर आते ही तैयार फोटो शीट प्राप्त करें।"
              : "Upload your photo, choose layout (8, 16, 32 photos) & finish. Collect high-gloss printed sheets at our Chakia center."}
          </p>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload Photo */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "अपनी पासपोर्ट/आईडी फोटो अपलोड करें" : "Upload Portrait Photo"}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">JPG, PNG</span>
              </div>

              {uploadedFile ? (
                <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="relative">
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Uploaded Portrait"
                      className="h-32 w-28 object-cover rounded-xl border-2 border-emerald-300 shadow-xs"
                    />
                    <span className="absolute bottom-1 right-1 rounded-md bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5">
                      Ready
                    </span>
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {uploadedFile.name}
                    </h4>
                    <p className="text-[11px] text-emerald-700 flex items-center justify-center sm:justify-start gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Quality verified</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentLang === "hi"
                        ? "पालक टीम बैकग्राउंड को साफ़ करके सटीक अनुपात में क्रॉप करेगी।"
                        : "Our studio technicians will fine-tune contrast and crop to clean photo proportions."}
                    </p>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{currentLang === "hi" ? "फोटो बदलें" : "Change Photo"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-[#123B70] hover:bg-blue-50/30 transition-all cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-[#123B70] transition-colors mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {currentLang === "hi" ? "फोटो चुनने के लिए क्लिक करें या यहाँ ड्रैग करें" : "Click to select passport photo from gallery/camera"}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    JPG, JPEG, PNG (Max 25MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}

              {fileError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </section>

            {/* Step 2: Photo Layout & Paper */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "शीट लेआउट व फिनिश चुनें" : "Select Layout & Finish"}</span>
                </div>
              </div>

              {/* Layouts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PHOTO_LAYOUTS.map((layout) => {
                  const isSelected = selectedLayout === layout.id;
                  const price = pricingConfig.passportPhoto[layout.baseKey] || 50;

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => setSelectedLayout(layout.id as any)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-[#123B70] bg-blue-50/70 text-[#123B70] shadow-xs ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-slate-900">
                          {currentLang === "hi" ? layout.labelHi : layout.labelEn}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {layout.photosCount} photos
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-[#123B70]">
                        ₹{price}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Finish & Copies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                {/* Paper Finish */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पेपर फिनिश (Paper Finish)" : "Paper Finish"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperFinish("glossy")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        paperFinish === "glossy"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {currentLang === "hi" ? "ग्लॉसी (Glossy)" : "Glossy Photo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperFinish("matte")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        paperFinish === "matte"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {currentLang === "hi" ? "मैट (Matte)" : "Matte Finish"}
                    </button>
                  </div>
                </div>

                {/* Number of Sheets */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "शीट संख्या (Quantity / Sheets)" : "Number of Sheets"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.max(1, c - 1))}
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-10 text-center font-bold text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-[#123B70] focus:outline-hidden text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setCopies((c) => c + 1)}
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
                        ? "⚡ बिना लाइन लगे तुरंत फोटो शीट लें! आपके पहुँचने से पहले ही फोटो प्रिंट व कट कर तैयार रहेंगे।"
                        : "⚡ Skip the line! Photos printed and cut in advance. Walk in, show Order ID, and collect instantly."}
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
                        ? "फोटो अभी भेजें। हम प्रिंट व कटिंग तैयार रखेंगे और आप दुकान पर लेने के समय भुगतान करें।"
                        : "Send your file now. We'll prepare your photo prints, and you can pay when you collect them."}
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
                    {currentLang === "hi" ? "ऑर्डर सारांश" : "Order Summary"}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Quote</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "लेआउट:" : "Layout:"}</span>
                  <span className="font-bold text-slate-900">
                    {currentLang === "hi" ? layoutObj.labelHi : layoutObj.labelEn}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "कुल फोटो:" : "Total Photos:"}</span>
                  <span className="font-semibold text-slate-800">
                    {layoutObj.photosCount * copies} photos
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "फिनिश:" : "Paper Finish:"}</span>
                  <span className="font-semibold text-slate-800 capitalize">{paperFinish}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "शीट संख्या:" : "Sheets:"}</span>
                  <span className="font-bold text-slate-900">{copies}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">
                  {currentLang === "hi" ? "कुल राशि" : "Total Price"}
                </span>
                <span className="text-2xl font-black text-[#123B70]">
                  ₹{totalAmount}
                </span>
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
                    <span>{currentLang === "hi" ? "ऑर्डर सबमिट हो रहा है..." : "Submitting Order..."}</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {currentLang === "hi"
                        ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`
                        : `Submit Photo Order (${paymentMethod === "pay_online" ? "Pay Online" : "Send Document"}) →`}
                    </span>
                  </>
                )}
              </button>

              <div className="rounded-xl bg-blue-50/60 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#123B70]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{currentLang === "hi" ? "दुकान पर तुरंत 5 मिनट में कलेक्ट करें" : "Instant 5-Min Pickup"}</span>
                </div>
                <p>
                  {currentLang === "hi"
                    ? "ऑर्डर सबमिट करने के बाद आपकी फोटो तैयार रहेगी।"
                    : "Your photo sheet will be printed and trimmed ready for fast counter pickup."}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {successData && (
        <OrderSuccessModal
          isOpen={successData.isOpen}
          onClose={() => setSuccessData(null)}
          orderCode={successData.orderCode}
          serviceName="Passport Photo Printing"
          documentType="Passport Photo Sheet"
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
