import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Send, CheckCircle2, AlertCircle, ArrowRight, MessageSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore } from "../lib/storage/store";
import { FileUploadZone } from "../components/FileUploadZone";
import { getWhatsAppLink } from "../config/business";
import { SEO } from "../components/SEO";

export const RequestQuotePage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [serviceOrProductType, setServiceOrProductType] = useState("Bulk Visiting Cards");
  const [quantity, setQuantity] = useState("1000");
  const [sizeSpecifications, setSizeSpecifications] = useState("");
  const [materialPreferences, setMaterialPreferences] = useState("");
  const [requiredByDate, setRequiredByDate] = useState("");
  const [designStatus, setDesignStatus] = useState<"have_design" | "need_design" | "rough_idea">("have_design");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuoteCode, setSubmittedQuoteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quoteTypes = [
    "Bulk Visiting Cards",
    "Flex Banners & Hoardings",
    "Promotional Pamphlets (10,000+)",
    "GST Bill Books / Invoices",
    "School ID Cards & Badges",
    "Wedding Invitation Cards",
    "Custom Vinyl Stickers / Labels",
    "Custom Website Development",
    "Other Custom Printing",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!quantity.trim()) {
      setError(currentLang === "hi" ? "कृपया मात्रा दर्ज करें" : "Please specify quantity");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setError(currentLang === "hi" ? "कृपया अपना नाम और 10 अंकों का वैध मोबाइल नंबर दर्ज करें" : "Please enter your name and valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await PalakDataStore.createQuoteRequest({
        serviceOrProductType,
        quantity: quantity.trim(),
        sizeSpecifications: sizeSpecifications.trim() || undefined,
        materialPreferences: materialPreferences.trim() || undefined,
        requiredByDate: requiredByDate || undefined,
        designStatus,
        referenceFileUrls: uploadedFile ? [uploadedFile.url] : [],
        referenceFileNames: uploadedFile ? [uploadedFile.name] : [],
        additionalDetails: additionalDetails.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        businessName: businessName.trim() || undefined,
      });

      setSubmittedQuoteCode(result.quoteCode);
    } catch (err: any) {
      setError(err.message || "Failed to submit quote request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <SEO
        title="Request a Custom Printing Quote | Palak Enterprises Chakia"
        description="Get bulk wholesale quotes for printing, visiting cards, flex hoardings, brochures, school IDs, and bill books from Palak Enterprises in Chakia, Bihar."
        canonicalUrl="/request-quote"
        keywords="printing quote Chakia, bulk printing price Bihar, wholesale printing press Chakia, custom print estimate"
      />
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
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Request Quote</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1 text-xs font-bold">
            <Sparkles className="h-4 w-4" />
            <span>Fast Wholesale & Custom Estimate</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "कस्टम कोटेशन अनुरोध" : "Request a Custom Printing Quote"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "थोक ऑर्डर, विशेष आकार, गैर-मानक पेपर या विशिष्ट पैकेजिंग के लिए अपनी आवश्यकताएं भेजें। हम आपको सर्वोत्तम दर प्रदान करेंगे।"
              : "Get instant tailored wholesale pricing for bulk volume runs, custom sizing, institutional printing kits, or bespoke projects."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-6">
        {submittedQuoteCode ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center space-y-4 shadow-card animate-fadeUp">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              {currentLang === "hi" ? "कोटेशन अनुरोध दर्ज हुआ!" : "Quote Request Received!"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {currentLang === "hi"
                ? "हमारी एस्टीमेटर टीम आपकी आवश्यकताओं की समीक्षा कर सर्वोत्तम दर के साथ संपर्क करेगी।"
                : "Our estimating team will evaluate your specifications and send you the best wholesale rate via WhatsApp/Email."}
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 max-w-xs mx-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Quote Reference ID
              </span>
              <span className="text-xl font-black text-[#123B70] tracking-wider block mt-0.5">
                {submittedQuoteCode}
              </span>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={`/track-order?code=${submittedQuoteCode}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c]"
              >
                <span>{currentLang === "hi" ? "कोटेशन स्थिति देखें" : "Track Quote Status"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <a
                href={getWhatsAppLink(`Hello Palak, I requested quote *${submittedQuoteCode}* for *${serviceOrProductType}*.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-xs font-bold text-emerald-800"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Talk to Estimator</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {currentLang === "hi" ? "प्रोजेक्ट का विवरण दर्ज करें" : "Project Specifications"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLang === "hi"
                  ? "अपनी आवश्यकताओं का ब्यौरा दें, हम 2-4 घंटे में कोटेशन भेजेंगे।"
                  : "Tell us what you need printed, expected quantities, and deadlines."}
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "उत्पाद / सेवा का प्रकार *" : "Product / Service Type *"}
                  </label>
                  <select
                    value={serviceOrProductType}
                    onChange={(e) => setServiceOrProductType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  >
                    {quoteTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "अनुमानित मात्रा (संख्या) *" : "Estimated Quantity *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 5,000 Pcs or 10 Bill Books"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "साइज़ या आयाम (यदि कोई हो)" : "Size / Dimensions (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={sizeSpecifications}
                    onChange={(e) => setSizeSpecifications(e.target.value)}
                    placeholder="e.g. 8x4 feet or 1/4 Demmy A4"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "कागज या सामग्री पसंद" : "Paper / Material Preference"}
                  </label>
                  <input
                    type="text"
                    value={materialPreferences}
                    onChange={(e) => setMaterialPreferences(e.target.value)}
                    placeholder="e.g. 350 GSM Matte or Star Flex"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Required By Date (Optional)
                </label>
                <input
                  type="date"
                  value={requiredByDate}
                  onChange={(e) => setRequiredByDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {currentLang === "hi" ? "डिज़ाइन की स्थिति" : "Artwork / Design Readiness"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "have_design", label: "I have design file" },
                    { key: "need_design", label: "Need Palak design" },
                    { key: "rough_idea", label: "Have rough idea" },
                  ].map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setDesignStatus(st.key as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        designStatus === st.key
                          ? "border-[#123B70] bg-blue-50/60 text-[#123B70] font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <FileUploadZone
                selectedFile={uploadedFile}
                onFileSelect={setUploadedFile}
                label={currentLang === "hi" ? "रेफरेंस फ़ाइल या डिज़ाइन अटैच करें" : "Attach Sample, Reference or Existing File"}
              />

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "अतिरिक्त विवरण या विशेष निर्देश" : "Additional Project Notes"}
                </label>
                <textarea
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Describe any special finishes, binding, or urgent deadline requirements..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              {/* Customer Info */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "आपका नाम *" : "Your Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
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

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "कंपनी / दुकान का नाम (वैकल्पिक)" : "Company / Shop Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sharma Traders"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentLang === "hi" ? "ईमेल पता (वैकल्पिक)" : "Email (Optional)"}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="anand@example.com"
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
              <span>{isSubmitting ? "Generating Quote Request..." : currentLang === "hi" ? "कोटेशन अनुरोध सबमिट करें" : "Request Custom Quote"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RequestQuotePage;
