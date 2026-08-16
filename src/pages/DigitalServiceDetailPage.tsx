import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { FileUploadZone } from "../components/FileUploadZone";
import { getWhatsAppLink } from "../config/business";
import { DynamicIcon } from "../components/DynamicIcon";

export const DigitalServiceDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const service = PalakDataStore.getServiceBySlug(slug || "");

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "phone" | "email">("whatsapp");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestCode, setSubmittedRequestCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">
          {currentLang === "hi" ? "सेवा नहीं मिली" : "Digital Service Not Found"}
        </h2>
        <p className="text-xs text-slate-500">
          The requested online service does not exist or has been modified.
        </p>
        <Link
          to="/digital-services"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Digital Services Directory</span>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError(currentLang === "hi" ? "कृपया अपना नाम दर्ज करें" : "Please enter your full name");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setError(currentLang === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें" : "Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await PalakDataStore.createServiceRequest({
        serviceId: service.id,
        serviceName: service.name.en,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        preferredContact,
        additionalNotes: additionalNotes.trim() || undefined,
        uploadedDocumentUrls: uploadedFile ? [uploadedFile.url] : [],
        uploadedDocumentNames: uploadedFile ? [uploadedFile.name] : [],
        estimatedFee: service.estimatedFee,
      });

      setSubmittedRequestCode(result.requestCode);
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappInquiryUrl = getWhatsAppLink(
    `Hello Palak Enterprises, I need assisted support for: *${service.name.en}*.`
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-200 bg-white py-3 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link to="/digital-services" className="hover:text-slate-900">Digital Services</Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-none">
              {service.name[currentLang]}
            </span>
          </div>
          <Link to="/digital-services" className="hover:text-[#123B70] flex items-center gap-1 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Digital Services</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-10">
        {/* Main Grid: Details on Left + Application Form on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 items-start">
          {/* Left Column: Service Details, Requirements & Instructions */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-[#123B70] flex items-center justify-center p-2.5 border border-blue-100">
                  <DynamicIcon name={service.iconName} size={24} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>CSC Assisted Service</span>
                  </span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {service.officialPortalName || "Official Government Portal"}
                  </div>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {service.name[currentLang]}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {service.description[currentLang]}
              </p>

              {/* Processing Info & Estimated Fee */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                    {currentLang === "hi" ? "अनुमानित समय" : "Processing Time"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-[#123B70]" />
                    <span>{service.processingTime[currentLang]}</span>
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                    {currentLang === "hi" ? "सहायता शुल्क" : "Assistance Fee"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>₹{service.estimatedFee} approx</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Required Documents Checklist */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {currentLang === "hi" ? "आवश्यक दस्तावेज चेकलिस्ट" : "Required Documents Checklist"}
                </h3>
              </div>

              <div className="space-y-2 pt-1">
                {service.requiredDocuments.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{doc[currentLang]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Who Needs It & Important Instructions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              {service.whoNeedsIt.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {currentLang === "hi" ? "यह सेवा किसे चाहिए?" : "Who Needs This Service?"}
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                    {service.whoNeedsIt.map((item, idx) => (
                      <li key={idx}>{item[currentLang]}</li>
                    ))}
                  </ul>
                </div>
              )}

              {service.importantInstructions.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {currentLang === "hi" ? "महत्वपूर्ण निर्देश" : "Important Instructions"}
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                    {service.importantInstructions.map((item, idx) => (
                      <li key={idx}>{item[currentLang]}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Official Disclaimer */}
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100">
                <span className="font-semibold text-slate-700">Disclaimer: </span>
                {service.disclaimer[currentLang]}
              </div>
            </div>
          </div>

          {/* Right Column: Service Request Form or Confirmation Card */}
          <div className="sticky top-20">
            {submittedRequestCode ? (
              <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-card text-center space-y-4 animate-fadeUp">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-900">
                  {currentLang === "hi" ? "अनुरोध सफलतापूर्वक दर्ज हुआ!" : "Request Submitted Successfully!"}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentLang === "hi"
                    ? "पालक इंटरप्राइजेज टीम आपके दस्तावेजों की जांच कर शीघ्र संपर्क करेगी।"
                    : "Our CSC operator will review your details and connect with you via WhatsApp/Phone."}
                </p>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Your Tracking Code
                  </span>
                  <span className="text-lg font-black text-[#123B70] tracking-wider block mt-0.5">
                    {submittedRequestCode}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    to={`/track-order?code=${submittedRequestCode}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-colors"
                  >
                    <span>{currentLang === "hi" ? "स्थिति ट्रैक करें" : "Track Request Status"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <a
                    href={getWhatsAppLink(`Hello Palak, I submitted request *${submittedRequestCode}* for *${service.name.en}*.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Update</span>
                  </a>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-4"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    {currentLang === "hi" ? "ऑनलाइन आवेदन सहायता" : "Start Application"}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {currentLang === "hi" ? "विवरण दर्ज करें" : "Submit Service Request"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentLang === "hi"
                      ? "अपनी जानकारी भरें, हम सरकारी पोर्टल पर आपका फॉर्म भर देंगे।"
                      : "Fill your contact details and attach any supporting documents."}
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {currentLang === "hi" ? "आवेदक का पूरा नाम *" : "Applicant Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Kumar"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {currentLang === "hi" ? "मोबाइल नंबर (व्हाट्सएप) *" : "Mobile Number (WhatsApp) *"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9905238015"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {currentLang === "hi" ? "ईमेल पता (वैकल्पिक)" : "Email Address (Optional)"}
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {currentLang === "hi" ? "पसंदीदा संपर्क माध्यम" : "Preferred Contact Method"}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["whatsapp", "phone", "email"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPreferredContact(method)}
                          className={`p-2 rounded-xl border text-xs capitalize text-center font-semibold cursor-pointer ${
                            preferredContact === method
                              ? "border-[#123B70] bg-blue-50/60 text-[#123B70] font-bold"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Document upload zone */}
                  <FileUploadZone
                    selectedFile={uploadedFile}
                    onFileSelect={setUploadedFile}
                    label={currentLang === "hi" ? "दस्तावेज अपलोड करें (आधार / फोटो)" : "Attach Document (Aadhaar / Photo)"}
                    helperText="Upload clear photo or PDF of your ID / certificates"
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {currentLang === "hi" ? "अतिरिक्त जानकारी / निर्देश" : "Additional Instructions"}
                    </label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder={currentLang === "hi" ? "कोई विशेष आवश्यकता या सुधार का विवरण..." : "Any specific corrections or instructions..."}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? "Submitting..."
                      : currentLang === "hi"
                      ? "अनुरोध सबमिट करें"
                      : "Submit Service Request"}
                  </span>
                </button>

                <div className="pt-2 text-center">
                  <a
                    href={whatsappInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{currentLang === "hi" ? "व्हाट्सएप पर तुरंत पूछें" : "Need immediate help? Ask on WhatsApp"}</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalServiceDetailPage;
