import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Palette, Send, CheckCircle2, AlertCircle, ArrowRight, MessageSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { FileUploadZone } from "../components/FileUploadZone";
import { getWhatsAppLink } from "../config/business";

export const DesignServicesPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [designCategory, setDesignCategory] = useState("visiting_card");
  const [titleOrEvent, setTitleOrEvent] = useState("");
  const [contentText, setContentText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const designCategories = [
    { key: "visiting_card", labelEn: "Visiting Card Design", labelHi: "विजिटिंग कार्ड डिज़ाइन" },
    { key: "wedding_card", labelEn: "Wedding / Tilak Card", labelHi: "शादी / तिलक कार्ड" },
    { key: "banner", labelEn: "Flex Banner / Hoarding", labelHi: "फ्लेक्स बैनर / होर्डिंग" },
    { key: "pamphlet", labelEn: "Pamphlet / Handbill", labelHi: "प्रचार पम्पलेट" },
    { key: "logo", labelEn: "Shop / Firm Logo", labelHi: "दुकान या फर्म का लोगो" },
    { key: "biodata", labelEn: "Marriage Biodata / Resume", labelHi: "मैरिज बायोडेटा" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titleOrEvent.trim()) {
      setError(currentLang === "hi" ? "कृपया प्रोजेक्ट या इवेंट का नाम लिखें" : "Please enter project / event title");
      return;
    }
    if (!contentText.trim()) {
      setError(currentLang === "hi" ? "कृपया डिज़ाइन का टेक्स्ट या मैटर लिखें" : "Please provide text content or instructions");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setError(currentLang === "hi" ? "कृपया अपना नाम और 10 अंकों का मोबाइल नंबर दर्ज करें" : "Please enter your name and valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await PalakDataStore.createDesignRequest({
        designCategory,
        titleOrEvent: titleOrEvent.trim(),
        contentText: contentText.trim(),
        referenceFileUrls: uploadedFile ? [uploadedFile.url] : [],
        referenceFileNames: uploadedFile ? [uploadedFile.name] : [],
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });

      setSubmittedCode(result.designCode);
    } catch (err: any) {
      setError(err.message || "Failed to submit design request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-12 px-4 sm:px-6">
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
        <div className="relative mx-auto max-w-7xl space-y-3">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Design Studio</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1 text-xs font-bold">
            <Palette className="h-4 w-4" />
            <span>Creative Graphic Studio</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "कस्टम ग्राफिक डिज़ाइन सेवा" : "Palak Graphic Design Studio"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "विजिटिंग कार्ड, शादी कार्ड, बैनर, पम्पलेट और लोगो के लिए हमारे पेशेवर ग्राफिक डिज़ाइनरों से आकर्षक डिज़ाइन बनवाएं।"
              : "No design ready? Share your text, rough sketch, or idea, and our skilled designers will prepare print-ready digital proofs for your review."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-6">
        {submittedCode ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center space-y-4 shadow-card animate-fadeUp">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              {currentLang === "hi" ? "डिज़ाइन अनुरोध दर्ज हुआ!" : "Design Job Created!"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {currentLang === "hi"
                ? "हमारी ग्राफिक टीम आपका डिज़ाइन तैयार कर व्हाट्सएप पर प्रूफ़ भेजेगी।"
                : "Our creative team will prepare your layout and share digital proofs on WhatsApp for your approval before printing."}
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 max-w-xs mx-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Design Ticket Code
              </span>
              <span className="text-xl font-black text-[#123B70] tracking-wider block mt-0.5">
                {submittedCode}
              </span>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={`/track-order?code=${submittedCode}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c]"
              >
                <span>{currentLang === "hi" ? "स्थिति ट्रैक करें" : "Track Design Progress"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <a
                href={getWhatsAppLink(`Hello Palak Designer, I submitted ticket *${submittedCode}*.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-xs font-bold text-emerald-800"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Talk to Designer</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {currentLang === "hi" ? "डिज़ाइन विवरण एवं निर्देश" : "Design Requirements"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLang === "hi"
                  ? "अपना मैटर और संपर्क विवरण भरें, हम प्रूफ़ तैयार करेंगे।"
                  : "Tell us what you want designed, provide text, and attach any rough sketches or logos."}
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  {currentLang === "hi" ? "डिज़ाइन श्रेणी चुनें *" : "Select Design Category *"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {designCategories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setDesignCategory(cat.key)}
                      className={`p-2.5 rounded-xl border text-xs text-left font-semibold cursor-pointer ${
                        designCategory === cat.key
                          ? "border-[#123B70] bg-blue-50/60 text-[#123B70] ring-1 ring-[#123B70] font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      {cat.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "दुकान/फर्म/इवेंट का नाम *" : "Business / Event / Person Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={titleOrEvent}
                  onChange={(e) => setTitleOrEvent(e.target.value)}
                  placeholder="e.g. Maa Durga Traders or Rahul & Sneha Wedding"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "डिज़ाइन में लिखा जाने वाला पूरा मैटर (Text Content) *" : "Text Matter to Print *"}
                </label>
                <textarea
                  required
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder={
                    currentLang === "hi"
                      ? "नाम, पद, पता, मोबाइल नंबर, सेवाओं की सूची, स्लोगन या अन्य कोई मैटर यहाँ लिखें..."
                      : "Type all phone numbers, address, services, slogans, dates, or specific text to include..."
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden leading-relaxed"
                />
              </div>

              <FileUploadZone
                selectedFile={uploadedFile}
                onFileSelect={setUploadedFile}
                label={currentLang === "hi" ? "लोगो / रफ़ स्केच / पुराना कार्ड अपलोड करें (वैकल्पिक)" : "Attach Existing Card, Logo or Rough Hand-Drawn Sketch (Optional)"}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "आपका नाम *" : "Your Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Vikas Sharma"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "व्हाट्सएप मोबाइल नंबर *" : "WhatsApp Mobile Number *"}
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
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "Submitting..." : currentLang === "hi" ? "डिज़ाइन अनुरोध सबमिट करें" : "Submit Design Request"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DesignServicesPage;
