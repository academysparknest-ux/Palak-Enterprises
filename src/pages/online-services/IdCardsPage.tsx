import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  Calculator,
  User,
  Plus,
  Minus,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from "../../config/printPricing";
import { getPrintPricingConfig, submitPrintOrder, uploadOrderFile } from "../../lib/supabase/database";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { cn } from "../../lib/utils";

export const IdCardsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();

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
      setFileError(currentLang === "hi" ? "केवल फोटो फ़ाइल समर्थित है।" : "Only image files allowed.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedPhoto({
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    });
  };

  // Price Calculation
  const baseCardRate = cardSides === "single" ? pricingConfig.idCards.pvcSingle : pricingConfig.idCards.pvcDouble;
  const lanyardRate = includeLanyard ? pricingConfig.idCards.withLanyardHolder : 0;
  const unitPrice = baseCardRate + lanyardRate;
  const totalAmount = unitPrice * Math.max(1, quantity);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!holderName.trim() || !organization.trim()) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया नाम एवं संस्था का नाम दर्ज करें।"
          : "Please enter cardholder name and organization."
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

      const specifications: Record<string, string> = {
        Holder: holderName,
        Organization: organization,
        Sides: cardSides === "single" ? "Single Side Front" : "Double Side (Front & Back)",
        Lanyard: includeLanyard ? "With Premium Lanyard & Holder" : "Card Only",
        Quantity: `${quantity} ID Card(s)`,
      };

      const res = await submitPrintOrder({
        serviceId: "id-cards",
        serviceName: "ID Card Printing",
        documentType: `PVC ID Card (${organization})`,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        instructions: instructions.trim() || undefined,
        userId: user?.id,
        paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_store",
        paymentStatus: "pending",
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
          paymentMethod,
          paymentStatus: "pending",
        });
      } else {
        setSubmitError(res.error || "Failed to submit order.");
      }
    } catch (err: any) {
      console.error("ID Card order exception:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
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
                <div className="rounded-xl bg-[#123B70] text-white p-2.5 text-center">
                  <h4 className="text-xs font-black tracking-tight uppercase truncate">{organization || "ORGANIZATION NAME"}</h4>
                  <p className="text-[9px] text-amber-300 font-semibold tracking-wider">IDENTITY CARD</p>
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

              {/* Photo Upload */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "पासपोर्ट फोटो अपलोड करें *" : "Upload Cardholder Photo *"}
                </label>
                {uploadedPhoto ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{uploadedPhoto.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedPhoto(null)}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-[#123B70] cursor-pointer bg-slate-50">
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Choose Portrait Photo (JPG, PNG)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
                {fileError && <p className="text-xs text-rose-600">{fileError}</p>}
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
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Mention custom logo, barcode requirement or delivery preferences..."
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
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-50 py-3.5 px-4 text-xs sm:text-sm font-extrabold text-white shadow-card transition-all cursor-pointer"
              >
                {submitting ? (
                  "Submitting..."
                ) : (
                  <span>
                    {currentLang === "hi"
                      ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`
                      : `Submit ID Card Order (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`}
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
    </div>
  );
};
