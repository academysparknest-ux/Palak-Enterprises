import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { submitPrintOrder, uploadOrderFile } from "../../lib/supabase/database";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { OrderAuthGate } from "../../components/OrderAuthGate";

const CUSTOM_PRODUCT_TYPES = [
  "Pamphlet / Handbill",
  "Flyer",
  "Brochure (Bi-fold / Tri-fold)",
  "Letterhead & Envelopes",
  "Carbonless Bill Book / Invoice Pad",
  "Sticker / Label",
  "Restaurant Menu Card",
  "Poster / Wall Graphic",
  "Banner / Flex Board",
  "Certificate / Memento Print",
  "Custom Invitation Card",
  "Other Custom Requirement",
];

export const CustomPrintPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user } = useAuth();

  const [productType, setProductType] = useState<string>(CUSTOM_PRODUCT_TYPES[0]);
  const [customProductText, setCustomProductText] = useState<string>("");
  const [quantityText, setQuantityText] = useState<string>("500 copies");
  const [sizeText, setSizeText] = useState<string>("A4 / 1/8 Demy");
  const [paperMaterialText, setPaperMaterialText] = useState<string>("80 GSM Maplitho / 130 GSM Art Paper");
  const [colorOption, setColorOption] = useState<"single_color" | "two_color" | "multi_color">("multi_color");
  const [finishingNeeds, setFinishingNeeds] = useState<string>("");

  // File
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

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    isOpen: boolean;
    orderCode: string;
    totalAmount: number;
    specifications: Record<string, string>;
  } | null>(null);

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

  const getFinalProductType = () => {
    if (productType === "Other Custom Requirement" && customProductText) {
      return customProductText;
    }
    return productType;
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

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
        currentLang === "hi" ? "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = "";
      let storagePath = "";
      if (uploadedFile?.file) {
        const uploadRes = await uploadOrderFile(uploadedFile.file, `CUSTOM-${Date.now()}`);
        if (uploadRes) {
          fileUrl = uploadRes.url;
          storagePath = uploadRes.storagePath;
        }
      }

      const specifications: Record<string, string> = {
        Product: getFinalProductType(),
        Quantity: quantityText,
        Size: sizeText,
        Material: paperMaterialText,
        Color: colorOption.replace("_", " ").toUpperCase(),
        Finishing: finishingNeeds || "None specified",
      };

      const res = await submitPrintOrder({
        serviceId: "custom-print",
        serviceName: "Custom Print Order",
        documentType: getFinalProductType(),
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        instructions: instructions.trim() || undefined,
        userId: user?.id,
        paymentMethod: "pay_at_store",
        paymentStatus: "pending",
        pricingSnapshot: {
          unitPrice: 0,
          subtotal: 0,
          totalAmount: 0,
          breakdown: { customQuote: true },
        },
        options: {
          productType: getFinalProductType(),
          quantityText,
          sizeText,
          paperMaterialText,
          colorOption,
          finishingNeeds,
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
          totalAmount: 0,
          specifications,
        });
      } else {
        setSubmitError(res.error || "Failed to submit custom quote.");
      }
    } catch (err: any) {
      console.error("Custom print exception:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
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
        <div className="relative mx-auto max-w-5xl space-y-2.5">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> /{" "}
            <Link to="/online-services" className="hover:underline">Instant Online Services</Link> /{" "}
            <span className="text-amber-300">Custom Print Order</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              🖨️ {currentLang === "hi" ? "कस्टम प्रिंट ऑर्डर एवं कोटेशन" : "Custom Print Order & Quote Request"}
            </h1>
            <span className="rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-3 py-0.5 text-xs font-bold">
              Personalized Consultation
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "पम्पलेट, बिल बुक, लेटरहेड, स्टिकर, मेन्यू या अन्य किसी भी प्रिंटिंग कार्य के लिए अपनी आवश्यकता सबमिट करें। हम तुरंत कोटेशन देंगे।"
              : "If your printing requirement doesn't fit standard categories, submit your custom specs here for an exact commercial quote and production estimate."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        <form onSubmit={handleSubmitQuote} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Product Type */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "आप क्या उत्पाद प्रिंट कराना चाहते हैं?" : "What product do you want to print?"}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">Select Print Type *</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  {CUSTOM_PRODUCT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>

                {productType === "Other Custom Requirement" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Specify Requirement Name *</label>
                    <input
                      type="text"
                      required
                      value={customProductText}
                      onChange={(e) => setCustomProductText(e.target.value)}
                      placeholder="e.g. Garment Tags, Box Packaging, Danglers..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Custom Specifications */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>Printing Specifications</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Expected Quantity *</label>
                  <input
                    type="text"
                    required
                    value={quantityText}
                    onChange={(e) => setQuantityText(e.target.value)}
                    placeholder="e.g. 500 copies, 10 bill books, 1000 stickers..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Approximate Size</label>
                  <input
                    type="text"
                    value={sizeText}
                    onChange={(e) => setSizeText(e.target.value)}
                    placeholder="e.g. A4, A5, 1/4 Demy, 4×6 inches..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Paper / Material Preference</label>
                  <input
                    type="text"
                    value={paperMaterialText}
                    onChange={(e) => setPaperMaterialText(e.target.value)}
                    placeholder="e.g. Bond Paper, Art Card, Vinyl, Sticker Sheet..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Color Mode</label>
                  <select
                    value={colorOption}
                    onChange={(e) => setColorOption(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  >
                    <option value="single_color">Single Color (B/W or Blue)</option>
                    <option value="two_color">Two Color Print</option>
                    <option value="multi_color">Full Multi-Color (CMYK)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Binding / Finishing Needs</label>
                <input
                  type="text"
                  value={finishingNeeds}
                  onChange={(e) => setFinishingNeeds(e.target.value)}
                  placeholder="e.g. Numbering, Perforation, Hard Binding, Lamination..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              {/* Upload Artwork */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Upload Reference File / Design (Optional)
                </label>
                {uploadedFile ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 truncate">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{uploadedFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setUploadedFile(null)} className="text-xs text-rose-600 hover:underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-[#123B70] cursor-pointer bg-slate-50">
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Attach Sample Design, Rough Draft or PDF</span>
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
                {fileError && <p className="text-xs text-rose-600">{fileError}</p>}
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
          </div>

          {/* Right 1 Column */}
          <div className="space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Printer className="h-5 w-5 text-[#123B70]" />
                <h3 className="text-base font-extrabold text-slate-900">Custom Quote</h3>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[150px]">{getFinalProductType()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-semibold text-slate-800">{quantityText}</span>
                </div>
                <div className="flex justify-between">
                  <span>Color:</span>
                  <span className="font-semibold text-slate-800 capitalize">{colorOption.replace("_", " ")}</span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Commercial Price Estimate</span>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Upon submitting, our estimator will review your specifications and confirm final rate via WhatsApp/Call.
                </p>
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
                {submitting ? "Submitting Request..." : "Request Quote →"}
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
          serviceName="Custom Print Order"
          documentType={getFinalProductType()}
          specifications={successData.specifications}
          totalAmount={0}
          customerName={customerName}
          customerPhone={customerPhone}
        />
      )}
    </div>
  );
};
