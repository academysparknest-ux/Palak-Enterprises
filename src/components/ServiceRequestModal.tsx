import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { servicesData, type ServiceItem } from "../config/services";
import { galleryData } from "../config/gallery";
import { getWhatsAppLink } from "../config/business";
import { PalakDataStore } from "../lib/storage/store";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { uploadOrderFile } from "../lib/supabase/database";
import { X, Upload, CheckCircle2, MessageSquare, Phone, Send, AlertTriangle, ShieldCheck, Eye } from "lucide-react";

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService?: ServiceItem | null;
  initialPaymentMethod?: "pay_online" | "pay_at_shop";
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  selectedService,
  initialPaymentMethod,
}) => {
  const { language, t } = useLanguage();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color" | "na">("bw");
  const [paymentPreference, setPaymentPreference] = useState<"pay_online" | "pay_at_shop">(
    initialPaymentMethod || "pay_online"
  );
  const [instructions, setInstructions] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "call">("whatsapp");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialPaymentMethod) {
      setPaymentPreference(initialPaymentMethod);
    }
  }, [initialPaymentMethod, isOpen]);

  // Lock background body scroll & support Escape key closing
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedService) {
      setServiceId(selectedService.id);
    } else if (servicesData.length > 0) {
      setServiceId(servicesData[0].id);
    }
  }, [selectedService]);

  if (!isOpen) return null;

  const currentSelectedService = servicesData.find((s) => s.id === serviceId) || selectedService;

  // Sanitize filename to prevent path traversal or dangerous characters
  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate Extension
      const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExtensions.includes(ext)) {
        setErrorMsg(
          language === "hi"
            ? "केवल PDF, JPG, JPEG या PNG फाइलों की अनुमति है।"
            : "Only PDF, JPG, JPEG or PNG files are supported."
        );
        setFile(null);
        return;
      }

      // File size check (Max 10MB = 10 * 1024 * 1024 bytes)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMsg(t.requestForm.validationFile);
        setFile(null);
        return;
      }

      setErrorMsg("");
      setFile(selectedFile);
    }
  };

  const validate = () => {
    if (!name.trim()) {
      setErrorMsg(t.requestForm.validationName);
      return false;
    }

    // Phone format validation (Must be 10 digits)
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg(t.requestForm.validationPhone);
      return false;
    }

    if (!serviceId) {
      setErrorMsg(t.requestForm.validationService);
      return false;
    }

    if (quantity < 1 || quantity > 1000) {
      setErrorMsg(
        language === "hi"
          ? "कृपया 1 से 1000 के बीच कॉपी संख्या दर्ज करें।"
          : "Please enter a quantity between 1 and 1000."
      );
      return false;
    }

    setErrorMsg("");
    return true;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const randomSuffix = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");
      const requestCode = `PE-SR-${year}${month}${day}-${randomSuffix}`;

      const serviceName = currentSelectedService
        ? currentSelectedService.name.en
        : "General Digital Service";

      let fileUrl = "";
      let fileName = file ? sanitizeFilename(file.name) : "";

      if (file) {
        const uploadRes = await uploadOrderFile(file, requestCode);
        if (uploadRes) {
          fileUrl = uploadRes.url;
        }
      }

      const estimatedFee = (currentSelectedService as any)?.price?.startingFrom || 0;

      // 1. Sync to local store fallback
      try {
        PalakDataStore.createServiceRequest({
          requestCode,
          serviceId: currentSelectedService?.id || "general-service",
          serviceName,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          preferredContact: preferredContact === "call" ? "phone" : "whatsapp",
          applicantDetails: {
            quantity: String(quantity),
            colorMode,
            paymentPreference,
            serviceSlug: currentSelectedService?.slug || "",
          },
          uploadedDocumentUrls: fileUrl ? [fileUrl] : [],
          uploadedDocumentNames: fileName ? [fileName] : [],
          additionalNotes: instructions.trim() || undefined,
          estimatedFee,
          requestStatus: "NEW",
        });
      } catch (err) {
        console.warn("Local fallback note:", err);
      }

      // 2. Persist to Supabase Database
      if (isSupabaseConfigured && supabase) {
        const { error: dbErr } = await supabase.from("service_requests").insert({
          request_code: requestCode,
          service_id: currentSelectedService?.id || "general-service",
          service_name: serviceName,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          preferred_contact: preferredContact === "call" ? "phone" : "whatsapp",
          applicant_details: {
            quantity: String(quantity),
            colorMode,
            paymentPreference,
          },
          uploaded_document_urls: fileUrl ? [fileUrl] : [],
          additional_notes: instructions.trim() || null,
          estimatedFee,
          request_status: "NEW",
        });

        if (dbErr) {
          console.warn("Supabase service request insert notice:", dbErr);
        } else {
          await supabase.from("status_history").insert({
            entity_type: "service_request",
            entity_code: requestCode,
            new_status: "NEW",
            message_en: `Service request received for ${serviceName}.`,
            message_hi: `${serviceName} के लिए सेवा अनुरोध प्राप्त हुआ।`,
            performed_by: "Online Customer",
          });
        }
      }

      setSubmittedCode(requestCode);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Service request error:", err);
      setErrorMsg(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setFile(null);
    setQuantity(1);
    setColorMode("bw");
    setInstructions("");
    setErrorMsg("");
    setSubmittedCode(null);
    setIsSuccess(false);
  };

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
    >
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            if (isSuccess) resetForm();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          aria-label={language === "hi" ? "मोडाल बंद करें" : "Close modal"}
        >
          <X className="w-6 h-6" />
        </button>

        {isSuccess && submittedCode ? (
          <div className="py-6 text-center space-y-5 animate-fadeUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === "hi" ? "✓ अनुरोध सफलतापूर्वक प्राप्त हुआ!" : "✓ Request Submitted Successfully!"}
              </h3>
              <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-sm">
                {language === "hi"
                  ? "आपका सेवा अनुरोध हमारे एडमिन पोर्टल पर दर्ज हो गया है। हमारी टीम जल्द ही इस पर काम शुरू करेगी।"
                  : "Your service request is submitted directly to our CSC Operations Portal. You can track progress in real-time."}
              </p>
            </div>

            {/* Request Code Box */}
            <div className="rounded-2xl border-2 border-dashed border-[#123B70]/30 bg-blue-50/50 p-4 max-w-sm mx-auto space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {language === "hi" ? "आपका ट्रैकिंग रेफरेंस कोड" : "Your Tracking Reference ID"}
              </span>
              <span className="text-xl font-mono font-black text-[#123B70] tracking-wide block">
                {submittedCode}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2 max-w-md mx-auto">
              <Link
                to={`/order-status?code=${submittedCode}`}
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all"
              >
                <span>{language === "hi" ? "अनुरोध लाइव ट्रैक करें" : "Track Request Status"}</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                {language === "hi" ? "बंद करें / अन्य सेवा चुनें" : "Close"}
              </button>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={getWhatsAppLink(
                    `Hello Palak Enterprises, I have submitted service request ID: *${submittedCode}* for *${currentSelectedService?.name.en || "Digital Service"}*.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === "hi" ? "व्हाट्सएप पर सहायता चाहिए?" : "Need assistance on WhatsApp?"}</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 id="request-modal-title" className="text-2xl font-black text-slate-900 tracking-tight">
                {t.requestForm.title}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1">
                {t.requestForm.subtitle}
              </p>
            </div>

            {/* Privacy & File Notice */}
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                {language === "hi"
                  ? "आपकी गोपनीयता सुरक्षित है। चुनी गई फाइल आपके डिवाइस पर ही रहती है और व्हाट्सएप के माध्यम से पालक इंटरप्राइजेज को भेजी जाती है।"
                  : "Your document privacy is protected. Files remain on your device and are transferred directly to Palak Enterprises via WhatsApp."}
              </span>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmitRequest}>
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="req-name" className="block text-xs font-bold text-slate-700 mb-1">
                    {t.requestForm.nameLabel}
                  </label>
                  <input
                    id="req-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.requestForm.namePlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="req-phone" className="block text-xs font-bold text-slate-700 mb-1">
                    {t.requestForm.phoneLabel}
                  </label>
                  <input
                    id="req-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.requestForm.phonePlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label htmlFor="req-service" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.requestForm.serviceLabel}
                </label>
                <select
                  id="req-service"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                >
                  {servicesData.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name[language]}
                    </option>
                  ))}
                </select>

                {/* Service Specific Sample Previews */}
                {(() => {
                  const relatedSamples = galleryData.filter((g) =>
                    g.relatedServiceIds?.includes(serviceId)
                  );
                  if (relatedSamples.length === 0) return null;

                  return (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-extrabold text-slate-700 flex items-center space-x-1">
                          <Eye className="w-3.5 h-3.5 text-blue-900" />
                          <span>
                            {language === "hi"
                              ? `इस सेवा के लिए ${relatedSamples.length} सैंपल डिज़ाइन`
                              : `${relatedSamples.length} Sample Designs for this service`}
                          </span>
                        </span>
                        <a
                          href="#gallery"
                          onClick={onClose}
                          className="text-[11px] font-bold text-blue-900 hover:underline"
                        >
                          {language === "hi" ? "सभी देखें →" : "View All →"}
                        </a>
                      </div>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                        {relatedSamples.map((sample) => (
                          <a
                            key={sample.id}
                            href="#gallery"
                            onClick={onClose}
                            className="shrink-0 w-24 aspect-4/3 rounded-lg overflow-hidden border border-slate-200 relative group"
                            title={sample.title[language]}
                          >
                            <img
                              src={sample.imageUrl}
                              alt={sample.imageAlt[language]}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[9px] font-bold text-white px-1 py-0.5 truncate text-center">
                              {sample.badge[language]}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Document Upload */}
              <div>
                <label htmlFor="req-file-input" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.requestForm.fileLabel}
                </label>
                {file ? (
                  <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/80 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">📎</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-navy truncate">
                          {sanitizeFilename(file.name)}
                        </p>
                        <p className="text-[10px] text-blue-700">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        const input = document.getElementById("req-file-input") as HTMLInputElement;
                        if (input) input.value = "";
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-brandred text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      aria-label={language === "hi" ? "फाइल हटाएं" : "Remove file"}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{language === "hi" ? "हटाएं" : "Remove"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-center cursor-pointer relative">
                    <input
                      id="req-file-input"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {language === "hi" ? "फाइल चुनने के लिए क्लिक करें" : "Click to select document or image"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.requestForm.fileHelpText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity & Print Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="req-quantity" className="block text-xs font-bold text-slate-700 mb-1">
                    {t.requestForm.quantityLabel}
                  </label>
                  <input
                    id="req-quantity"
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="req-color-mode" className="block text-xs font-bold text-slate-700 mb-1">
                    {t.requestForm.printTypeLabel}
                  </label>
                  <select
                    id="req-color-mode"
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as "bw" | "color" | "na")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  >
                    <option value="bw">{t.requestForm.bwOption}</option>
                    <option value="color">{t.requestForm.colorOption}</option>
                    <option value="na">{t.requestForm.notApplicable}</option>
                  </select>
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <label htmlFor="req-instructions" className="block text-xs font-bold text-slate-700 mb-1">
                  {t.requestForm.instructionsLabel}
                </label>
                <textarea
                  id="req-instructions"
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={t.requestForm.instructionsPlaceholder}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              {/* Payment Option Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === "hi" ? "भुगतान माध्यम चुनें (Payment Preference)" : "Choose How You Want to Pay"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentPreference === "pay_online"
                        ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentPreference"
                      value="pay_online"
                      checked={paymentPreference === "pay_online"}
                      onChange={() => setPaymentPreference("pay_online")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{language === "hi" ? "ऑनलाइन भुगतान" : "Pay Online"}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-600 text-white rounded-full">
                          {language === "hi" ? "नो वेटिंग" : "NO WAITING"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {language === "hi"
                          ? "पिकअप पर प्रतीक्षा नहीं — तैयार मिलेगा"
                          : "No waiting at pickup — ready before arrival"}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentPreference === "pay_at_shop"
                        ? "bg-amber-50/80 border-amber-500 text-amber-950 ring-1 ring-amber-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentPreference"
                      value="pay_at_shop"
                      checked={paymentPreference === "pay_at_shop"}
                      onChange={() => setPaymentPreference("pay_at_shop")}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{language === "hi" ? "दुकान पर भुगतान" : "Pay at Shop"}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-600 text-white rounded-full">
                          {language === "hi" ? "दुकान पर" : "AT SHOP"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {language === "hi"
                          ? "प्रिंट तैयार रहेगा, लेने पर भुगतान करें"
                          : "We'll prepare it. Pay when you collect."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.requestForm.preferredContactLabel}
                </span>
                <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="whatsapp"
                      checked={preferredContact === "whatsapp"}
                      onChange={() => setPreferredContact("whatsapp")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>{t.requestForm.contactWhatsApp}</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="call"
                      checked={preferredContact === "call"}
                      onChange={() => setPreferredContact("call")}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <Phone className="w-4 h-4 text-red-600" />
                    <span>{t.requestForm.contactCall}</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 focus:ring-2 focus:ring-blue-900 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? language === "hi"
                        ? "अनुरोध भेजा जा रहा है..."
                        : "Submitting Request..."
                      : t.requestForm.submitButton}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
