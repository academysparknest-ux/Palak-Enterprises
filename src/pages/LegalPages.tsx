import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Phone,
  MessageSquare,
  MapPin,
  RotateCcw,
  FileCheck,
  CreditCard,
  ExternalLink,
  Layers,
  Headphones,
  Info,
} from "lucide-react";
import {
  business,
  businessConfig,
  getCallLink,
  getWhatsAppLink,
  getDirectionsLink,
} from "../config/business";
import { SEO } from "../components/SEO";
import { useLanguage } from "../context/LanguageContext";

export const PrivacyPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6">
      <SEO
        title={{
          en: "Privacy & Data Security Policy | Palak Enterprises",
          hi: "गोपनीयता एवं डेटा सुरक्षा नीति | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Privacy and data protection policy at Palak Enterprises Chakia. We safeguard personal documents, identity proofs, and printing artwork.",
          hi: "पालक इंटरप्राइजेज चकिया की गोपनीयता नीति। हम आपके व्यक्तिगत दस्तावेजों, प्रमाण पत्रों एवं प्रिंटिंग डिजाइन की पूर्ण सुरक्षा करते हैं।",
        }}
      />
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B70] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{currentLang === "hi" ? "मुख्य पृष्ठ पर वापस जाएँ" : "Back to Home"}</span>
        </Link>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">
            {currentLang === "hi" ? "पालक इंटरप्राइजेज नीतियां" : "Palak Enterprises Policies"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {currentLang === "hi" ? "गोपनीयता एवं डेटा सुरक्षा नीति" : "Privacy & Data Security Policy"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentLang === "hi" ? "अंतिम अपडेट: अगस्त 2026" : "Last updated: August 2026"}
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          <p>
            At <strong>Palak Enterprises</strong> (CSC Center ID: {business.registrations.cscId}), protecting your personal identity documents, certificates, and printing artwork is our highest priority.
          </p>

          <h3 className="font-bold text-slate-900 text-base">1. Information We Collect</h3>
          <p>
            We collect personal details (such as Name, Mobile number, Address, and uploaded files/certificates) strictly for fulfilling your printing orders, submitting government RTPS/PAN applications, or delivering completed jobs.
          </p>

          <h3 className="font-bold text-slate-900 text-base">2. Handling of Government ID Documents</h3>
          <p>
            Customer documents (such as Aadhaar, Marksheets, Ration Cards) are processed through secure channels. We do not sell, distribute, or publicly expose your private files or biometric data to any unauthorized third parties.
          </p>

          <h3 className="font-bold text-slate-900 text-base">3. Data Retention & Erasure</h3>
          <p>
            You may request complete removal of your uploaded design files from our printing servers at any time by contacting our Chakia store.
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6">
      <SEO
        title={{
          en: "Terms of Service & Usage | Palak Enterprises",
          hi: "नियम एवं शर्तें | पालक इंटरप्राइजेज",
        }}
        description={{
          en: "Terms of Service and usage conditions for printing orders, CSC services, and digital applications at Palak Enterprises Chakia.",
          hi: "पालक इंटरप्राइजेज चकिया में प्रिंटिंग ऑर्डर, सीएससी सेवा और ऑनलाइन आवेदन से जुड़े नियम व शर्तें।",
        }}
      />
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B70] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{currentLang === "hi" ? "मुख्य पृष्ठ पर वापस जाएँ" : "Back to Home"}</span>
        </Link>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">
            {currentLang === "hi" ? "पालक इंटरप्राइजेज नीतियां" : "Palak Enterprises Policies"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {currentLang === "hi" ? "नियम एवं उपयोग की शर्तें" : "Terms of Service & Usage"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentLang === "hi" ? "अंतिम अपडेट: अगस्त 2026" : "Last updated: August 2026"}
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          <h3 className="font-bold text-slate-900 text-base">1. Order Confirmation & Proof Approval</h3>
          <p>
            For customized printing (such as Visiting Cards, Wedding Cards, Flex Banners), our graphic designer shares a digital proof. Once approved by the customer, production begins. Customers are responsible for verifying spellings, phone numbers, and dates on proofs.
          </p>

          <h3 className="font-bold text-slate-900 text-base">2. Digital & Online Applications</h3>
          <p>
            Palak Enterprises functions as an assisted Common Service Center (CSC). We assist citizens in filling forms accurately. Approval or rejection of government benefits is governed solely by statutory government departments.
          </p>
        </div>
      </div>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const isHindi = currentLang === "hi";

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-10 sm:py-14 px-4 sm:px-6">
      <SEO
        title={{
          en: "Refund & Cancellation Policy | Palak Enterprises Chakia",
          hi: "रिफंड एवं ऑर्डर रद्द नीति | पालक इंटरप्राइजेज चकिया",
        }}
        description={{
          en: "Official Refund & Cancellation Policy of Palak Enterprises (Palak Printing Press) Chakia. Learn about pre-production cancellations via support, refund eligibility, non-refundable cases, and timelines.",
          hi: "पालक इंटरप्राइजेज (पालक प्रिंटिंग प्रेस) चकिया की रिफंड व रद्दीकरण नीति। कस्टमर सपोर्ट द्वारा रद्दीकरण, रिफंड पात्रता, गैर-वापसी योग्य शर्तें व समय-सीमा जानें।",
        }}
      />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header & Overview Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123B70] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isHindi ? "मुख्य पृष्ठ पर वापस जाएँ" : "Back to Home"}</span>
          </Link>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-[#123B70] border border-blue-100 mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#123B70]" />
              <span>{isHindi ? "पालक इंटरप्राइजेज आधिकारिक नीति" : "Palak Enterprises Policies"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              {isHindi ? "रिफंड एवं ऑर्डर रद्दीकरण नीति" : "Refund & Cancellation Policy"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isHindi
                ? "पालक इंटरप्राइजेज / पालक प्रिंटिंग प्रेस — अंतिम अपडेट: अगस्त 2026"
                : "Palak Enterprises / Palak Printing Press — Last updated: August 2026"}
            </p>
          </div>

          {/* Important System Notice: Cancellation Handled via Support */}
          <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed flex items-start gap-3">
            <Info className="h-5 w-5 text-[#123B70] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#123B70] block mb-0.5">
                {isHindi
                  ? "महत्वपूर्ण सूचना: ऑर्डर रद्दीकरण ग्राहक सहायता (Customer Support) द्वारा प्रबंधित होता है"
                  : "Important Notice: Order Cancellations Are Handled via Customer Support"}
              </span>
              <p>
                {isHindi
                  ? "वेबसाइट पर कोई डायरेक्ट 'Cancel Order' बटन नहीं है। यदि आप अपने ऑर्डर को रद्द करना चाहते हैं, तो कृपया उत्पादन शुरू होने से पहले हमारी सपोर्ट टीम (व्हाट्सएप या फोन) से तुरंत संपर्क करें।"
                  : "Orders cannot be cancelled directly from the website dashboard. Customers who wish to cancel an order must contact Palak Enterprises customer support via WhatsApp or phone as soon as possible before production begins."}
              </p>
            </div>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isHindi ? "उत्पादन पूर्व रद्दीकरण" : "Pre-Production Cancel"}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isHindi ? "सपोर्ट से संपर्क कर उत्पादन से पहले रद्द करें" : "Contact support before artwork approval & machine press"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-[#123B70] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isHindi ? "दोष पर मुफ्त रीप्रिंट / रिफंड" : "Quality Defect Guarantee"}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isHindi ? "शॉप की त्रुटि पर निःशुल्क रीप्रिंट या पूरा रिफंड" : "Free reprint or full refund for shop-side printing defects"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isHindi ? "24–48 घंटे में समीक्षा" : "24–48h Fast Review"}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isHindi ? "सत्यापन उपरांत त्वरित समाधान" : "Fast verification & support turnaround"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Order Cancellation Policy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-[#123B70]">
              <Headphones className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#123B70]">
                {isHindi ? "रद्दीकरण नीति" : "Cancellation Policy"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "उत्पादन पूर्व ऑर्डर रद्दीकरण (Order Cancellation Before Production)" : "Order Cancellation Before Production"}
              </h2>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              {isHindi
                ? "जो ग्राहक अपना ऑर्डर रद्द करना चाहते हैं, उन्हें जल्द से जल्द पालक इंटरप्राइजेज सपोर्ट से संपर्क करना होगा।"
                : "Customers who wish to cancel an order must contact Palak Enterprises support as soon as possible."}
            </p>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                {isHindi ? "रद्दीकरण पर विचार किया जा सकता है यदि:" : "Cancellation may be considered if:"}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  {isHindi
                    ? "आर्टवर्क / डिज़ाइन फ़ाइल अभी तक स्वीकृत (Approved) नहीं हुई है, और"
                    : "The artwork/file has not yet been approved, and"}
                </li>
                <li>
                  {isHindi
                    ? "प्रिंटिंग या उत्पादन शुरू नहीं हुआ है।"
                    : "Printing/production has not started."}
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
              {isHindi
                ? "एक बार कस्टमाइज्ड प्रिंटिंग या उत्पादन शुरू हो जाने के बाद, रद्दीकरण संभव नहीं हो सकता क्योंकि पेपर, स्याही, प्लेट, सेटअप और मशीन समय जैसी लागतें पहले ही लग चुकी होती हैं।"
                : "Once custom printing or production has started, cancellation may no longer be possible because costs such as paper, ink, plates, setup, and machine time may already have been incurred."}
            </div>

            <p className="text-xs text-slate-500 italic">
              {isHindi
                ? "* सभी रद्दीकरण अनुरोध वर्तमान ऑर्डर और उत्पादन स्थिति के सत्यापन के अधीन हैं।"
                : "* Cancellation requests are subject to verification of the current order and production status."}
            </p>
          </div>
        </div>

        {/* Section: Refund Eligibility */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                {isHindi ? "रिफंड पात्रता" : "Refund Eligibility"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "रिफंड पात्रता की श्रेणियां (Refund Eligibility Categories)" : "Refund Eligibility Categories"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Category 1: Eligible Cancellation */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isHindi ? "पात्र रद्दीकरण (Eligible Cancellation)" : "1. Eligible Cancellation"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 pl-7 leading-relaxed">
                {isHindi
                  ? "यदि ग्राहक उत्पादन शुरू होने से पहले सपोर्ट से संपर्क करता है और ऑर्डर रद्दीकरण के लिए पात्र पाया जाता है, तो सत्यापन के बाद लागू राशि रिफंड कर दी जाएगी।"
                  : "If the customer contacts support before production begins and the order is eligible for cancellation, the applicable amount may be refunded after verification."}
              </p>
            </div>

            {/* Category 2: Printing / Production Defects */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isHindi ? "प्रिंटिंग / उत्पादन में वास्तविक दोष (Printing / Production Defects)" : "2. Printing / Production Defects"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 pl-7 leading-relaxed">
                {isHindi
                  ? "यदि भौतिक प्रिंट में हमारी शॉप के कारण वास्तविक दोष हैं — जैसे गंभीर कटिंग मिसअलाइनमेंट, बड़ा स्याही धब्बा (major ink smudging), गलत प्रिंटिंग, या अन्य महत्वपूर्ण उत्पादन दोष — तो ग्राहक निम्नलिखित प्राप्त कर सकते हैं:"
                  : "If physical prints contain genuine defects caused by the shop, such as severe cutting misalignment, major ink smudging, incorrect printing, or other significant production defects, the customer may receive:"}
              </p>
              <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-lg border border-emerald-200 bg-white p-2.5 flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? "निःशुल्क रीप्रिंट (A Free Reprint)" : "A Free Reprint"}</span>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-white p-2.5 flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{isHindi ? "पूर्ण रिफंड (A Full Refund परिस्थिति अनुसार)" : "A Full Refund, depending on the circumstances"}</span>
                </div>
              </div>
            </div>

            {/* Category 3: Failed / Duplicate Online Payments */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isHindi ? "असफल या दोहरा ऑनलाइन भुगतान (Failed / Duplicate Online Payments)" : "3. Failed / Duplicate Online Payments"}
                </h3>
              </div>
              <ul className="list-disc pl-7 text-xs sm:text-sm text-slate-600 space-y-1.5">
                <li>
                  {isHindi
                    ? "यदि बैंक/UPI खाते से राशि कट गई लेकिन ऑर्डर असफल या रद्द हो गया, तो भुगतान की समीक्षा कर रिवर्सल/रिफंड किया जाएगा।"
                    : "If payment was deducted but the order failed or was cancelled, the payment will be reviewed for reversal/refund."}
                </li>
                <li>
                  {isHindi
                    ? "यदि एक ही ऑर्डर के लिए दो बार शुल्क कट गया है, तो सत्यापन के बाद दोहरा भुगतान रिफंड कर दिया जाएगा।"
                    : "If the same order was charged twice, the duplicate payment will be refunded after verification."}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Non-Refundable Cases */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-amber-200/80 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                {isHindi ? "गैर-वापसी योग्य मामले" : "Non-Refundable Cases"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "गैर-वापसी योग्य मामले (Important Non-Refundable Cases)" : "Important Non-Refundable Cases"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Case 1: Customer-Approved Artwork */}
            <div className="rounded-xl border border-amber-200 bg-white p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "ग्राहक द्वारा स्वीकृत आर्टवर्क (Customer-Approved Artwork)" : "Customer-Approved Artwork"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isHindi
                  ? "एक बार ग्राहक द्वारा उत्पादन के लिए आर्टवर्क/फ़ाइल सामग्री को स्वीकृत कर दिए जाने के बाद, ग्राहक द्वारा स्वीकृत वर्तनी (spelling) त्रुटियों, नामों, मोबाइल नंबर, तस्वीरों, टेक्स्ट गलतियों या डिज़ाइन पसंद के लिए रिफंड या निःशुल्क रीप्रिंट लागू नहीं होता है।"
                  : "Once the customer has approved artwork/file content for production, spelling mistakes, names, photographs, text errors, or design choices approved by the customer are generally not eligible for a refund or free reprint."}
              </p>
            </div>

            {/* Case 2: Government / Portal Services */}
            <div className="rounded-xl border border-amber-200 bg-white p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "सरकारी पोर्टल एवं सीएससी सेवाएँ (Government / Portal Services)" : "Government / Portal Services"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isHindi
                  ? "सरकारी पोर्टल शुल्क, RTPS शुल्क, परीक्षा/आवेदन शुल्क या अन्य आधिकारिक शुल्क जो संबंधित सरकारी विभाग को पहले ही जमा या भुगतान किए जा चुके हैं, वे पूर्णतः गैर-वापसी योग्य होते हैं।"
                  : "Government portal fees, RTPS fees, application fees, or other official charges that have already been submitted or paid to the relevant government department are generally non-refundable."}
              </p>
            </div>
          </div>
        </div>

        {/* Section: How to Request Cancellation or Refund (Simple 4 Steps) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-[#123B70]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#123B70]">
                {isHindi ? "सरल प्रक्रिया" : "Step-by-Step Process"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "रद्दीकरण या रिफंड का अनुरोध कैसे करें?" : "How to Request Cancellation or Refund"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Step 1 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block rounded-md bg-[#123B70] px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {isHindi ? "1. सपोर्ट से संपर्क" : "1. Contact Support"}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "सपोर्ट से संपर्क करें" : "Contact Support"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isHindi
                    ? "व्हाट्सएप या फोन के माध्यम से जल्द से जल्द हमारी सपोर्ट टीम से संपर्क करें।"
                    : "Contact the team through WhatsApp or phone as soon as possible."}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block rounded-md bg-[#123B70] px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {isHindi ? "2. विवरण प्रदान करें" : "2. Provide Details"}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "ऑर्डर विवरण दें" : "Provide Order Details"}
                </h3>
                <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                  <li>{isHindi ? "ऑर्डर आईडी (Order ID)" : "Order ID"}</li>
                  <li>{isHindi ? "ऑर्डर में इस्तेमाल मोबाइल नंबर" : "Mobile number used for the order"}</li>
                  <li>{isHindi ? "पेमेंट / ट्रांजैक्शन संदर्भ" : "Payment / transaction reference"}</li>
                  <li>{isHindi ? "दोष की फोटो / वीडियो (यदि लागू)" : "Photos/videos of defects (if printing issue)"}</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block rounded-md bg-[#123B70] px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {isHindi ? "3. सत्यापन" : "3. Verification"}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "सत्यापन एवं समीक्षा" : "Verification"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isHindi
                    ? "टीम ऑर्डर स्थिति, उत्पादन चरण, भुगतान स्थिति और रिपोर्ट किए गए दोष की जांच करती है।"
                    : "The team checks the order status, production status, payment status, and reported issue."}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {isHindi ? "4. समाधान" : "4. Resolution"}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "उचित समाधान" : "Resolution"}
                </h3>
                <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                  <li>{isHindi ? "ऑर्डर रद्दीकरण एवं पात्र रिफंड" : "Order cancellation & eligible refund"}</li>
                  <li>{isHindi ? "निःशुल्क रीप्रिंट (Free reprint)" : "Free reprint"}</li>
                  <li>{isHindi ? "पूर्ण रिफंड (Full refund)" : "Full refund"}</li>
                  <li>{isHindi ? "पेमेंट रिवर्सल (Payment reversal)" : "Payment reversal"}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Refund Timelines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                {isHindi ? "समय-सीमा" : "Timelines"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "रिफंड एवं समीक्षा समय-सीमा (Refund Timelines)" : "Refund Timelines"}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#123B70]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "रिफंड / गुणवत्ता समीक्षा" : "Refund / Quality Review"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isHindi
                  ? "रद्दीकरण एवं गुणवत्ता से जुड़े अनुरोधों की समीक्षा आम तौर पर 24–48 घंटे के भीतर की जाती है।"
                  : "Cancellation and quality-related requests are generally reviewed within 24–48 hours."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#123B70]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isHindi ? "ऑनलाइन भुगतान रिवर्सल" : "Online Payment Reversals"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isHindi
                  ? "UPI/पेमेंट गेटवे रिवर्सल आम तौर पर 24–48 घंटे में इनिशिएट होते हैं, और ग्राहक के बैंक अनुसार खाते में जमा होने में 3–5 कार्यदिवस लग सकते हैं।"
                  : "UPI/payment gateway reversals are typically credited within 24–48 hours, but the actual credit time may vary depending on the customer's bank or payment provider and may take 3–5 business days."}
              </p>
            </div>
          </div>
        </div>

        {/* Section: General Conditions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isHindi ? "सामान्य नियम" : "General Terms"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {isHindi ? "सामान्य शर्तें (General Conditions)" : "General Conditions"}
              </h2>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>
                {isHindi
                  ? "रिफंड केवल ऑर्डर, भुगतान और रिपोर्ट किए गए मुद्दे के सत्यापन के बाद ही प्रोसेस किए जाते हैं।"
                  : "Refunds are processed only after verification of the order, payment, and/or reported issue."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>
                {isHindi
                  ? "रिफंड पात्रता उत्पादन के चरण और अनुरोध के कारण पर निर्भर करती है।"
                  : "Refund eligibility depends on the stage of production and the reason for the request."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>
                {isHindi
                  ? "कस्टम उत्पाद जो उत्पादन में जा चुके हैं, वे रद्दीकरण के पात्र नहीं हो सकते हैं।"
                  : "Custom products that have already entered production may not be eligible for cancellation."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>
                {isHindi
                  ? "ग्राहक द्वारा स्वीकृत आर्टवर्क/सामग्री त्रुटियां रिफंड या निःशुल्क रीप्रिंट के लिए पात्र नहीं हैं।"
                  : "Customer-approved artwork/content errors are generally not eligible for refunds or free reprints."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>
                {isHindi
                  ? "रिफंड स्वीकृत करने से पहले प्रतिष्ठान सहायक दस्तावेज, फोटो, वीडियो या लेन-देन विवरण मांग सकता है।"
                  : "The business may request supporting documents, photographs, videos, or transaction details before approving a refund."}
              </span>
            </li>
          </ul>
        </div>

        {/* Section: Contact Support for Cancellation & Refund Assistance */}
        <div className="rounded-2xl border border-[#123B70]/20 bg-gradient-to-br from-[#123B70] to-[#0A254A] p-6 sm:p-8 text-white shadow-lg space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              {isHindi ? "सपोर्ट एवं संपर्क केंद्र" : "Support & Help Center"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {isHindi ? "रद्दीकरण एवं रिफंड सहायता के लिए संपर्क करें" : "Contact Support for Cancellation & Refunds"}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              {isHindi
                ? "ऑर्डर रद्दीकरण या रिफंड अनुरोध के लिए कृपया हमारे सपोर्ट चैनलों पर संपर्क करें:"
                : "For order cancellation requests or refund assistance, please connect with our support team directly:"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* WhatsApp CTA */}
            <a
              href={getWhatsAppLink(
                "Hello Palak Enterprises, I would like to request order cancellation / refund assistance."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-4 font-semibold text-xs sm:text-sm transition-colors shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-white shrink-0" />
                <div>
                  <div className="font-bold">
                    {isHindi ? "व्हाट्सएप सपोर्ट" : "WhatsApp Support"}
                  </div>
                  <div className="text-[11px] text-emerald-100 font-normal">
                    {businessConfig.phoneNumbers.displayPrimary}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-emerald-200 group-hover:text-white transition-colors" />
            </a>

            {/* Call CTA */}
            <a
              href={getCallLink(businessConfig.phoneNumbers.primary)}
              className="flex items-center justify-between rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white p-4 font-semibold text-xs sm:text-sm transition-colors shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-300 shrink-0" />
                <div>
                  <div className="font-bold">
                    {isHindi ? "सीधे कॉल करें" : "Call Support"}
                  </div>
                  <div className="text-[11px] text-blue-200 font-normal">
                    {businessConfig.phoneNumbers.displayPrimary} / {businessConfig.phoneNumbers.displaySecondary}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-blue-200 group-hover:text-white transition-colors" />
            </a>
          </div>

          {/* In-Person Store Details */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-blue-100 space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {isHindi ? "स्टोर पर व्यक्तिगत संपर्क (In-Person Visit):" : "In-Person Visit (Chakia Center):"}
                </span>
                <p className="mt-0.5 text-blue-100/90 leading-relaxed">
                  {businessConfig.address.fullAddress[currentLang]}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-blue-200">
                  <span>⏰ {businessConfig.openingHours[currentLang]}</span>
                  <a
                    href={getDirectionsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 underline"
                  >
                    <span>{isHindi ? "गूगल मैप पर देखें" : "View on Google Maps"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
