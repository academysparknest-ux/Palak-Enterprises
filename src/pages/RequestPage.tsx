import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "../components/SEO";
import { PageHero } from "../components/PageHero";
import { useLanguage } from "../context/LanguageContext";
import { servicesData } from "../config/services";
import { businessConfig } from "../config/business";
import {
  FileUp,
  Upload,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";

export const RequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get("service") || "";
  const initialCategory = searchParams.get("category") || "";

  const { lang, language, t } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(initialServiceId || (servicesData[0]?.id || ""));
  const [file, setFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color" | "na">("bw");
  const [instructions, setInstructions] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "call">("whatsapp");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const aliasMap: Record<string, string> = {
      "bw-printing": "document-printing",
      "color-printing": "document-printing",
      "photocopy": "document-printing",
      "digital-printing": "document-printing",
      "letter-pad": "letterhead-envelope",
      "letter-pads": "letterhead-envelope",
      "letterheads": "letterhead-envelope",
      "wedding-cards": "invitation-cards",
      "id-cards": "id-card-print",
      "flex-banner": "banners-posters",
      "online-forms": "online-form",
    };

    if (initialServiceId) {
      setServiceId(aliasMap[initialServiceId] || initialServiceId);
    } else if (initialCategory === "printing") {
      setServiceId("document-printing");
    } else if (initialCategory === "business") {
      setServiceId("visiting-cards");
    } else if (initialCategory === "online") {
      setServiceId("online-form");
    }
  }, [initialServiceId, initialCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExtensions.includes(ext)) {
        setErrorMsg(
          currentLang === "hi"
            ? "केवल PDF, JPG, JPEG या PNG फाइलों की अनुमति है।"
            : "Only PDF, JPG, JPEG, and PNG files are accepted."
        );
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMsg(t.requestForm.validationFile);
        setFile(null);
        return;
      }
      setErrorMsg("");
      setFile(selectedFile);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t.requestForm.validationName);
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setErrorMsg(t.requestForm.validationPhone);
      return;
    }
    if (!serviceId) {
      setErrorMsg(t.requestForm.validationService);
      return;
    }

    setErrorMsg("");
    setIsSuccess(true);

    const chosenService = servicesData.find((s) => s.id === serviceId);
    const serviceName = chosenService ? chosenService.name.en : serviceId;

    const message = encodeURIComponent(
      `*New Service Request - Palak Enterprises*\n` +
      `---------------------------\n` +
      `*Name:* ${name.trim()}\n` +
      `*Phone:* ${phone.trim()}\n` +
      `*Service:* ${serviceName}\n` +
      `*Quantity:* ${quantity}\n` +
      `*Print Color:* ${colorMode.toUpperCase()}\n` +
      `*Preferred Response:* ${preferredContact.toUpperCase()}\n` +
      (file ? `*Attached File:* ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n` : "") +
      (instructions.trim() ? `*Instructions:* ${instructions.trim()}\n` : "") +
      `---------------------------\n` +
      `Please reply with confirmation and pricing.`
    );

    window.open(`https://wa.me/${businessConfig.whatsappNumber}?text=${message}`, "_blank");
  };

  const selectedServiceObj = servicesData.find((s) => s.id === serviceId);

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <SEO
        title={{
          en: "Service Request & Document Upload | Palak Enterprises",
          hi: "सेवा अनुरोध एवं दस्तावेज अपलोड | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Submit an online request for printing, photocopy, photo prints, or online government form assistance. Upload your document and chat with Palak Enterprises.",
          hi: "प्रिंटिंग, फोटोकॉपी, फोटो प्रिंट या ऑनलाइन सरकारी फॉर्म के लिए ऑनलाइन अनुरोध भेजें। दस्तावेज अपलोड करें और सीधे संपर्क करें।",
        }}
      />

      {/* Page Hero */}
      <PageHero
        breadcrumbs={[
          { label: { en: "Request Service", hi: "सेवा अनुरोध" }, path: "/request" },
        ]}
        badge={{
          en: "Instant Digital & Print Dispatch",
          hi: "त्वरित डिजिटल एवं प्रिंट सेवा",
        }}
        title={{
          en: "Online Service Request & Document Upload",
          hi: "ऑनलाइन सेवा अनुरोध एवं दस्तावेज अपलोड",
        }}
        subtitle={{
          en: "Submit your requirements, specify print options, or upload your document file. We will prepare your order promptly.",
          hi: "अपनी आवश्यकता का चयन करें, प्रिंट विवरण चुनें और फाइल अपलोड करें। हम तुरंत आपका काम तैयार करेंगे।",
        }}
        primaryCta={{
          label: { en: "Quick WhatsApp Request", hi: "व्हाट्सएप अनुरोध" },
          to: `https://wa.me/${businessConfig.whatsappNumber}?text=Hello%20Palak%20Enterprises,%20I%20want%20to%20place%20a%20service%20request.`,
        }}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          {isSuccess ? (
            <div className="text-center py-10 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-2xl font-black text-slate-900">
                {currentLang === "hi" ? "अनुरोध सफलतापूर्वक प्राप्त हुआ!" : "Request Recorded Successfully!"}
              </h3>
              <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                {t.requestForm.successMessage}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${businessConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-leaf hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat with us on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setName("");
                    setPhone("");
                    setInstructions("");
                    setFile(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer"
                >
                  {currentLang === "hi" ? "नया अनुरोध भेजें" : "Submit Another Request"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-brandred text-xs sm:text-sm font-bold flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Personal Information */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.requestForm.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.requestForm.namePlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.requestForm.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.requestForm.phonePlaceholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy font-mono"
                    required
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.requestForm.serviceLabel}
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                >
                  <option value="">{t.requestForm.selectService}</option>
                  {servicesData.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name[currentLang]} ({s.name[currentLang === "en" ? "hi" : "en"]})
                    </option>
                  ))}
                </select>

                {selectedServiceObj?.disclaimer && (
                  <p className="text-xs text-amber-700 mt-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    ℹ️ {selectedServiceObj.disclaimer[currentLang]}
                  </p>
                )}
              </div>

              {/* Printing Options (Quantity & Color Mode) */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.requestForm.quantityLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-navy font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t.requestForm.printTypeLabel}
                  </label>
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy"
                  >
                    <option value="bw">{t.requestForm.bwOption}</option>
                    <option value="color">{t.requestForm.colorOption}</option>
                    <option value="na">{t.requestForm.notApplicable}</option>
                  </select>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.requestForm.fileLabel}
                </label>
                {file ? (
                  <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        const input = document.getElementById("doc-file-upload") as HTMLInputElement;
                        if (input) input.value = "";
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-brandred text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      aria-label={currentLang === "hi" ? "फाइल हटाएं" : "Remove file"}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{currentLang === "hi" ? "हटाएं" : "Remove"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-navy rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-all relative">
                    <input
                      type="file"
                      id="doc-file-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-xs sm:text-sm font-bold text-navy">
                        {currentLang === "hi"
                          ? "फाइल चुनने के लिए क्लिक करें (Click to upload)"
                          : "Click or drag file here to upload"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {t.requestForm.fileHelpText}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.requestForm.instructionsLabel}
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={t.requestForm.instructionsPlaceholder}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>

              {/* Preferred Contact Mode */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t.requestForm.preferredContactLabel}
                </span>
                <div className="flex space-x-3 text-xs font-bold">
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="whatsapp"
                      checked={preferredContact === "whatsapp"}
                      onChange={() => setPreferredContact("whatsapp")}
                      className="text-leaf focus:ring-leaf"
                    />
                    <span>{t.requestForm.contactWhatsApp}</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="call"
                      checked={preferredContact === "call"}
                      onChange={() => setPreferredContact("call")}
                      className="text-brandred focus:ring-brandred"
                    />
                    <span>{t.requestForm.contactCall}</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-4 px-6 rounded-2xl bg-brandred hover:bg-red-700 text-white font-bold text-sm shadow-md transition-transform hover:scale-[1.01] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <FileUp className="w-5 h-5" />
                  <span>{t.requestForm.submitButton}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestPage;
