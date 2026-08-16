import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { servicesData, type ServiceItem } from "../config/services";
import { galleryData } from "../config/gallery";
import { businessConfig } from "../config/business";
import { X, Upload, CheckCircle2, MessageSquare, Phone, Send, AlertTriangle, ShieldCheck, Eye } from "lucide-react";

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService?: ServiceItem | null;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  selectedService,
}) => {
  const { language, t } = useLanguage();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color" | "na">("bw");
  const [instructions, setInstructions] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "call">("whatsapp");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

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

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      resetForm();
    }, 3000);
  };

  const handleSubmitWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const serviceName = currentSelectedService
      ? currentSelectedService.name[language]
      : "General Service";

    const colorText =
      colorMode === "bw"
        ? t.requestForm.bwOption
        : colorMode === "color"
        ? t.requestForm.colorOption
        : "N/A";

    const sanitizedFileName = file ? sanitizeFilename(file.name) : null;

    let text = "";
    if (language === "hi") {
      text = `*पालक इंटरप्राइजेज - सेवा अनुरोध*
--------------------------------
👤 *नाम:* ${name}
📞 *मोबाइल:* ${phone}
🛠️ *सेवा:* ${serviceName}
📄 *कॉपी की संख्या:* ${quantity}
🎨 *प्रिंट प्रकार:* ${colorText}
📎 *चुनी गई फाइल:* ${sanitizedFileName ? sanitizedFileName : "कोई फाइल नहीं संलग्न"}
📝 *अतिरिक्त निर्देश:* ${instructions || "कोई नहीं"}
💬 *संपर्क माध्यम:* ${preferredContact === "whatsapp" ? "व्हाट्सएप" : "फोन कॉल"}`;
    } else {
      text = `*Palak Enterprises - Service Request*
--------------------------------
👤 *Name:* ${name}
📞 *Phone:* ${phone}
🛠️ *Service:* ${serviceName}
📄 *Copies:* ${quantity}
🎨 *Print Type:* ${colorText}
📎 *Selected File:* ${sanitizedFileName ? sanitizedFileName : "None attached"}
📝 *Instructions:* ${instructions || "None"}
💬 *Preferred Contact:* ${preferredContact === "whatsapp" ? "WhatsApp" : "Phone Call"}`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${businessConfig.whatsappNumber}?text=${encoded}`, "_blank");

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      resetForm();
    }, 2000);
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setFile(null);
    setQuantity(1);
    setColorMode("bw");
    setInstructions("");
    setErrorMsg("");
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
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-900"
          aria-label={language === "hi" ? "मोडाल बंद करें" : "Close modal"}
        >
          <X className="w-6 h-6" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">
              {language === "hi" ? "अनुरोध सफलतापूर्वक प्राप्त हुआ!" : "Request Submitted!"}
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm">{t.requestForm.successMessage}</p>
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
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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

              {/* Submit Buttons */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSubmitWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 focus:ring-2 focus:ring-emerald-500"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>{t.requestForm.submitWhatsAppButton}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  className="w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 focus:ring-2 focus:ring-blue-900"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.requestForm.submitButton}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
