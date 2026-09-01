import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  Upload,
  AlertCircle,
  Calculator,
  Plus,
  Minus,
  ShieldCheck,
  Trash2,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Copy,
  Check,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingConfig,
} from "../../config/printPricing";
import {
  getPrintPricingConfig,
  submitPrintOrder,
} from "../../lib/supabase/database";
import { initiateRazorpayPayment } from "../../lib/razorpay";
import { OrderSuccessModal } from "../../components/OrderSuccessModal";
import { LiveOrderProcessingModal } from "../../components/orders/LiveOrderProcessingModal";
import { OrderAuthGate } from "../../components/OrderAuthGate";
import { QuickServiceUnavailableBanner } from "../../components/QuickServiceUnavailableBanner";
import { useQuickServiceAvailability } from "../../hooks/useQuickServiceAvailability";
import { cn } from "../../lib/utils";
import {
  STATE_METADATA_MAP,
} from "../../lib/orders/orderSubmissionStateMachine";
import type {
  OrderSubmissionState,
  FileProgressInfo,
  UploadProgressSummary,
  StateTimelineEntry,
} from "../../lib/orders/orderSubmissionStateMachine";
import {
  uploadOrderDocumentsWithProgress,
} from "../../lib/orders/orderUploadEngine";
import {
  validateQuickServiceFiles,
  getQuickServiceUploadLimitText,
} from "../../config/quickServiceConfig";
import {
  createOrderPerformanceTracer,
} from "../../lib/orders/orderPerformanceTrace";
import {
  generateUniqueSubmissionId,
  checkExistingSubmission,
  saveActiveSubmissionSession,
  getActiveSubmissionSession,
  clearActiveSubmissionSession,
} from "../../lib/orders/submissionRecovery";
import type {
  DocumentPrintConfig,
  OrderPrintSnapshot,
  UserSavedPrintPreferences,
  PaperSize,
  ColorMode,
  PrintOrientation,
  PaperGSM,
  BindingType,
  CoverOption,
} from "../../types/printJob";
import {
  calculateDocumentPrintPriceComplete,
  buildOrderPrintSnapshot,
} from "../../lib/pricing/printPricingEngine";
import { UserPrintPreferencesStore } from "../../lib/storage/userPrintPreferencesStore";

import {
  createPendingDocumentMetadata,
  globalDocumentAnalysisQueue,
  type CanonicalDocumentMetadata,
} from "../../lib/documents/documentPageCountEngine";

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

export interface UploadedConfiguredDocument {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number | null;
  metadata: CanonicalDocumentMetadata;
  previewUrl?: string;
  isExpanded?: boolean;
  config: DocumentPrintConfig;
}

const DOCPRINT_SUBMISSION_KEY = "palak_docprint_submission_id_v1";

function clearDocPrintSubmissionId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DOCPRINT_SUBMISSION_KEY);
  } catch {}
}

export const DocumentPrintingPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { isStopped, stopReason } = useQuickServiceAvailability("document-printing");

  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);

  // Saved user preferences
  const [savedPrefs, setSavedPrefs] = useState<UserSavedPrintPreferences>(() =>
    UserPrintPreferencesStore.getLocalPreferences()
  );
  const [savedPrefsSavedToast, setSavedPrefsSavedToast] = useState<boolean>(false);

  // Step 1: Document Type
  const [selectedDocType, setSelectedDocType] = useState<string>("assignment");
  const [customDocTypeName, setCustomDocTypeName] = useState<string>("");

  // Step 2: Uploaded Documents with Independent Configurations
  const [documents, setDocuments] = useState<UploadedConfiguredDocument[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Customer Details & Auth
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

      // Load user preferences from cloud
      UserPrintPreferencesStore.loadUserPreferences(user.id).then((prefs) => {
        setSavedPrefs(prefs);
      });
    }
  }, [user]);

  const [searchParams] = useSearchParams();
  const location = useLocation();

  const resolvePaymentMethod = (): "pay_at_shop" | "pay_online" => {
    const payParam =
      searchParams.get("payment") ||
      searchParams.get("paymentMethod") ||
      searchParams.get("pay") ||
      (location.state as any)?.paymentMethod;
    if (payParam) {
      const p = String(payParam).toLowerCase();
      if (
        p === "pay_online" ||
        p === "online" ||
        p === "pay-online" ||
        p === "priority" ||
        p === "upi_online" ||
        p === "paid"
      ) {
        return "pay_online";
      }
      if (
        p === "pay_at_shop" ||
        p === "send_document" ||
        p === "send-document" ||
        p === "pay_at_store" ||
        p === "shop" ||
        p === "store" ||
        p === "normal"
      ) {
        return "pay_at_shop";
      }
    }
    return "pay_at_shop";
  };

  const [paymentMethod, setPaymentMethod] = useState<"pay_at_shop" | "pay_online">(resolvePaymentMethod);

  // Submission State Machine & Live Processing State
  const [submissionState, setSubmissionState] = useState<OrderSubmissionState>("IDLE");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => generateUniqueSubmissionId());
  const [timeline, setTimeline] = useState<StateTimelineEntry[]>([]);
  const [filesProgress, setFilesProgress] = useState<FileProgressInfo[]>([]);
  const [uploadSummary, setUploadSummary] = useState<UploadProgressSummary | undefined>(undefined);
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingLockRef = useRef<boolean>(false);

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

  const transitionTo = (newState: OrderSubmissionState, detail?: string) => {
    setSubmissionState(newState);
    const meta = STATE_METADATA_MAP[newState];
    setTimeline((prev) => [
      ...prev,
      {
        state: newState,
        titleEn: meta?.titleEn || newState,
        titleHi: meta?.titleHi || newState,
        timestamp: new Date(),
        detail,
      },
    ]);
  };

  // Recovery hook for in-flight sessions on page load
  useEffect(() => {
    const activeSession = getActiveSubmissionSession();
    if (activeSession && activeSession.submissionId) {
      checkExistingSubmission(activeSession.submissionId)
        .then((existing) => {
          if (existing.found && existing.orderCode) {
            setConfirmedOrderCode(existing.orderCode);
            setSuccessData({
              isOpen: true,
              orderCode: existing.orderCode,
              totalAmount: existing.totalAmount || activeSession.totalAmount || 0,
              docType: activeSession.specifications?.["Document Type"] || "Document Printing",
              specifications: activeSession.specifications || {},
              finishingSelected: [],
              paymentMethod:
                activeSession.paymentMethod === "pay_online" || activeSession.paymentMethod === "upi_online"
                  ? "Online Payment (UPI/Card)"
                  : "Pay on Pickup",
              paymentStatus: existing.paymentStatus === "confirmed" ? "Paid & Confirmed" : "Pending (Pay at Store)",
            });
            clearActiveSubmissionSession();
          } else if (activeSession.state === "UPLOADING" || activeSession.state === "SUBMITTING") {
            clearActiveSubmissionSession();
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch pricing on load
  useEffect(() => {
    getPrintPricingConfig().then(setPricingConfig).catch(() => setPricingConfig(DEFAULT_PRINT_PRICING));
    const handleUpdate = (e: any) => {
      if (e?.detail) setPricingConfig(e.detail);
    };
    window.addEventListener("palak_print_pricing_updated", handleUpdate);
    return () => window.removeEventListener("palak_print_pricing_updated", handleUpdate);
  }, []);

  // Helper to construct a DocumentPrintConfig from preferences
  const createInitialConfig = (
    docId: string,
    fileName: string,
    fileSize: number,
    pages: number,
    prefs: UserSavedPrintPreferences = savedPrefs
  ): DocumentPrintConfig => {
    const rawConfig: Partial<DocumentPrintConfig> = {
      documentId: docId,
      fileName,
      fileSize,
      totalPages: pages,
      pageRangeType: "all",
      customPageRange: "",
      colorMode: prefs.colorMode,
      colorPagesRange: "",
      copies: prefs.copies || 1,
      paperSize: prefs.paperSize,
      paperType: prefs.paperType,
      gsm: prefs.gsm,
      orientation: prefs.orientation,
      sides: prefs.sides,
      pagesPerSheet: prefs.pagesPerSheet,
      scaling: prefs.scaling,
      binding: prefs.binding,
      frontCover: prefs.frontCover,
      backCover: prefs.backCover,
      finishing: { ...prefs.finishing },
    };

    const calculated = calculateDocumentPrintPriceComplete(rawConfig, pricingConfig);

    return {
      documentId: docId,
      fileName,
      fileSize,
      totalPages: pages,
      pageRangeType: "all",
      customPageRange: "",
      colorMode: prefs.colorMode,
      colorPagesRange: "",
      copies: prefs.copies || 1,
      paperSize: prefs.paperSize,
      paperType: prefs.paperType,
      gsm: prefs.gsm,
      orientation: prefs.orientation,
      sides: prefs.sides,
      pagesPerSheet: prefs.pagesPerSheet,
      scaling: prefs.scaling,
      binding: prefs.binding,
      frontCover: prefs.frontCover,
      backCover: prefs.backCover,
      finishing: { ...prefs.finishing },
      selectedPageCount: calculated.selectedPageCount,
      bwPageCount: calculated.bwPageCount,
      colorPageCount: calculated.colorPageCount,
      physicalSheetsPerCopy: calculated.physicalSheetsPerCopy,
      totalPhysicalSheets: calculated.totalPhysicalSheets,
      itemPrice: calculated.itemPrice,
      totalPrice: calculated.totalPrice,
      priceBreakdown: calculated.priceBreakdown,
    };
  };

  // Handle Multi-File Upload with Authoritative Document Analysis & Strict 45 MB Protection
  const handleFilesChosen = async (files: FileList | File[]) => {
    setFileError(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // 1. Immediate File Size & Format Validation (Before any expensive ArrayBuffer / PDF parsing)
    const validation = validateQuickServiceFiles(fileArray);

    if (!validation.allValid) {
      setFileError(
        currentLang === "hi"
          ? validation.errorSummaryHi || validation.errorSummary || "फ़ाइल का आकार 45MB से अधिक है।"
          : validation.errorSummary || "File exceeds maximum allowed size of 45 MB."
      );
    }

    if (validation.validFiles.length === 0) {
      return;
    }

    const newItems: UploadedConfiguredDocument[] = [];

    for (let i = 0; i < validation.validFiles.length; i++) {
      const file = validation.validFiles[i] as File;

      let previewUrl: string | undefined = undefined;
      if (file.type && file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`;
      const pendingMeta = createPendingDocumentMetadata(docId, file.name, file.size, file.type);
      pendingMeta.pageCountStatus = "analyzing";

      const docItem: UploadedConfiguredDocument = {
        id: docId,
        file,
        name: file.name,
        size: file.size,
        pages: null,
        metadata: pendingMeta,
        previewUrl,
        isExpanded: false,
        config: createInitialConfig(docId, file.name, file.size, 1),
      };

      newItems.push(docItem);
    }

    if (newItems.length === 0) return;

    setDocuments((prev) => [...prev, ...newItems]);

    // Enqueue authoritative format-specific page analysis with controlled concurrency
    for (const item of newItems) {
      globalDocumentAnalysisQueue
        .enqueue(item.file, item.id, item.metadata.analysisToken)
        .then((analyzedMeta) => {
          setDocuments((prev) =>
            prev.map((d) => {
              // Strict race condition & stale token guard
              if (d.id !== item.id || d.metadata.analysisToken !== analyzedMeta.analysisToken) {
                return d;
              }

              const verifiedPages =
                analyzedMeta.pageCountVerified && analyzedMeta.pageCount && analyzedMeta.pageCount > 0
                  ? analyzedMeta.pageCount
                  : null;

              const updatedConfig = { ...d.config, totalPages: verifiedPages || 1 };
              const calc = calculateDocumentPrintPriceComplete(updatedConfig, pricingConfig);

              return {
                ...d,
                pages: verifiedPages,
                metadata: analyzedMeta,
                config: {
                  ...updatedConfig,
                  selectedPageCount: calc.selectedPageCount,
                  bwPageCount: calc.bwPageCount,
                  colorPageCount: calc.colorPageCount,
                  physicalSheetsPerCopy: calc.physicalSheetsPerCopy,
                  totalPhysicalSheets: calc.totalPhysicalSheets,
                  itemPrice: verifiedPages ? calc.itemPrice : 0,
                  totalPrice: verifiedPages ? calc.totalPrice : 0,
                  priceBreakdown: calc.priceBreakdown,
                },
              };
            })
          );
        })
        .catch((err) => {
          setDocuments((prev) =>
            prev.map((d) => {
              if (d.id !== item.id) return d;
              return {
                ...d,
                pages: null,
                metadata: {
                  ...d.metadata,
                  pageCountStatus: "failed",
                  pageCountVerified: false,
                  pageCountError: err?.message || "Failed to analyze document pages.",
                },
              };
            })
          );
        });
    }
  };

  // Update specific document configuration
  const updateDocumentConfig = (docId: string, updates: Partial<DocumentPrintConfig>) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const merged = { ...d.config, ...updates };
        const calc = calculateDocumentPrintPriceComplete(merged, pricingConfig);
        return {
          ...d,
          config: {
            ...merged,
            selectedPageCount: calc.selectedPageCount,
            bwPageCount: calc.bwPageCount,
            colorPageCount: calc.colorPageCount,
            physicalSheetsPerCopy: calc.physicalSheetsPerCopy,
            totalPhysicalSheets: calc.totalPhysicalSheets,
            itemPrice: calc.itemPrice,
            totalPrice: calc.totalPrice,
            priceBreakdown: calc.priceBreakdown,
          },
        };
      })
    );
  };

  // Apply one document's settings to all documents
  const applySettingsToAllDocuments = (sourceConfig: DocumentPrintConfig) => {
    setDocuments((prev) =>
      prev.map((d) => {
        const merged: Partial<DocumentPrintConfig> = {
          ...d.config,
          colorMode: sourceConfig.colorMode,
          paperSize: sourceConfig.paperSize,
          paperType: sourceConfig.paperType,
          gsm: sourceConfig.gsm,
          orientation: sourceConfig.orientation,
          sides: sourceConfig.sides,
          pagesPerSheet: sourceConfig.pagesPerSheet,
          scaling: sourceConfig.scaling,
          binding: sourceConfig.binding,
          frontCover: sourceConfig.frontCover,
          backCover: sourceConfig.backCover,
          finishing: { ...sourceConfig.finishing },
          copies: sourceConfig.copies,
        };
        const calc = calculateDocumentPrintPriceComplete(merged, pricingConfig);
        return {
          ...d,
          config: {
            ...d.config,
            ...merged,
            selectedPageCount: calc.selectedPageCount,
            bwPageCount: calc.bwPageCount,
            colorPageCount: calc.colorPageCount,
            physicalSheetsPerCopy: calc.physicalSheetsPerCopy,
            totalPhysicalSheets: calc.totalPhysicalSheets,
            itemPrice: calc.itemPrice,
            totalPrice: calc.totalPrice,
            priceBreakdown: calc.priceBreakdown,
          },
        };
      })
    );
  };

  // Save current preferences as default
  const handleSaveAsDefault = async (configToSave: DocumentPrintConfig) => {
    const newPrefs: UserSavedPrintPreferences = {
      paperSize: configToSave.paperSize,
      colorMode: configToSave.colorMode,
      sides: configToSave.sides,
      orientation: configToSave.orientation,
      copies: configToSave.copies,
      pagesPerSheet: configToSave.pagesPerSheet,
      scaling: configToSave.scaling,
      paperType: configToSave.paperType,
      gsm: configToSave.gsm,
      binding: configToSave.binding,
      frontCover: configToSave.frontCover,
      backCover: configToSave.backCover,
      finishing: { ...configToSave.finishing },
    };

    setSavedPrefs(newPrefs);
    await UserPrintPreferencesStore.savePreferences(newPrefs, user?.id);
    setSavedPrefsSavedToast(true);
    setTimeout(() => setSavedPrefsSavedToast(false), 3000);
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const handleClearAllDocs = () => {
    documents.forEach((d) => {
      if (d.previewUrl) URL.revokeObjectURL(d.previewUrl);
    });
    setDocuments([]);
    setFileError(null);
  };

  const hasUnverifiedDocs =
    documents.length === 0 ||
    documents.some((d) => !d.metadata?.pageCountVerified || d.pages === null || d.pages <= 0);

  const hasAnalyzingDocs = documents.some((d) => d.metadata?.pageCountStatus === "analyzing");
  const hasFailedDocs = documents.some(
    (d) => d.metadata?.pageCountStatus === "failed" || d.metadata?.pageCountStatus === "unsupported"
  );

  // Recalculate Order Snapshot Live (Using authoritative verified page counts)
  const orderSnapshot: OrderPrintSnapshot = buildOrderPrintSnapshot(
    documents.map((d) => d.config),
    0,
    "2026-08-22-v1"
  );

  const getDocTypeLabel = () => {
    const found = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);
    if (!found) return customDocTypeName || "Document";
    if (selectedDocType === "other" && customDocTypeName) return customDocTypeName;
    return currentLang === "hi" ? found.labelHi : found.labelEn;
  };

  // Cancellation handler
  const handleCancelSubmission = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
    }
    transitionTo("CANCEL_REQUESTED", "User requested submission cancellation");
    setTimeout(() => {
      transitionTo("CANCELLED", "Submission safely cancelled by user");
      isSubmittingLockRef.current = false;
      clearActiveSubmissionSession();
      clearDocPrintSubmissionId();
      setActiveSubmissionId(generateUniqueSubmissionId());
    }, 350);
  };

  // Retry handler
  const handleRetrySubmission = () => {
    setSubmitError(null);
    setSubmissionState("IDLE");
    setTimeline([]);
    setFilesProgress([]);
    setUploadSummary(undefined);
    isSubmittingLockRef.current = false;
    setActiveSubmissionId(generateUniqueSubmissionId());
  };

  // Form Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Prevent duplicate submission from rapid clicks, double clicks, or Enter key repeats
    if (
      isSubmittingLockRef.current ||
      (submissionState !== "IDLE" && submissionState !== "FAILED" && submissionState !== "CANCELLED")
    ) {
      return;
    }

    if (isStopped) {
      setSubmitError(
        stopReason
          ? `Document Printing is temporarily unavailable (${stopReason}). Please try again later.`
          : "Document Printing is currently temporarily paused and not accepting new orders."
      );
      return;
    }

    if (documents.length === 0) {
      setSubmitError(
        currentLang === "hi"
          ? "कृपया प्रिंट करने के लिए कम से कम एक दस्तावेज फ़ाइल अपलोड करें।"
          : "Please upload at least one document file before submitting."
      );
      return;
    }

    // Strict Page-Count Verification Invariant
    if (hasUnverifiedDocs) {
      if (hasAnalyzingDocs) {
        setSubmitError(
          currentLang === "hi"
            ? "कृपया सभी दस्तावेजों के पेज काउंट का विश्लेषण पूरा होने तक प्रतीक्षा करें।"
            : "Please wait while document page counts are being analyzed."
        );
      } else {
        setSubmitError(
          currentLang === "hi"
            ? "एक या अधिक दस्तावेजों के पेज काउंट को सत्यापित नहीं किया जा सका। कृपया सही दस्तावेज अपलोड करें।"
            : "One or more documents could not be verified. Please check or re-upload your files."
        );
      }
      return;
    }

    if (!user) {
      setSubmitError(
        currentLang === "hi"
          ? "ऑनलाइन प्रिंटिंग ऑर्डर के लिए अकाउंट आवश्यक है। कृपया नीचे दिए गए फॉर्म से तुरंत अकाउंट बनाएं या लॉगिन करें।"
          : "An account is required to place an instant online print order. Please create an account or sign in below."
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

    // Acquire execution lock
    isSubmittingLockRef.current = true;
    let subId = activeSubmissionId;
    if (!subId || confirmedOrderCode) {
      subId = generateUniqueSubmissionId();
      setActiveSubmissionId(subId);
    }
    const requestId = `REQ-${Date.now().toString().slice(-9)}`;
    console.debug(`[DocumentPrinting] Starting submission [${requestId}] with subId: ${subId}`);
    setTimeline([]);
    setConfirmedOrderCode(undefined);

    const tracer = createOrderPerformanceTracer(subId, "document-printing");
    const totalBytes = documents.reduce((sum, d) => sum + (d.size || 0), 0);
    tracer.setMetadata({ documentCount: documents.length, totalBytes });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 1. SUBMITTING
      tracer.startStep("submission_init", "SUBMITTING");
      transitionTo("SUBMITTING", "Initializing submission session");
      tracer.endStep("submission_init", true);
      if (abortController.signal.aborted) return;

      // 2. VALIDATING
      tracer.startStep("validation", "VALIDATING");
      transitionTo("VALIDATING", "Validating print configurations and availability");

      // Verify zero documents exceed the 45 MB boundary
      const docValidation = validateQuickServiceFiles(documents.map((d) => ({ name: d.name, size: d.size })));
      if (!docValidation.allValid) {
        tracer.endStep("validation", false, docValidation.errorSummary);
        throw new Error(docValidation.errorSummary || "One or more documents exceed the 45 MB limit.");
      }

      // Verify no document is still analyzing or failed analysis
      for (const doc of documents) {
        if (doc.metadata?.pageCountStatus === "analyzing") {
          tracer.endStep("validation", false, "Document is still analyzing pages.");
          throw new Error(`Document "${doc.name}" is still analyzing page count. Please wait a moment.`);
        }
        if (doc.metadata?.pageCountStatus === "failed" || doc.metadata?.pageCountStatus === "unsupported") {
          tracer.endStep("validation", false, doc.metadata?.pageCountError || "Document analysis failed.");
          throw new Error(doc.metadata?.pageCountError || `Document "${doc.name}" cannot be processed.`);
        }
      }

      tracer.endStep("validation", true);
      if (abortController.signal.aborted) return;

      // 3. UPLOADING
      tracer.startStep("document_upload", "UPLOADING", { totalBytes, documentCount: documents.length });
      transitionTo("UPLOADING", "Uploading document files");
      const initialProgressList: FileProgressInfo[] = documents.map((doc, idx) => ({
        index: idx,
        name: doc.name,
        size: doc.size,
        loaded: 0,
        percent: 0,
        status: "waiting",
      }));
      setFilesProgress(initialProgressList);

      const uploadedResults = await uploadOrderDocumentsWithProgress(
        documents.map((d) => ({
          file: d.file,
          name: d.name,
          size: d.size,
          pages: d.pages,
          mimeType: d.file.type || "application/pdf",
        })),
        subId,
        subId,
        {
          onFileStart: (idx, name, size) => {
            setFilesProgress((prev) =>
              prev.map((f, i) =>
                i === idx ? { ...f, status: "uploading", name, size } : f
              )
            );
          },
          onFileProgress: (idx, loaded, total, percent) => {
            setFilesProgress((prev) =>
              prev.map((f, i) =>
                i === idx ? { ...f, loaded, size: total, percent } : f
              )
            );
          },
          onFileComplete: (idx, res) => {
            setFilesProgress((prev) =>
              prev.map((f, i) =>
                i === idx
                  ? {
                      ...f,
                      loaded: f.size,
                      percent: 100,
                      status: "completed",
                      storageUrl: res.url,
                      storagePath: res.storagePath,
                    }
                  : f
              )
            );
          },
          onFileError: (idx, err) => {
            setFilesProgress((prev) =>
              prev.map((f, i) =>
                i === idx ? { ...f, status: "failed", error: err } : f
              )
            );
          },
          onOverallProgress: (loadedBytes, totalBytes, percent, completedFiles) => {
            setUploadSummary({
              loadedBytes,
              totalBytes,
              percent,
              completedFiles,
              totalFiles: documents.length,
            });
          },
        },
        abortController.signal
      );

      tracer.endStep("document_upload", true);
      if (abortController.signal.aborted) return;

      // 4. PROCESSING
      tracer.startStep("document_processing", "PROCESSING");
      transitionTo("PROCESSING", "Verifying snapshot & compiling specifications");
      const snapshotDocsWithUrls: DocumentPrintConfig[] = documents.map((doc, idx) => ({
        ...doc.config,
        fileUrl: uploadedResults[idx]?.url || "",
        storagePath: uploadedResults[idx]?.storagePath || "",
        mimeType: uploadedResults[idx]?.mimeType || "application/pdf",
      }));

      const finalSnapshot = buildOrderPrintSnapshot(snapshotDocsWithUrls, 0, "2026-08-22-v1");

      const primaryFile = uploadedResults[0] || {
        name: documents[0]?.name || "Document",
        size: documents[0]?.size || 0,
        url: "",
        storagePath: "",
        mimeType: "application/pdf",
      };

      const specifications: Record<string, string> = {
        "Total Documents": `${documents.length} file(s)`,
        "Total Printed Pages": `${finalSnapshot.totalPrintedPages} pages`,
        "Color Breakdown": `${finalSnapshot.totalBwPages} B/W, ${finalSnapshot.totalColorPages} Color`,
        "Physical Sheets": `${finalSnapshot.totalPhysicalSheets} sheets`,
      };

      // Save active session for crash/refresh resilience
      saveActiveSubmissionSession({
        submissionId: subId,
        state: "PROCESSING",
        paymentMethod: paymentMethod === "pay_online" ? "pay_online" : "pay_at_store",
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim() || undefined,
        totalAmount: finalSnapshot.grandTotal,
        totalPrintedPages: finalSnapshot.totalPrintedPages,
        totalPhysicalSheets: finalSnapshot.totalPhysicalSheets,
        totalDocuments: documents.length,
        specifications,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      tracer.endStep("document_processing", true);
      if (abortController.signal.aborted) return;

      // 5. ORDER CREATION
      transitionTo("ORDER_CREATING", "Submitting authoritative order transaction");

      const createOrderRecord = async (razorpayPaymentId?: string) => {
        tracer.startStep("order_transaction", "ORDER_CREATING");
        const orderNotesWithPayment = razorpayPaymentId
          ? `${instructions.trim() ? instructions.trim() + " " : ""}[Razorpay ID: ${razorpayPaymentId}]`
          : instructions.trim() || undefined;

        const res = await submitPrintOrder({
          clientSubmissionId: subId,
          serviceId: "document-printing",
          serviceName: "Document Printing",
          documentType: getDocTypeLabel(),
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          customerWhatsApp: customerWhatsApp.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          instructions: orderNotesWithPayment,
          userId: user?.id,
          paymentMethod: paymentMethod === "pay_online" ? "upi_online" : "pay_at_store",
          paymentStatus: razorpayPaymentId ? "confirmed" : "pending",
          pricingSnapshot: {
            unitPrice: finalSnapshot.subtotal,
            subtotal: finalSnapshot.subtotal,
            totalAmount: finalSnapshot.grandTotal,
            breakdown: { snapshot: finalSnapshot },
          },
          options: {
            documentType: getDocTypeLabel(),
            totalDocuments: documents.length,
            totalPages: finalSnapshot.totalPrintedPages,
            printSnapshot: finalSnapshot,
          },
          optionsLabels: specifications,
          printSnapshot: finalSnapshot,
          file: {
            ...primaryFile,
            pageCount: documents[0]?.pages || 1,
          },
          files: uploadedResults.map((res, idx) => ({
            ...res,
            pageCount: documents[idx]?.pages || 1,
            pageCountVerified: documents[idx]?.metadata?.pageCountVerified || false,
            pageCountSource: documents[idx]?.metadata?.pageCountSource || null,
          })),
        });

        if (!res.success) {
          tracer.endStep("order_transaction", false, res.error);
          throw new Error(res.error || "Order submission failed on server.");
        }

        tracer.endStep("order_transaction", true, undefined, { orderCode: res.orderCode });
        tracer.setMetadata({ orderCode: res.orderCode });
        setConfirmedOrderCode(res.orderCode);
        return res.orderCode;
      };

      if (paymentMethod === "pay_online") {
        // Create order in pending state first
        const confirmedCode = await createOrderRecord();

        // 6. ONLINE PAYMENT GATEWAY
        transitionTo("PAYMENT_PENDING", "Opening secure payment gateway");

        await initiateRazorpayPayment({
          amount: finalSnapshot.grandTotal,
          name: "Palak Enterprises",
          orderCode: confirmedCode,
          description: `Document Print Order (${finalSnapshot.totalPrintedPages} pages)`,
          prefill: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            contact: cleanPhone,
          },
          onSuccess: async (paymentId) => {
            transitionTo("PAYMENT_PROCESSING", "Verifying payment confirmation");
            await createOrderRecord(paymentId);
            transitionTo("COMPLETED", "Order confirmed & payment verified");
            tracer.summarize();
            clearActiveSubmissionSession();
            clearDocPrintSubmissionId();
            setActiveSubmissionId(generateUniqueSubmissionId());

            setSuccessData({
              isOpen: true,
              orderCode: confirmedCode,
              totalAmount: finalSnapshot.grandTotal,
              docType: getDocTypeLabel(),
              specifications,
              finishingSelected: [],
              paymentMethod: "Online Payment (UPI/Card)",
              paymentStatus: "Paid & Confirmed",
            });
            isSubmittingLockRef.current = false;
          },
          onDismiss: () => {
            // Payment dismissed -> order is already created in pending state
            transitionTo("COMPLETED", "Order confirmed (Payment pending at counter)");
            tracer.summarize();
            clearActiveSubmissionSession();
            clearDocPrintSubmissionId();
            setActiveSubmissionId(generateUniqueSubmissionId());

            setSuccessData({
              isOpen: true,
              orderCode: confirmedCode,
              totalAmount: finalSnapshot.grandTotal,
              docType: getDocTypeLabel(),
              specifications,
              finishingSelected: [],
              paymentMethod: "Pay on Pickup",
              paymentStatus: "Pending (Pay at Store)",
            });
            isSubmittingLockRef.current = false;
          },
          onError: (err) => {
            setSubmitError(
              err?.description ||
                (currentLang === "hi"
                  ? "ऑनलाइन भुगतान में त्रुटि हुई। आप दुकान पर भुगतान कर सकते हैं।"
                  : "Online payment was not completed. You can pay at the counter.")
            );
            transitionTo("COMPLETED", "Order confirmed (Pay at pickup)");
            tracer.summarize();
            clearActiveSubmissionSession();
            clearDocPrintSubmissionId();
            setActiveSubmissionId(generateUniqueSubmissionId());

            setSuccessData({
              isOpen: true,
              orderCode: confirmedCode,
              totalAmount: finalSnapshot.grandTotal,
              docType: getDocTypeLabel(),
              specifications,
              finishingSelected: [],
              paymentMethod: "Pay on Pickup",
              paymentStatus: "Pending (Pay at Store)",
            });
            isSubmittingLockRef.current = false;
          },
        });
      } else {
        // Pay on Pickup Flow
        const confirmedCode = await createOrderRecord();
        transitionTo("COMPLETED", "Order confirmed in normal print queue");
        tracer.summarize();
        clearActiveSubmissionSession();
        clearDocPrintSubmissionId();
        setActiveSubmissionId(generateUniqueSubmissionId());

        setSuccessData({
          isOpen: true,
          orderCode: confirmedCode,
          totalAmount: finalSnapshot.grandTotal,
          docType: getDocTypeLabel(),
          specifications,
          finishingSelected: [],
          paymentMethod: "Pay on Pickup",
          paymentStatus: "Pending (Pay at Store)",
        });
        isSubmittingLockRef.current = false;
      }
    } catch (err: any) {
      tracer.summarize();
      if (err?.name === "AbortError" || abortController.signal.aborted) {
        transitionTo("CANCELLED", "Submission cancelled");
      } else {
        console.error("Order submission exception:", err);
        setSubmitError(err.message || "An unexpected error occurred.");
        transitionTo("FAILED", err.message || "Order submission failed");
      }
      isSubmittingLockRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-10 sm:py-12 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F59E0B 0, transparent 45%), radial-gradient(circle at 85% 75%, #0284C7 0, transparent 50%), radial-gradient(circle at 50% 50%, #10B981 0, transparent 65%)",
          }}
        />
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
            <Link to="/" className="hover:underline">
              Home
            </Link>{" "}
            /{" "}
            <Link to="/online-services" className="hover:underline">
              Instant Online Services
            </Link>{" "}
            / <span className="text-amber-300">Document Printing</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              📄 {currentLang === "hi" ? "दस्तावेज प्रिंटिंग (Document Printing)" : "Document Printing"}
            </h1>
            <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 text-xs font-bold">
              ⚡ Multi-Document Configurator
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            {currentLang === "hi"
              ? "प्रत्येक दस्तावेज के लिए अलग कलर, पेपर और बाइंडिंग सेटिंग्स चुनें। आपके द्वारा चुनी गई सभी सेटिंग्स सीधे प्रिंटर जॉब में सुरक्षित रहेंगी।"
              : "Configure independent color, duplex, paper and finishing settings per document. All specifications are immutably saved with your order."}
          </p>
        </div>
      </div>

      {/* Main Order Form */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4">
        {isStopped && (
          <QuickServiceUnavailableBanner
            serviceName={currentLang === "hi" ? "दस्तावेज प्रिंटिंग" : "Document Printing"}
            stopReason={stopReason}
          />
        )}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Document Upload & Configurator Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Document Type */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    1
                  </span>
                  <span>{currentLang === "hi" ? "दस्तावेज श्रेणी चुनें" : "Select Document Category"}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Category</span>
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

            {/* Step 2: Upload Documents & Per-Document Cards */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    2
                  </span>
                  <span>{currentLang === "hi" ? "दस्तावेज अपलोड व स्वतंत्र सेटिंग्स" : "Upload & Document Settings"}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Independent Document Controls
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) handleFilesChosen(e.dataTransfer.files);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer",
                  documents.length > 0
                    ? "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400"
                    : "border-blue-300 bg-blue-50/40 hover:bg-blue-50/70 hover:border-[#123B70]"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files) handleFilesChosen(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="hidden"
                />

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#123B70] mb-3 font-bold shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {currentLang === "hi"
                    ? "फ़ाइलें यहाँ ड्रैग करें या चुनने के लिए क्लिक करें"
                    : "Drag & drop files here or click to browse"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {getQuickServiceUploadLimitText(currentLang)}
                </p>
              </div>

              {fileError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Toast for Saved Preferences */}
              {savedPrefsSavedToast && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 animate-in fade-in">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {currentLang === "hi"
                      ? "सफलतापूर्वक डिफॉल्ट प्रिंट प्राथमिकताएं सुरक्षित कर ली गईं!"
                      : "Default print preferences saved successfully!"}
                  </span>
                </div>
              )}

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Uploaded Documents ({documents.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addMoreInputRef.current?.click()}
                        className="text-xs font-bold text-[#123B70] hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add More Files</span>
                      </button>
                      <input
                        ref={addMoreInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files) handleFilesChosen(e.target.files);
                          if (addMoreInputRef.current) addMoreInputRef.current.value = "";
                        }}
                        className="hidden"
                      />
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllDocs}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {documents.map((doc, idx) => {
                    const c = doc.config;

                    return (
                      <div
                        key={doc.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all space-y-4"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#123B70] shrink-0 font-extrabold text-xs">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                {doc.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <span>•</span>
                                {doc.metadata?.pageCountStatus === "analyzing" ? (
                                  <span className="text-amber-600 font-semibold animate-pulse flex items-center gap-1">
                                    <span>⏳ Detecting page count...</span>
                                  </span>
                                ) : doc.metadata?.pageCountStatus === "verified" && doc.pages !== null ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <Check className="h-3 w-3 inline text-emerald-600 stroke-[3]" />
                                    <span>{doc.pages} pages detected • Page count verified</span>
                                  </span>
                                ) : doc.metadata?.pageCountStatus === "failed" || doc.metadata?.pageCountStatus === "unsupported" ? (
                                  <span className="text-rose-600 font-bold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 inline text-rose-500" />
                                    <span>{doc.metadata?.pageCountError || "Page count unavailable"}</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 inline text-amber-500" />
                                    <span>{doc.metadata?.pageCountError || "Page count needs review"}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Top Actions: Price & Remove */}
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                              {doc.pages !== null && doc.metadata?.pageCountVerified ? (
                                <>
                                  <span className="text-xs font-black text-[#123B70] block">
                                    ₹{c.totalPrice.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    (₹{c.itemPrice.toFixed(2)} × {c.copies})
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 italic block">
                                  Calculating...
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Controls Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          {/* 1. Color Mode */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5">
                              {currentLang === "hi" ? "कलर मोड" : "Color Mode"}
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                              {(["bw", "color", "mixed"] as ColorMode[]).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => updateDocumentConfig(doc.id, { colorMode: mode })}
                                  className={cn(
                                    "py-1.5 rounded-lg text-center font-bold capitalize transition-all cursor-pointer",
                                    c.colorMode === mode
                                      ? "bg-white text-[#123B70] shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  )}
                                >
                                  {mode === "bw" ? "B/W" : mode === "color" ? "Color" : "Mixed"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Sides / Duplex */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5">
                              {currentLang === "hi" ? "प्रिंट साइड्स" : "Sides"}
                            </label>
                            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => updateDocumentConfig(doc.id, { sides: "single" })}
                                className={cn(
                                  "py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer",
                                  c.sides === "single"
                                    ? "bg-white text-[#123B70] shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                )}
                              >
                                Single
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDocumentConfig(doc.id, { sides: "double_long" })}
                                className={cn(
                                  "py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer",
                                  c.sides !== "single"
                                    ? "bg-white text-[#123B70] shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                )}
                              >
                                Double
                              </button>
                            </div>
                          </div>

                          {/* 3. Paper Size */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5">
                              {currentLang === "hi" ? "पेपर साइज" : "Paper Size"}
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                              {(["a4", "a3", "a5"] as PaperSize[]).map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => updateDocumentConfig(doc.id, { paperSize: sz })}
                                  className={cn(
                                    "py-1.5 rounded-lg text-center font-bold uppercase transition-all cursor-pointer",
                                    c.paperSize === sz
                                      ? "bg-white text-[#123B70] shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  )}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 4. Copies Counter */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1.5">
                              {currentLang === "hi" ? "प्रतियां (Copies)" : "Copies"}
                            </label>
                            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentConfig(doc.id, { copies: Math.max(1, c.copies - 1) })
                                }
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-extrabold text-slate-900 px-2">{c.copies}</span>
                              <button
                                type="button"
                                onClick={() => updateDocumentConfig(doc.id, { copies: c.copies + 1 })}
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Mixed Color Range Specification */}
                        {c.colorMode === "mixed" && (
                          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <label className="font-bold text-amber-900 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                <span>{currentLang === "hi" ? "कलर पेजों के नंबर दर्ज करें *" : "Specify Color Pages (e.g. 1, 4-7, 10) *"}</span>
                              </label>
                              <span className="text-[11px] font-bold text-amber-800">
                                🌈 {c.colorPageCount} Color • ⚫ {c.bwPageCount} B/W
                              </span>
                            </div>
                            <input
                              type="text"
                              value={c.colorPagesRange || ""}
                              onChange={(e) =>
                                updateDocumentConfig(doc.id, { colorPagesRange: e.target.value })
                              }
                              placeholder="e.g. 1, 3, 5-8"
                              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-900 font-mono focus:border-amber-500 focus:outline-hidden"
                            />
                            <p className="text-[11px] text-amber-700">
                              {currentLang === "hi"
                                ? "केवल निर्दिष्ट पेज फुल कलर में प्रिंट होंगे, बाकी पेज ब्लैक & व्हाइट में प्रिंट होंगे।"
                                : "Only specified pages will be printed in full color. Remaining pages will be printed in B/W to save cost."}
                            </p>
                          </div>
                        )}

                        {/* Custom Page Range (Print subset of document) */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          <span className="font-bold text-slate-700">
                            {currentLang === "hi" ? "पेज रेंज:" : "Page Range:"}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                              <input
                                type="radio"
                                name={`rangeType_${doc.id}`}
                                checked={c.pageRangeType === "all"}
                                onChange={() => updateDocumentConfig(doc.id, { pageRangeType: "all" })}
                                className="accent-[#123B70]"
                              />
                              <span>All Pages ({doc.pages !== null ? doc.pages : "..."})</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 ml-2">
                              <input
                                type="radio"
                                name={`rangeType_${doc.id}`}
                                checked={c.pageRangeType === "custom"}
                                onChange={() => updateDocumentConfig(doc.id, { pageRangeType: "custom" })}
                                className="accent-[#123B70]"
                              />
                              <span>Custom Range</span>
                            </label>
                          </div>

                          {c.pageRangeType === "custom" && (
                            <input
                              type="text"
                              value={c.customPageRange || ""}
                              onChange={(e) =>
                                updateDocumentConfig(doc.id, { customPageRange: e.target.value })
                              }
                              placeholder={doc.pages ? `e.g. 1-${doc.pages}` : "e.g. 1-10, 15"}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono w-32 focus:bg-white focus:border-[#123B70]"
                            />
                          )}
                        </div>

                        {/* Collapsible Advanced Finishing & Settings */}
                        <div className="border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setDocuments((prev) =>
                                prev.map((d) => (d.id === doc.id ? { ...d, isExpanded: !d.isExpanded } : d))
                              )
                            }
                            className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-600 hover:text-[#123B70] transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Settings2 className="h-3.5 w-3.5" />
                              <span>
                                {currentLang === "hi"
                                  ? "एडवांस्ड सेटिंग्स (GSM, बाइंडिंग, कवर्स, फिनिशिंग)"
                                  : "Advanced Options (Paper GSM, Binding, Covers & Finishing)"}
                              </span>
                            </span>
                            {doc.isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {doc.isExpanded && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-3 text-xs animate-in fade-in">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Paper GSM */}
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Paper Weight (GSM)
                                  </label>
                                  <select
                                    value={c.gsm}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        gsm: parseInt(e.target.value, 10) as PaperGSM,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-semibold"
                                  >
                                    <option value={70}>70 GSM (Standard Lightweight)</option>
                                    <option value={75}>75 GSM (Everyday Standard +₹0.20)</option>
                                    <option value={80}>80 GSM (Executive Quality +₹0.50)</option>
                                    <option value={100}>100 GSM (Heavyweight +₹1.00)</option>
                                    <option value={120}>120 GSM (Presentation Paper +₹2.00)</option>
                                    <option value={160}>160 GSM (Cardstock +₹4.00)</option>
                                    <option value={200}>200 GSM (Heavy Cardstock +₹6.00)</option>
                                    <option value={250}>250 GSM (Thick Artboard +₹8.00)</option>
                                  </select>
                                </div>

                                {/* Binding */}
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Binding Option
                                  </label>
                                  <select
                                    value={c.binding}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        binding: e.target.value as BindingType,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-semibold"
                                  >
                                    <option value="none">None (Loose Sheets)</option>
                                    <option value="staple">Corner / Saddle Staple (₹5)</option>
                                    <option value="spiral">Spiral Binding (₹30)</option>
                                    <option value="comb">Comb Binding (₹25)</option>
                                    <option value="soft">Soft Binding (₹80)</option>
                                    <option value="hard">Hard Binding (₹150)</option>
                                  </select>
                                </div>

                                {/* Orientation */}
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">
                                    Orientation
                                  </label>
                                  <select
                                    value={c.orientation}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        orientation: e.target.value as PrintOrientation,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-semibold"
                                  >
                                    <option value="auto">Auto (Match File)</option>
                                    <option value="portrait">Portrait (Vertical)</option>
                                    <option value="landscape">Landscape (Horizontal)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Covers and Finishing */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">Front Cover</label>
                                  <select
                                    value={c.frontCover}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        frontCover: e.target.value as CoverOption,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-semibold"
                                  >
                                    <option value="none">No Cover Sheet</option>
                                    <option value="transparent">Transparent Plastic Sheet (+₹10)</option>
                                    <option value="white">Opaque White Sheet (+₹10)</option>
                                    <option value="black">Matte Black Sheet (+₹15)</option>
                                    <option value="color">Color Card Sheet (+₹20)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-bold text-slate-700 mb-1">Back Cover</label>
                                  <select
                                    value={c.backCover}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        backCover: e.target.value as CoverOption,
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-800 font-semibold"
                                  >
                                    <option value="none">No Back Cover</option>
                                    <option value="transparent">Transparent Plastic Sheet (+₹10)</option>
                                    <option value="white">Opaque White Sheet (+₹10)</option>
                                    <option value="black">Matte Black Sheet (+₹15)</option>
                                    <option value="color">Color Card Sheet (+₹20)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Checkboxes: Lamination, Hole Punching, Booklet */}
                              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200/60">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(c.finishing?.lamination)}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        finishing: { ...c.finishing, lamination: e.target.checked },
                                      })
                                    }
                                    className="rounded text-[#123B70] accent-[#123B70]"
                                  />
                                  <span>Thermal Lamination (+₹15/sheet)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(c.finishing?.holePunching)}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        finishing: { ...c.finishing, holePunching: e.target.checked },
                                      })
                                    }
                                    className="rounded text-[#123B70] accent-[#123B70]"
                                  />
                                  <span>2/4 Hole Punching (+₹2/sheet)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(c.finishing?.bookletMode)}
                                    onChange={(e) =>
                                      updateDocumentConfig(doc.id, {
                                        finishing: { ...c.finishing, bookletMode: e.target.checked },
                                      })
                                    }
                                    className="rounded text-[#123B70] accent-[#123B70]"
                                  />
                                  <span>Booklet Fold & Saddle (+₹15)</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Batch Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <button
                            type="button"
                            onClick={() => applySettingsToAllDocuments(c)}
                            className="flex items-center gap-1 font-bold text-[#123B70] hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Apply this configuration to all files</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveAsDefault(c)}
                            className="flex items-center gap-1 font-bold text-amber-700 hover:underline"
                          >
                            <Bookmark className="h-3 w-3" />
                            <span>Save as my default preferences</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 3: Customer Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B70] text-white text-xs font-bold">
                    3
                  </span>
                  <span>{currentLang === "hi" ? "ग्राहक विवरण" : "Customer Details"}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Contact</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === "hi" ? "पूरा नाम *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === "hi" ? "मोबाइल नंबर *" : "Mobile Number *"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === "hi"
                      ? "विशेष निर्देश या बाइंडिंग नोट्स (वैकल्पिक)"
                      : "Special Instructions or Finishing Notes (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Please bind document #1 and #2 separately with blue covers."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-[#123B70] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </section>

            {/* Auth Gate Banner if not logged in */}
            {!user && (
              <OrderAuthGate
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                customerWhatsApp={customerWhatsApp}
                setCustomerWhatsApp={setCustomerWhatsApp}
                instructions={instructions}
                setInstructions={setInstructions}
              />
            )}
          </div>

          {/* Right 1 Column: Authoritative Order Summary & Payment */}
          <div className="space-y-6">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                  <Calculator className="h-5 w-5 text-[#123B70]" />
                  <span>{currentLang === "hi" ? "ऑर्डर सारांश" : "Order Summary"}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Live Snapshot
                </span>
              </div>

              {/* Order Stats Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "दस्तावेज संख्या:" : "Total Documents:"}</span>
                  <span className="font-bold text-slate-900">{orderSnapshot.totalDocuments} file(s)</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "कुल प्रिंट पेज:" : "Printed Pages:"}</span>
                  <span className="font-bold text-slate-900">
                    {hasAnalyzingDocs ? (
                      <span className="text-amber-600 font-semibold animate-pulse">⏳ Detecting...</span>
                    ) : hasFailedDocs ? (
                      <span className="text-rose-600 font-semibold">⚠️ Verification required</span>
                    ) : (
                      `${orderSnapshot.totalPrintedPages} pages`
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "कलर ब्रेकडाउन:" : "Color Breakdown:"}</span>
                  <span className="font-semibold text-slate-800">
                    {hasUnverifiedDocs ? (
                      <span className="text-slate-400 font-medium">Pending verification</span>
                    ) : (
                      `⚫ ${orderSnapshot.totalBwPages} B/W • 🌈 ${orderSnapshot.totalColorPages} Color`
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">{currentLang === "hi" ? "कागज की शीट (Physical Sheets):" : "Physical Sheets:"}</span>
                  <span className="font-bold text-slate-900">
                    {hasAnalyzingDocs ? (
                      <span className="text-amber-600 font-semibold animate-pulse">⏳ Detecting...</span>
                    ) : hasFailedDocs ? (
                      <span className="text-rose-600 font-semibold">⚠️ Verification required</span>
                    ) : (
                      `📑 ${orderSnapshot.totalPhysicalSheets} sheets`
                    )}
                  </span>
                </div>
              </div>

              {/* Document List in Summary */}
              {documents.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">
                    Document Breakdown
                  </span>
                  {documents.map((d, i) => (
                    <div key={d.id} className="flex justify-between items-center text-slate-700">
                      <span className="truncate max-w-[150px] font-medium">
                        #{i + 1} {d.name}
                      </span>
                      <span className="font-bold text-slate-900">
                        {d.pages !== null && d.metadata?.pageCountVerified
                          ? `₹${d.config.totalPrice.toFixed(2)}`
                          : "Calculating..."}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Mode Selection */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {currentLang === "hi" ? "भुगतान विधि चुनें" : "Select Payment Method"}
                </label>

                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setPaymentMethod("pay_at_shop")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      paymentMethod === "pay_at_shop"
                        ? "border-[#123B70] bg-blue-50/60 text-[#123B70] font-bold ring-1 ring-[#123B70]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === "pay_at_shop"}
                        onChange={() => setPaymentMethod("pay_at_shop")}
                        className="accent-[#123B70]"
                      />
                      <span>{currentLang === "hi" ? "दुकान पर भुगतान (Pay on Pickup)" : "Pay on Pickup (At Counter)"}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">Cash / UPI</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod("pay_online")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      paymentMethod === "pay_online"
                        ? "border-[#123B70] bg-blue-50/60 text-[#123B70] font-bold ring-1 ring-[#123B70]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === "pay_online"}
                        onChange={() => setPaymentMethod("pay_online")}
                        className="accent-[#123B70]"
                      />
                      <span>{currentLang === "hi" ? "तुरंत ऑनलाइन भुगतान (Razorpay UPI)" : "Instant Online Pay (Razorpay)"}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      Fastest
                    </span>
                  </label>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">
                  {currentLang === "hi" ? "कुल अनुमानित राशि" : "Estimated Total"}
                </span>
                <span className="text-2xl font-black text-[#123B70]">
                  {hasUnverifiedDocs ? (
                    <span className="text-sm text-slate-400 font-bold italic">Calculating...</span>
                  ) : (
                    `₹${orderSnapshot.grandTotal.toFixed(2)}`
                  )}
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
                disabled={
                  isStopped ||
                  hasUnverifiedDocs ||
                  (submissionState !== "IDLE" &&
                    submissionState !== "FAILED" &&
                    submissionState !== "CANCELLED")
                }
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-xs sm:text-sm font-extrabold shadow-card transition-all",
                  isStopped
                    ? "bg-slate-300 text-slate-600 border border-slate-300 cursor-not-allowed"
                    : hasUnverifiedDocs
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300"
                    : submissionState !== "IDLE" &&
                      submissionState !== "FAILED" &&
                      submissionState !== "CANCELLED"
                    ? "bg-[#123B70]/80 text-white cursor-wait"
                    : "bg-[#123B70] hover:bg-[#0c274c] disabled:opacity-50 text-white cursor-pointer"
                )}
              >
                {isStopped ? (
                  <span>
                    {currentLang === "hi"
                      ? "⚠️ सेवा अस्थायी रूप से बंद है (Service Unavailable)"
                      : "⚠️ Service Temporarily Unavailable"}
                  </span>
                ) : hasAnalyzingDocs ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                    <span>{currentLang === "hi" ? "दस्तावेज का विश्लेषण हो रहा है..." : "⏳ Analyzing Document Pages..."}</span>
                  </div>
                ) : hasFailedDocs ? (
                  <span>{currentLang === "hi" ? "⚠️ दस्तावेज सत्यापन आवश्यक" : "⚠️ Document Verification Required"}</span>
                ) : documents.length === 0 ? (
                  <span>{currentLang === "hi" ? "दस्तावेज अपलोड करें" : "Upload Document to Continue"}</span>
                ) : submissionState === "SUBMITTING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "ऑर्डर शुरू हो रहा है..." : "Submitting Order..."}</span>
                  </div>
                ) : submissionState === "VALIDATING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "सत्यापन हो रहा है..." : "Validating Settings..."}</span>
                  </div>
                ) : submissionState === "UPLOADING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>
                      {currentLang === "hi"
                        ? `अपलोड हो रहा है (${uploadSummary?.percent || 0}%)...`
                        : `Uploading Documents (${uploadSummary?.percent || 0}%)...`}
                    </span>
                  </div>
                ) : submissionState === "PROCESSING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "प्रिंट सेटिंग्स प्रोसेसिंग..." : "Processing Print Settings..."}</span>
                  </div>
                ) : submissionState === "ORDER_CREATING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "ऑर्डर दर्ज हो रहा है..." : "Creating Order..."}</span>
                  </div>
                ) : submissionState === "PAYMENT_PENDING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "भुगतान प्रक्रिया..." : "Opening Payment Gateway..."}</span>
                  </div>
                ) : submissionState === "PAYMENT_PROCESSING" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "भुगतान सत्यापित हो रहा है..." : "Verifying Payment..."}</span>
                  </div>
                ) : submissionState === "CANCEL_REQUESTED" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{currentLang === "hi" ? "रद्द हो रहा है..." : "Cancelling..."}</span>
                  </div>
                ) : (
                  <span>
                    {paymentMethod === "pay_online"
                      ? currentLang === "hi"
                        ? `तुरंत भुगतान करें (₹${orderSnapshot.grandTotal.toFixed(2)})`
                        : `Pay & Submit Order (₹${orderSnapshot.grandTotal.toFixed(2)})`
                      : currentLang === "hi"
                      ? "प्रिंट ऑर्डर दर्ज करें (Pay on Pickup)"
                      : "Confirm & Place Print Order"}
                  </span>
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

      {/* Live Order Processing Modal */}
      {submissionState !== "IDLE" && !successData?.isOpen && (
        <LiveOrderProcessingModal
          isOpen={true}
          submissionId={activeSubmissionId}
          orderCode={confirmedOrderCode}
          currentState={submissionState}
          paymentMethod={paymentMethod === "pay_online" ? "pay_online" : "pay_at_store"}
          timeline={timeline}
          filesProgress={filesProgress}
          uploadSummary={uploadSummary}
          orderSummary={{
            totalDocuments: documents.length,
            totalPrintedPages: orderSnapshot.totalPrintedPages,
            totalPhysicalSheets: orderSnapshot.totalPhysicalSheets,
            colorBreakdownText: `⚫ ${orderSnapshot.totalBwPages} B/W • 🌈 ${orderSnapshot.totalColorPages} Color`,
            duplexText: documents[0]?.config.sides !== "single" ? "Double-sided" : "Single-sided",
            paperSizeText: documents[0]?.config.paperSize.toUpperCase() || "A4",
            copies: documents[0]?.config.copies || 1,
            grandTotal: orderSnapshot.grandTotal,
            serviceName: "Document Printing",
            docTypeLabel: getDocTypeLabel(),
          }}
          errorMessage={submitError}
          onCancelRequest={handleCancelSubmission}
          onRetry={handleRetrySubmission}
          onClose={() => {
            setSubmissionState("IDLE");
            isSubmittingLockRef.current = false;
          }}
        />
      )}

      {/* Success Modal */}
      {successData && (
        <OrderSuccessModal
          isOpen={successData.isOpen}
          onClose={() => {
            setSuccessData(null);
            setDocuments([]);
            setFilesProgress([]);
            setUploadSummary(undefined);
            setConfirmedOrderCode(undefined);
            setSubmissionState("IDLE");
            setTimeline([]);
            setActiveSubmissionId(generateUniqueSubmissionId());
            clearActiveSubmissionSession();
            clearDocPrintSubmissionId();
            isSubmittingLockRef.current = false;
          }}
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
