import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Calculator,
  File as FileIcon,
  Plus,
  Minus,
  ShieldCheck,
  Trash2,
  Sparkles,
  Layers,
  FileText,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  DEFAULT_PRINT_PRICING,
  calculateDocumentPrintPrice,
  type DocumentPrintOrderOptions,
  type PrintPricingConfig,
} from "../../config/printPricing";
import {
  getPrintPricingConfig,
  submitPrintOrder,
  uploadOrderFile,
} from "../../lib/supabase/database";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { cn } from "../../lib/utils";

const DOCUMENT_TYPES = [
  { id: "notes", labelEn: "Notes", labelHi: "नोट्स (Notes)", icon: "📚" },
  { id: "assignment", labelEn: "Assignment", labelHi: "असाइनमेंट (Assignment)", icon: "📝" },
  { id: "study_material", labelEn: "Study Material", labelHi: "स्टडी मटेरियल (Study Material)", icon: "📖" },
  { id: "general_doc", labelEn: "General Document", labelHi: "सामान्य दस्तावेज (General Document)", icon: "📄" },
  { id: "form", labelEn: "Form", labelHi: "फॉर्म (Form)", icon: "📑" },
  { id: "certificate", labelEn: "Certificate", labelHi: "प्रमाणपत्र (Certificate)", icon: "📜" },
  { id: "bill_invoice", labelEn: "Bill / Invoice", labelHi: "बिल / इनवॉइस (Bill / Invoice)", icon: "🧾" },
  { id: "application", labelEn: "Application", labelHi: "आवेदन पत्र (Application)", icon: "📃" },
  { id: "report", labelEn: "Report", labelHi: "रिपोर्ट (Report)", icon: "📕" },
  { id: "project_report", labelEn: "Project Report", labelHi: "प्रोजेक्ट रिपोर्ट (Project Report)", icon: "📊" },
  { id: "question_paper", labelEn: "Question Paper", labelHi: "प्रश्न पत्र (Question Paper)", icon: "📋" },
  { id: "other", labelEn: "Other Document", labelHi: "अन्य दस्तावेज (Other Document)", icon: "🗂️" },
];

export interface UploadedDocument {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number;
  previewUrl?: string;
  isCounting?: boolean;
}

/**
 * Robust Client-Side Document Page Counter
 * Automatically parses PDF files using binary/latin1 inspection of /Type /Pages /Count and /Type /Page
 */
async function countDocumentPages(file: File): Promise<number> {
  const extension = "." + (file.name.split(".").pop() || "").toLowerCase();

  // 1. Image formats: 1 page
  if (file.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return 1;
  }

  // 2. PDF formats: parse page dictionary
  if (extension === ".pdf" || file.type === "application/pdf") {
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("latin1").decode(buffer);

      // Match /Type /Pages ... /Count N
      const countMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/gi)];
      if (countMatches.length > 0) {
        let maxCount = 0;
        for (const m of countMatches) {
          const c = parseInt(m[1], 10);
          if (!isNaN(c) && c > maxCount) maxCount = c;
        }
        if (maxCount > 0) return maxCount;
      }

      // Alternate order /Count N ... /Type /Pages
      const altCountMatches = [...text.matchAll(/\/Count\s+(\d+)[\s\S]*?\/Type\s*\/Pages/gi)];
      if (altCountMatches.length > 0) {
        let maxCount = 0;
        for (const m of altCountMatches) {
          const c = parseInt(m[1], 10);
          if (!isNaN(c) && c > maxCount) maxCount = c;
        }
        if (maxCount > 0) return maxCount;
      }

      // Match individual /Type /Page objects (excluding /Type /Pages)
      const pageMatches = text.match(/\/Type\s*\/Page\b(?!\s*s)/gi);
      if (pageMatches && pageMatches.length > 0) {
        return pageMatches.length;
      }
    } catch (err) {
      console.warn("Client-side PDF page counter warning:", err);
    }
  }

  return 1;
}

export const DocumentPrintingPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  // Step 1: Document Type
  const [selectedDocType, setSelectedDocType] = useState<string>("assignment");
  const [customDocTypeName, setCustomDocTypeName] = useState<string>("");

  // Step 2: Upload (Multiple Documents Support)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Printing Options
  const [paperSize, setPaperSize] = useState<"a4" | "a3" | "a5">("a4");
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [sides, setSides] = useState<"single" | "double">("single");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeType, setPageRangeType] = useState<"all" | "custom">("all");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  // Step 4: Finishing Options
  const [spiralBinding, setSpiralBinding] = useState<boolean>(false);
  const [combBinding, setCombBinding] = useState<boolean>(false);
  const [lamination, setLamination] = useState<boolean>(false);
  const [stapling, setStapling] = useState<boolean>(false);

  // Step 5: Customer Details & Auth
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState<string>(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || "");
  const [customerWhatsApp, setCustomerWhatsApp] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || "");
  const [instructions, setInstructions] = useState<string>("");

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || "");
      setCustomerPhone((prev) => prev || user.phone || "");
      setCustomerEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  // Step 6: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"pay_at_shop" | "pay_online">("pay_at_shop");

  // Submission & Success Modal State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    isOpen: boolean;
    orderCode: string;
    totalAmount: number;
    docType: string;
    specifications: Record<string, string>;
    finishingSelected: string[];
    paymentMethod: string;
    paymentStatus: string;
  } | null>(null);

  // Fetch Supabase pricing on load
  useEffect(() => {
    getPrintPricingConfig().then(setPricingConfig).catch(() => setPricingConfig(DEFAULT_PRINT_PRICING));
  }, []);

  // Sync totalPages automatically from uploaded documents
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const sum = uploadedFiles.reduce((acc, doc) => acc + (doc.pages || 1), 0);
      setTotalPages(sum > 0 ? sum : 1);
    }
  }, [uploadedFiles]);

  // Handle Multi-File Selection
  const handleFilesAdd = async (newFiles: FileList | File[] | null) => {
    setFileError(null);
    if (!newFiles || newFiles.length === 0) return;

    const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
    const validFiles: File[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const extension = "." + (file.name.split(".").pop() || "").toLowerCase();

      if (!allowedExtensions.includes(extension)) {
        setFileError(
          currentLang === "hi"
            ? `फ़ाइल "${file.name}" समर्थित नहीं है। केवल PDF, DOC, DOCX, JPG, PNG फ़ाइलें समर्थित हैं।`
            : `File "${file.name}" is not supported. Only PDF, DOC, DOCX, JPG, PNG files are allowed.`
        );
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        setFileError(
          currentLang === "hi"
            ? `फ़ाइल "${file.name}" 50MB से बड़ी है।`
            : `File "${file.name}" exceeds 50MB size limit.`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create preliminary document items
    const newDocs: UploadedDocument[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      pages: 1,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      isCounting: true,
    }));

    setUploadedFiles((prev) => [...prev, ...newDocs]);

    // Asynchronously count pages for each document
    for (const doc of newDocs) {
      try {
        const detected = await countDocumentPages(doc.file);
        setUploadedFiles((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, pages: Math.max(1, detected), isCounting: false } : d
          )
        );
      } catch (err) {
        setUploadedFiles((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, isCounting: false } : d))
        );
      }
    }
  };

  const handleUpdateDocPages = (id: string, newPages: number) => {
    const safe = Math.max(1, newPages);
    setUploadedFiles((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pages: safe } : d))
    );
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedFiles((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((d) => d.id !== id);
    });
  };

  const handleClearAllDocs = () => {
    uploadedFiles.forEach((doc) => {
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
    });
    setUploadedFiles([]);
    setFileError(null);
    setTotalPages(1);
  };

  // Live Price Calculation
  const printOptions: DocumentPrintOrderOptions = {
    docType: selectedDocType,
    customDocType: customDocTypeName,
    paperSize,
    colorMode,
    sides,
    orientation,
    copies,
    pageRangeType,
    customPageRange,
    totalPagesInDoc: totalPages,
    finishing: {
      spiralBinding,
      combBinding,
      lamination,
      stapling,
    },
  };

  const priceResult = calculateDocumentPrintPrice(printOptions, pricingConfig);

  const getDocTypeLabel = () => {
    const found = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);
    if (!found) return customDocTypeName || "Document";
    if (selectedDocType === "other" && customDocTypeName) return customDocTypeName;
    return currentLang === "hi" ? found.labelHi : found.labelEn;
  };

  // Form Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (uploadedFiles.length === 0) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया प्रिंट करने के लिए कम से कम एक दस्तावेज फ़ाइल अपलोड करें।"
          : "Please upload at least one document file before submitting."
      );
      return;
    }

    if (!customerName.trim()) {
      setSubmitError(
        currentLang === "hi" ? "कृपया अपना नाम दर्ज करें।" : "Please enter your name."
      );
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
      // 1. Prepare multiple file uploads
      const uploadPromises = uploadedFiles.map(async (doc) => {
        try {
          const res = await uploadOrderFile(doc.file, `DOC-${Date.now()}`);
          return {
            name: doc.name,
            size: doc.size,
            pages: doc.pages,
            url: res?.url || "",
            storagePath: res?.storagePath || "",
          };
        } catch (err) {
          console.warn("Upload file notice:", err);
          return {
            name: doc.name,
            size: doc.size,
            pages: doc.pages,
            url: "",
            storagePath: "",
          };
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);
      const primaryFile = uploadedResults[0] || {
        name: uploadedFiles[0]?.name || "Document",
        size: uploadedFiles[0]?.size || 0,
        url: "",
        storagePath: "",
      };

      const combinedFileName =
        uploadedFiles.length === 1
          ? uploadedFiles[0].name
          : `${uploadedFiles.length} Documents (${totalPages} pages total): ${uploadedFiles
              .map((d) => `${d.name} [${d.pages}p]`)
              .join(", ")}`;

      const totalSizeBytes = uploadedFiles.reduce((sum, d) => sum + d.size, 0);

      // 2. Finishing names for record
      const finishingList: string[] = [];
      if (spiralBinding) finishingList.push("Spiral Binding");
      if (combBinding) finishingList.push("Comb Binding");
      if (lamination) finishingList.push("Lamination");
      if (stapling) finishingList.push("Stapling");

      const specifications: Record<string, string> = {
        Paper: paperSize.toUpperCase(),
        Color: colorMode === "bw" ? "Black & White" : "Vibrant Color",
        Side: sides === "single" ? "Single Side" : "Double Side (Front & Back)",
        Orientation: orientation === "portrait" ? "Portrait" : "Landscape",
        "Documents Count": `${uploadedFiles.length} file(s)`,
        Pages: `${priceResult.pagesToPrint} pages (${pageRangeType === "all" ? "All" : customPageRange})`,
        Copies: `${copies}`,
      };

      // 3. Submit Print Order
      const res = await submitPrintOrder({
        serviceId: "document-printing",
        serviceName: "Document Printing",
        documentType: getDocTypeLabel(),
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerWhatsApp: customerWhatsApp.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        instructions: instructions.trim() || undefined,
        userId: user?.id,
        paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_store",
        paymentStatus: "pending",
        pricingSnapshot: {
          unitPrice: priceResult.unitPrice,
          subtotal: priceResult.subtotal,
          totalAmount: priceResult.total,
          breakdown: priceResult.breakdown,
        },
        options: {
          paperSize,
          colorMode,
          sides,
          orientation,
          copies,
          pageRangeType,
          customPageRange,
          pagesToPrint: priceResult.pagesToPrint,
        },
        optionsLabels: specifications,
        finishingOptions: {
          spiralBinding,
          combBinding,
          lamination,
          stapling,
        },
        file: {
          name: combinedFileName,
          size: totalSizeBytes,
          url: primaryFile.url,
          storagePath: primaryFile.storagePath,
          pageCount: priceResult.pagesToPrint,
          mimeType: uploadedFiles[0]?.file?.type || "application/pdf",
        },
      });

      if (res.success) {
        setSuccessData({
          isOpen: true,
          orderCode: res.orderCode,
          totalAmount: priceResult.total,
          docType: getDocTypeLabel(),
          specifications,
          finishingSelected: finishingList,
          paymentMethod,
          paymentStatus: "pending",
        });
      } else {
        setSubmitError(res.error || "Failed to submit order. Please try again.");
      }
    } catch (err: any) {
      console.error("Order submission exception:", err);
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
        <div className="relative mx-auto max-w-5xl space-y-2.5">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> /{" "}
            <Link to="/online-services" className="hover:underline">Instant Online Services</Link> /{" "}
            <span className="text-amber-300">Document Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              📄 {currentLang === "hi" ? "दस्तावेज प्रिंटिंग (Document Printing)" : "Document Printing"}
            </h1>
            <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-xs font-bold">
              ⚡ Instant Online Workflow
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट या दस्तावेज अपलोड करें, बाइंडिंग व लैमिनेशन चुनें, ऑनलाइन ऑर्डर सबमिट करें और तैयार होने पर दुकान से सीधे कलेक्ट करें।"
              : "Upload your PDF or document, customize paper & color, add spiral binding or lamination, and submit your order for quick pickup at our Chakia center."}
          </p>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: 5-Step Configurator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Document Type Selector */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "आप क्या प्रिंट करना चाहते हैं?" : "What do you want to print?"}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Document Type</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {DOCUMENT_TYPES.map((dt) => {
                  const isSelected = selectedDocType === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setSelectedDocType(dt.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-3 text-left transition-all text-xs font-bold cursor-pointer",
                        isSelected
                          ? "border-[#123B70] bg-blue-50/70 text-[#123B70] shadow-xs ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-base shrink-0">{dt.icon}</span>
                      <span className="truncate">{currentLang === "hi" ? dt.labelHi : dt.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDocType === "other" && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === "hi" ? "दस्तावेज का प्रकार दर्ज करें *" : "Specify Document Type *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customDocTypeName}
                    onChange={(e) => setCustomDocTypeName(e.target.value)}
                    placeholder="e.g. Legal Agreement, Resume, Thesis..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}
            </section>

            {/* Step 2: Document Upload */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "दस्तावेज फ़ाइलें अपलोड करें" : "Upload Your Document(s)"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ⚡ Auto-Page Counter
                  </span>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {uploadedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {uploadedFiles.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {doc.previewUrl ? (
                            <img
                              src={doc.previewUrl}
                              alt="Preview"
                              className="h-11 w-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-lg bg-blue-100 flex items-center justify-center text-[#123B70] shrink-0 font-bold">
                              <FileIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {doc.name}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              {doc.isCounting ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold animate-pulse">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{currentLang === "hi" ? "पेज गिने जा रहे हैं..." : "Counting pages..."}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.2 rounded">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{doc.pages} {doc.pages === 1 ? "page" : "pages"} detected</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Page Stepper per Document & Remove */}
                        <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500 mr-1">
                              {currentLang === "hi" ? "पेज:" : "Pages:"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateDocPages(doc.id, doc.pages - 1)}
                              className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                              title="Decrease pages"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={doc.pages}
                              onChange={(e) => handleUpdateDocPages(doc.id, parseInt(e.target.value) || 1)}
                              className="w-12 h-6 text-center font-black text-slate-900 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateDocPages(doc.id, doc.pages + 1)}
                              className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                              title="Increase pages"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title={currentLang === "hi" ? "फ़ाइल हटाएं" : "Remove file"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add More Documents Dropzone / Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#123B70]/40 bg-blue-50/40 hover:bg-blue-50 hover:border-[#123B70] px-4 py-2.5 text-xs font-bold text-[#123B70] transition-colors cursor-pointer">
                      <Plus className="h-4 w-4" />
                      <span>{currentLang === "hi" ? "+ और दस्तावेज जोड़ें (Add More)" : "+ Add More Documents"}</span>
                      <input
                        ref={addMoreInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          handleFilesAdd(e.target.files);
                          if (e.target) e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleClearAllDocs}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      {currentLang === "hi" ? "सभी फ़ाइलें हटाएं" : "Clear All Files"}
                    </button>
                  </div>

                  {/* Multi-Document Summary Strip */}
                  <div className="flex flex-wrap items-center justify-between rounded-xl bg-slate-900 text-white p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-slate-200">
                        {uploadedFiles.length} {uploadedFiles.length === 1 ? "File" : "Files"} Uploaded
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        Size: {(uploadedFiles.reduce((sum, d) => sum + d.size, 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <span className="font-black text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        Total {totalPages} {totalPages === 1 ? "Page" : "Pages"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-[#123B70] hover:bg-blue-50/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-50 text-[#123B70] group-hover:scale-110 transition-transform mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-800">
                    {currentLang === "hi"
                      ? "दस्तावेज चुनने के लिए क्लिक करें या यहाँ ड्रैग करें"
                      : "Click to select document(s) or drag & drop"}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    {currentLang === "hi"
                      ? "एक या अधिक PDF, DOC, JPG, PNG फ़ाइलें चुनें (पेज संख्या स्वतः गिनी जाएगी)"
                      : "Select one or multiple files • Pages are automatically counted"}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-2 bg-slate-200/60 px-2.5 py-0.5 rounded-full">
                    PDF • DOC • DOCX • JPG • PNG (Max 50MB each)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      handleFilesAdd(e.target.files);
                      if (e.target) e.target.value = "";
                    }}
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

              {/* Number of Total Combined Pages in Document */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileText className="h-4 w-4 text-[#123B70]" />
                    <span>{currentLang === "hi" ? "कुल पृष्ठ संख्या (Combined Total Pages)" : "Combined Total Pages in Order"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {currentLang === "hi"
                      ? "सभी अपलोड किए गए दस्तावेजों के पेजों का योग (सटीक बिलिंग हेतु)"
                      : "Sum of pages across all uploaded documents for accurate live pricing"}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTotalPages((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={totalPages}
                    onChange={(e) => setTotalPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-8 text-center font-black text-slate-900 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-[#123B70] focus:outline-hidden text-xs shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalPages((p) => p + 1)}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Step 3: Printing Options */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    3
                  </span>
                  <span>{currentLang === "hi" ? "प्रिंटिंग ऑप्शंस (Printing Options)" : "Printing Options"}</span>
                </div>
              </div>

              {/* Paper Size & Color Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paper Size */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "कागज का आकार (Paper Size)" : "Paper Size"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["a4", "a3", "a5"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPaperSize(size)}
                        className={cn(
                          "rounded-xl border py-2.5 text-center text-xs font-bold uppercase transition-all cursor-pointer",
                          paperSize === size
                            ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Mode */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "कलर मोड (Color Mode)" : "Color Mode"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setColorMode("bw")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        colorMode === "bw"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {currentLang === "hi" ? "Black & White (B/W)" : "Black & White"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode("color")}
                      className={cn(
                        "rounded-xl border py-2.5 text-center text-xs font-bold transition-all cursor-pointer",
                        colorMode === "color"
                          ? "border-[#123B70] bg-[#123B70] text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {currentLang === "hi" ? "कलर (Color)" : "Vibrant Color"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sides, Orientation & Copies */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                {/* Sides */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "प्रिंटिंग साइड" : "Sides"}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSides("single")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        sides === "single"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Single Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setSides("double")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        sides === "double"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Double Side
                    </button>
                  </div>
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "ओरिएंटेशन" : "Orientation"}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOrientation("portrait")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        orientation === "portrait"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation("landscape")}
                      className={cn(
                        "rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer",
                        orientation === "landscape"
                          ? "border-[#123B70] bg-blue-50 text-[#123B70] ring-1 ring-[#123B70]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Copies Counter */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "प्रतियों की संख्या (Copies)" : "Number of Copies"}
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

              {/* Page Range Selection */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {currentLang === "hi" ? "पृष्ठ रेंज (Page Range)" : "Page Range to Print"}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRangeType"
                        checked={pageRangeType === "all"}
                        onChange={() => setPageRangeType("all")}
                        className="text-[#123B70]"
                      />
                      <span className="text-slate-700 font-semibold">{currentLang === "hi" ? "सभी पृष्ठ" : "All Pages"}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pageRangeType"
                        checked={pageRangeType === "custom"}
                        onChange={() => setPageRangeType("custom")}
                        className="text-[#123B70]"
                      />
                      <span className="text-slate-700 font-semibold">{currentLang === "hi" ? "कस्टम रेंज" : "Custom Range"}</span>
                    </label>
                  </div>
                </div>

                {pageRangeType === "custom" && (
                  <div className="animate-in fade-in">
                    <input
                      type="text"
                      value={customPageRange}
                      onChange={(e) => setCustomPageRange(e.target.value)}
                      placeholder="e.g. 1-5, 8, 11-15"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {currentLang === "hi" ? "जैसे: 1-5, 8-12 (अल्पविराम से अलग करें)" : "Format: 1-5, 8, 11-15 (separated by commas)"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Step 4: Finishing Options */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    4
                  </span>
                  <span>✨ {currentLang === "hi" ? "फिनिशिंग ऑप्शंस (Finishing Options)" : "Finishing Options"}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Optional Add-on
                </span>
              </div>

              <p className="text-xs text-slate-500">
                {currentLang === "hi"
                  ? "प्रिंट होने के बाद बाइंडिंग या लैमिनेशन जोड़ें। पालक टीम प्रिंट करके तैयार रखेगी।"
                  : "Select post-print finishing. We print your document first, then bind or laminate it."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Spiral Binding */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer",
                    spiralBinding
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={spiralBinding}
                    onChange={(e) => {
                      setSpiralBinding(e.target.checked);
                      if (e.target.checked) setCombBinding(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#123B70] focus:ring-[#123B70]"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "स्पाइरल बाइंडिंग" : "Spiral Binding"}
                      </span>
                      <span className="text-xs font-extrabold text-[#123B70]">
                        +₹{pricingConfig.documentPrinting.finishing.spiralBinding.price}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {currentLang === "hi" ? "प्लास्टिक कॉइल + पारदर्शी कवर" : "Plastic coil spine with clear protective sheet"}
                    </p>
                  </div>
                </label>

                {/* Comb Binding */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer",
                    combBinding
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={combBinding}
                    onChange={(e) => {
                      setCombBinding(e.target.checked);
                      if (e.target.checked) setSpiralBinding(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#123B70] focus:ring-[#123B70]"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "कॉम्ब बाइंडिंग" : "Comb Binding"}
                      </span>
                      <span className="text-xs font-extrabold text-[#123B70]">
                        +₹{pricingConfig.documentPrinting.finishing.combBinding.price}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {currentLang === "hi" ? "रिंग स्पाइन बाइंडिंग" : "Plastic comb spine for reports & manuals"}
                    </p>
                  </div>
                </label>

                {/* Lamination */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer",
                    lamination
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={lamination}
                    onChange={(e) => setLamination(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#123B70] focus:ring-[#123B70]"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "थर्मल लैमिनेशन" : "Thermal Lamination"}
                      </span>
                      <span className="text-xs font-extrabold text-[#123B70]">
                        +₹{pricingConfig.documentPrinting.finishing.lamination.pricePerPage}/page
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {currentLang === "hi" ? "वॉटरप्रूफ टिकाऊ सुरक्षा सील" : "Waterproof gloss laminate seal"}
                    </p>
                  </div>
                </label>

                {/* Stapling */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer",
                    stapling
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={stapling}
                    onChange={(e) => setStapling(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#123B70] focus:ring-[#123B70]"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {currentLang === "hi" ? "स्टेपलिंग (Stapling)" : "Corner Stapling"}
                      </span>
                      <span className="text-xs font-extrabold text-[#123B70]">
                        +₹{pricingConfig.documentPrinting.finishing.stapling.price}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {currentLang === "hi" ? "कॉर्नर पिन लगाना" : "Neat corner pin / booklet staple"}
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Step 5: Customer Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    5
                  </span>
                  <span>{currentLang === "hi" ? "ग्राहक विवरण (Customer Details)" : "Your Contact Details"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "पूरा नाम *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "मोबाइल नंबर *" : "Mobile Number *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9905238015"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "व्हाट्सएप नंबर (वैकल्पिक)" : "WhatsApp Number (Optional)"}
                  </label>
                  <input
                    type="tel"
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    placeholder="e.g. 9905238015"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentLang === "hi" ? "ईमेल (वैकल्पिक)" : "Email Address (Optional)"}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  {currentLang === "hi" ? "अतिरिक्त निर्देश (Optional Instructions)" : "Additional Instructions"}
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={
                    currentLang === "hi"
                      ? "पेज नंबर, बाइंडिंग का प्रकार या कोई विशेष निर्देश लिखें..."
                      : "Special requirements, specific pages, urgency notes..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                />
              </div>
            </section>

              {/* Step 6: Choose Payment Method */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                      6
                    </span>
                    <span>{currentLang === "hi" ? "भुगतान माध्यम चुनें (Choose Payment Method)" : "Choose Payment Method"}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    📍 Shop Pickup
                  </span>
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
                          ? "⚡ दुकान पर लाइन लगे बिना सीधे तैयार प्रिंट लें! आपके पहुँचने से पहले ही दस्तावेज प्रिंट व पैक रहेंगे।"
                          : "⚡ Skip the line! Pre-printed and packed before you arrive. Walk in, show Order ID, and collect instantly."}
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
                          ? "ऑर्डर अभी दर्ज करें। दुकान (ब्लॉक गेट, चकिया) पहुँचकर काउंटर पर भुगतान कर प्रिंट प्राप्त करें।"
                          : "Order is registered now. Pay at the shop counter when you arrive for collection."}
                      </p>
                    </div>
                  </label>
                </div>
              </section>
          </div>

          {/* Right 1 Column: Price Summary & Submit Sidebar */}
          <div className="space-y-4">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#123B70]" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "ऑर्डर सारांश एवं मूल्य" : "Price Breakdown"}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Live Quote</span>
              </div>

              {/* Document Info */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "दस्तावेज प्रकार:" : "Doc Type:"}</span>
                  <span className="font-bold text-slate-900">{getDocTypeLabel()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "साइज व कलर:" : "Specs:"}</span>
                  <span className="font-semibold text-slate-800">
                    {paperSize.toUpperCase()} • {colorMode === "bw" ? "B/W" : "Color"} • {sides === "single" ? "Single" : "Double"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "प्रिंट पृष्ठ संख्या:" : "Pages to Print:"}</span>
                  <span className="font-semibold text-slate-800">{priceResult.pagesToPrint} pages</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "प्रतियां (Copies):" : "Copies:"}</span>
                  <span className="font-bold text-slate-900">{copies}</span>
                </div>
              </div>

              {/* Price Details */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">{currentLang === "hi" ? "प्रिंटिंग शुल्क:" : "Print Cost (Base):"}</span>
                  <span className="font-semibold text-slate-900">₹{priceResult.breakdown.basePrint}</span>
                </div>

                {priceResult.breakdown.spiral > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>+ {currentLang === "hi" ? "स्पाइरल बाइंडिंग" : "Spiral Binding"}:</span>
                    <span>₹{priceResult.breakdown.spiral}</span>
                  </div>
                )}

                {priceResult.breakdown.comb > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>+ {currentLang === "hi" ? "कॉम्ब बाइंडिंग" : "Comb Binding"}:</span>
                    <span>₹{priceResult.breakdown.comb}</span>
                  </div>
                )}

                {priceResult.breakdown.lamination > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>+ {currentLang === "hi" ? "लैमिनेशन" : "Lamination"}:</span>
                    <span>₹{priceResult.breakdown.lamination}</span>
                  </div>
                )}

                {priceResult.breakdown.stapling > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>+ {currentLang === "hi" ? "स्टेपलिंग" : "Stapling"}:</span>
                    <span>₹{priceResult.breakdown.stapling}</span>
                  </div>
                )}

                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>{currentLang === "hi" ? "प्रति कॉपी दर:" : "Rate per Copy:"}</span>
                  <span>₹{priceResult.unitPrice} / copy</span>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">
                  {currentLang === "hi" ? "कुल अनुमानित राशि" : "Estimated Total"}
                </span>
                <span className="text-2xl font-black text-[#123B70]">
                  ₹{priceResult.total}
                </span>
              </div>

              {submitError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
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
                        ? `ऑर्डर सबमिट करें (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`
                        : `Submit Order (${paymentMethod === "pay_online" ? "Pay Online" : "Pay at Shop"}) →`}
                    </span>
                  </>
                )}
              </button>

              <div className="rounded-xl bg-blue-50/60 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#123B70]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{currentLang === "hi" ? "लाइन में लगे बिना कलेक्ट करें" : "Zero Queue Policy"}</span>
                </div>
                <p>
                  {currentLang === "hi"
                    ? "ऑर्डर सबमिट करने के बाद आपको यूनिक आईडी मिलेगी। तैयार होने पर दुकान से सीधे प्राप्त करें।"
                    : "You will receive an Order ID. Collect directly at the counter without waiting."}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {successData && (
        <OrderSuccessModal
          isOpen={successData.isOpen}
          onClose={() => setSuccessData(null)}
          orderCode={successData.orderCode}
          serviceName="Document Printing"
          documentType={successData.docType}
          specifications={successData.specifications}
          finishingSelected={successData.finishingSelected}
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
