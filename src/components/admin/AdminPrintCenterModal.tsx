import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Edit3,
  Eye,
  Layers,
  FileText,
  CreditCard,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { StoredOrder } from "../../lib/storage/store";
import { PalakDataStore } from "../../lib/storage/store";
import {
  type PrintJob,
  type PrintJobStatus,
  type DocumentPrintConfig,
  type AdminPrintOverride,
} from "../../types/printJob";
import {
  getPrintJobByOrderCode,
  createOrUpdatePrintJob,
  updatePrintJobStatus,
  addPrintJobOverride,
} from "../../lib/supabase/database";
import { printDocumentFile, downloadFile } from "../../lib/documentUtils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { cn } from "../../lib/utils";
import type {
  IdCardProject,
  IdCardPerson,
  IdCardTemplate,
  IdCardGeneration,
} from "../../lib/idcard/types";
import {
  getIdCardProjects,
  getIdCardProject,
  getIdCardTemplates,
  getAllIdCardPersons,
  getIdCardGenerations,
  markGenerationsAsPrinted,
} from "../../lib/idcard/database";
import {
  type PrintConfig,
  type PrintLayout,
  type CardPosition,
  DEFAULT_PRINT_CONFIG,
  calculatePrintLayout,
  buildSheetPdf,
  printSheetsInBrowser,
} from "../../lib/idcard/printLayoutEngine";
import { renderCardToDataUrl } from "../../lib/idcard/generation";

interface AdminPrintCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: StoredOrder | null;
  adminName?: string;
  onOrderUpdated?: () => void;
}

const STATUS_CONFIG: Record<
  PrintJobStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: { label: "Pending Print", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  READY_TO_PRINT: { label: "Ready to Print", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PRINTING: { label: "Printing in Progress", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  PRINTED: { label: "Printed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  QUALITY_CHECK: { label: "Quality Check", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  READY: { label: "Ready for Pickup", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  COMPLETED: { label: "Completed & Delivered", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  FAILED: { label: "Failed / Error", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" },
};

export const AdminPrintCenterModal: React.FC<AdminPrintCenterModalProps> = ({
  isOpen,
  onClose,
  order,
  adminName = "Admin Staff",
  onOrderUpdated,
}) => {
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"specs" | "overrides" | "audit">("specs");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  // Available & Selected ID Card Projects
  const [availableProjects, setAvailableProjects] = useState<IdCardProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [idCardProject, setIdCardProject] = useState<IdCardProject | null>(null);
  const [idCardTemplate, setIdCardTemplate] = useState<IdCardTemplate | null>(null);
  const [idCardPersons, setIdCardPersons] = useState<IdCardPerson[]>([]);
  const [idCardGenerations, setIdCardGenerations] = useState<IdCardGeneration[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const [cardImagesMap, setCardImagesMap] = useState<Map<string, { front?: string; back?: string }>>(new Map());
  const [isRenderingCards, setIsRenderingCards] = useState<boolean>(false);

  // ID Card Print Config
  const [idCardPrintConfig, setIdCardPrintConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);

  // Interactive Print Preview State
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewCurrentPage, setPreviewCurrentPage] = useState<number>(1);

  // Print Confirmation Modal State
  const [printConfirmModalOpen, setPrintConfirmModalOpen] = useState<boolean>(false);
  const [pendingPrintNotes, setPendingPrintNotes] = useState<string>("");

  // Override Modal State
  const [overrideTarget, setOverrideTarget] = useState<
    | { type: "doc"; doc: DocumentPrintConfig }
    | { type: "idcard" }
    | null
  >(null);
  const [overrideField, setOverrideField] = useState<string>("paperSize");
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [overrideSubmitting, setOverrideSubmitting] = useState<boolean>(false);

  useScrollLock(isOpen);
  useScrollLock(Boolean(overrideTarget) || previewOpen || printConfirmModalOpen);

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (overrideTarget) {
          setOverrideTarget(null);
        } else if (previewOpen) {
          setPreviewOpen(false);
        } else if (printConfirmModalOpen) {
          setPrintConfirmModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, overrideTarget, previewOpen, printConfirmModalOpen, onClose]);

  // Extract synthesized printable documents from order
  const synthesizedDocs: DocumentPrintConfig[] = useMemo(() => {
    if (!order) return [];

    // 1. If explicit print snapshot exists with documents, use them as primary
    if (order.printSnapshot?.documents && order.printSnapshot.documents.length > 0) {
      return order.printSnapshot.documents;
    }

    // 2. Otherwise synthesize from order.items
    const docs: DocumentPrintConfig[] = [];
    if (!Array.isArray(order.items)) return docs;

    order.items.forEach((item, itemIdx) => {
      const opts = item.selectedOptions || {};
      const prodName = item.productName || "Document";
      const isIdCard =
        item.productId?.toLowerCase().includes("id-card") ||
        item.productId?.toLowerCase().includes("id_card") ||
        prodName.toLowerCase().includes("id card");

      // Skip ID cards here if they are handled by the dedicated ID card batch engine
      if (isIdCard) return;

      const attachedFiles: Array<{ name: string; url: string; size?: number; mimeType?: string }> = [];

      if (item.uploadedFileName || item.uploadedFileUrl || opts.storagePath) {
        attachedFiles.push({
          name: item.uploadedFileName || `${prodName} - File 1`,
          url: item.uploadedFileUrl || opts.storagePath || "",
          size: opts.fileSize || opts.size,
          mimeType: opts.mimeType,
        });
      }

      if (Array.isArray(opts.files) && opts.files.length > 0) {
        opts.files.forEach((f: any, fIdx: number) => {
          const fUrl = f.url || f.storagePath || "";
          const fName = f.name || f.fileName || `${prodName} - File ${fIdx + 1}`;
          if (!attachedFiles.some((ex) => ex.name === fName && ex.url === fUrl)) {
            attachedFiles.push({
              name: fName,
              url: fUrl,
              size: f.size,
              mimeType: f.mimeType || f.type,
            });
          }
        });
      }

      const totalPages = Number(opts.totalPages) || Number(opts.pageCount) || 1;
      const copies = Number(item.quantity) || Number(opts.copies) || 1;
      const sides = (opts.sides === "double" ? "double_long" : (opts.sides || "single")) as any;
      const pagesPerSheet = Number(opts.pagesPerSheet) || 1;
      const physicalSheetsPerCopy = Math.ceil(totalPages / (sides === "single" ? 1 : 2) / pagesPerSheet);
      const totalPhysicalSheets = physicalSheetsPerCopy * copies;

      if (attachedFiles.length > 0) {
        attachedFiles.forEach((file, fIdx) => {
          docs.push({
            documentId: `doc_${order.id}_${itemIdx}_${fIdx}`,
            fileName: file.name,
            fileSize: file.size || 1024 * 1024,
            fileUrl: file.url,
            storagePath: file.url,
            mimeType: file.mimeType,
            totalPages,
            pageRangeType: "all",
            colorMode: (opts.colorMode as any) || (prodName.toLowerCase().includes("color") ? "color" : "bw"),
            copies,
            paperSize: (opts.paperSize?.toLowerCase() as any) || "a4",
            paperType: (opts.paperType as any) || "normal",
            gsm: (Number(opts.gsm) || 75) as any,
            orientation: (opts.orientation as any) || "auto",
            sides,
            pagesPerSheet: pagesPerSheet as any,
            scaling: "fit",
            binding: (opts.binding as any) || "none",
            frontCover: (opts.frontCover as any) || "none",
            backCover: (opts.backCover as any) || "none",
            finishing: opts.finishing || {},
            selectedPageCount: totalPages,
            bwPageCount: opts.colorMode === "color" ? 0 : totalPages,
            colorPageCount: opts.colorMode === "color" ? totalPages : 0,
            physicalSheetsPerCopy,
            totalPhysicalSheets,
            itemPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            priceBreakdown: {
              bwPrintCost: 0,
              colorPrintCost: 0,
              paperCost: 0,
              bindingCost: 0,
              frontCoverCost: 0,
              backCoverCost: 0,
              finishingCost: 0,
              costPerCopy: item.unitPrice || 0,
              totalCost: item.totalPrice || 0,
            },
          });
        });
      } else {
        // Synthesize a printable item description card
        docs.push({
          documentId: `item_${order.id}_${itemIdx}`,
          fileName: prodName,
          fileSize: 0,
          totalPages,
          pageRangeType: "all",
          colorMode: (opts.colorMode as any) || "color",
          copies,
          paperSize: (opts.paperSize?.toLowerCase() as any) || "a4",
          paperType: (opts.paperType as any) || "normal",
          gsm: (Number(opts.gsm) || 75) as any,
          orientation: (opts.orientation as any) || "auto",
          sides,
          pagesPerSheet: pagesPerSheet as any,
          scaling: "fit",
          binding: (opts.binding as any) || "none",
          frontCover: (opts.frontCover as any) || "none",
          backCover: (opts.backCover as any) || "none",
          finishing: opts.finishing || {},
          selectedPageCount: totalPages,
          bwPageCount: opts.colorMode === "bw" ? totalPages : 0,
          colorPageCount: opts.colorMode !== "bw" ? totalPages : 0,
          physicalSheetsPerCopy,
          totalPhysicalSheets,
          itemPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          priceBreakdown: {
            bwPrintCost: 0,
            colorPrintCost: 0,
            paperCost: 0,
            bindingCost: 0,
            frontCoverCost: 0,
            backCoverCost: 0,
            finishingCost: 0,
            costPerCopy: item.unitPrice || 0,
            totalCost: item.totalPrice || 0,
          },
        });
      }
    });

    return docs;
  }, [order]);

  // Apply active admin overrides to documents
  const documents: DocumentPrintConfig[] = useMemo(() => {
    if (!printJob?.overrides || printJob.overrides.length === 0) {
      return synthesizedDocs;
    }

    return synthesizedDocs.map((doc) => {
      const docOverrides = printJob.overrides.filter((o) => o.documentId === doc.documentId);
      if (docOverrides.length === 0) return doc;

      const overridden = { ...doc };
      for (const ovr of docOverrides) {
        if (ovr.field in overridden) {
          (overridden as any)[ovr.field] = ovr.actualValue;
        }
      }
      return overridden;
    });
  }, [synthesizedDocs, printJob?.overrides]);

  // Load Print Job & Discover Connected ID Card Projects
  const loadPrintJobData = useCallback(async () => {
    if (!order) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch PrintJob from database / local store
      const job = await getPrintJobByOrderCode(order.orderCode);
      if (job) {
        setPrintJob(job);
      } else {
        // Initialize print job
        const created = await createOrUpdatePrintJob({
          orderId: order.id,
          orderCode: order.orderCode,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          status: "PENDING",
          items: synthesizedDocs.map((d) => ({
            id: d.documentId || `doc_${Date.now()}`,
            documentId: d.documentId || `doc_${Date.now()}`,
            fileName: d.fileName,
            storagePath: d.storagePath || "",
            fileUrl: d.fileUrl || "",
            pageCount: d.selectedPageCount,
            colorMode: d.colorMode,
            colorPages: d.colorPageCount,
            bwPages: d.bwPageCount,
            copies: d.copies,
            paperSize: d.paperSize,
            paperType: d.paperType,
            gsm: d.gsm,
            orientation: d.orientation,
            sides: d.sides,
            pagesPerSheet: d.pagesPerSheet,
            scaling: d.scaling,
            binding: d.binding,
            frontCover: d.frontCover,
            backCover: d.backCover,
            finishing: d.finishing || {},
            status: "QUEUED",
          })),
          createdByName: adminName,
        });
        setPrintJob(created);
      }

      // 2. Discover available ID Card Projects
      try {
        const projects = await getIdCardProjects();
        setAvailableProjects(projects);

        // Check if any order item explicitly references an ID card project
        let matchingProjectId: string | null = null;
        for (const item of order.items || []) {
          const opts = item.selectedOptions || {};
          if (opts.projectId || opts.idCardProjectId) {
            matchingProjectId = opts.projectId || opts.idCardProjectId;
            break;
          }
          if (
            item.productId?.toLowerCase().includes("id-card") ||
            item.productName?.toLowerCase().includes("id card")
          ) {
            // Find project by name or customer name if matching
            const found = projects.find(
              (p) =>
                p.name.toLowerCase().includes(order.customerName.toLowerCase()) ||
                order.customerName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (found) {
              matchingProjectId = found.id;
              break;
            }
          }
        }

        // If no direct link found but projects exist and order is ID card, default to first active project
        if (!matchingProjectId && projects.length > 0) {
          const hasIdCardItem = (order.items || []).some(
            (i) =>
              i.productId?.toLowerCase().includes("id-card") ||
              i.productName?.toLowerCase().includes("id card")
          );
          if (hasIdCardItem) {
            matchingProjectId = projects[0].id;
          }
        }

        setSelectedProjectId(matchingProjectId);
      } catch (projErr) {
        console.warn("[AdminPrintCenter] ID Card projects lookup note:", projErr);
      }
    } catch (err: any) {
      console.error("[AdminPrintCenter] Failed to load print center data:", err);
      setErrorMessage(err?.message || "Failed to load print center specifications.");
    } finally {
      setLoading(false);
    }
  }, [order, adminName, synthesizedDocs]);

  useEffect(() => {
    if (isOpen && order) {
      loadPrintJobData();
    } else {
      setPrintJob(null);
      setErrorMessage(null);
      setSelectedProjectId(null);
      setIdCardProject(null);
      setIdCardTemplate(null);
      setIdCardPersons([]);
      setCardImagesMap(new Map());
    }
  }, [isOpen, order?.orderCode, loadPrintJobData]);

  // Load ID Card Project Data when selected
  useEffect(() => {
    if (!selectedProjectId) {
      setIdCardProject(null);
      setIdCardTemplate(null);
      setIdCardPersons([]);
      setIdCardGenerations([]);
      setSelectedPersonIds(new Set());
      setCardImagesMap(new Map());
      return;
    }

    let isMounted = true;
    const fetchProjectDetails = async () => {
      try {
        const [proj, templates, persons, gens] = await Promise.all([
          getIdCardProject(selectedProjectId),
          getIdCardTemplates(selectedProjectId),
          getAllIdCardPersons(selectedProjectId),
          getIdCardGenerations(selectedProjectId),
        ]);

        if (!isMounted) return;

        setIdCardProject(proj);
        const template = proj.template_id ? (templates.find((t) => t.id === proj.template_id) || null) : null;
        setIdCardTemplate(template);
        setIdCardPersons(persons);
        setIdCardGenerations(gens);
        setSelectedPersonIds(new Set(persons.map((p) => p.id)));

        // Update ID Card dimensions from template if present
        if (template) {
          setIdCardPrintConfig((prev) => ({
            ...prev,
            cardWidthMm: template.card_width_mm || 85.6,
            cardHeightMm: template.card_height_mm || 54,
            printMode: template.layout.isDoubleSided ? "front-back-together" : "front-only",
          }));
        }
      } catch (err) {
        console.warn("[AdminPrintCenter] Error loading ID card project details:", err);
      }
    };

    fetchProjectDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // Pre-render ID Card faces into cached Data URLs
  const ensureCardImagesRendered = useCallback(async (): Promise<Map<string, { front?: string; back?: string }>> => {
    if (!idCardProject || !idCardTemplate || idCardPersons.length === 0) {
      return new Map();
    }

    setIsRenderingCards(true);
    const newMap = new Map<string, { front?: string; back?: string }>(cardImagesMap);

    const personsToRender = idCardPersons.filter((p) => selectedPersonIds.has(p.id));

    try {
      for (const person of personsToRender) {
        if (!newMap.has(person.id)) {
          // Check if generation already has a file_url
          const gen = idCardGenerations.find((g) => g.person_id === person.id && g.status === "SUCCESS");
          let frontUrl = gen?.file_url || "";
          let backUrl: string | undefined = undefined;

          if (!frontUrl) {
            frontUrl = await renderCardToDataUrl(
              person,
              idCardTemplate,
              idCardProject.name,
              idCardProject.academic_year,
              "front"
            );
          }

          if (idCardTemplate.layout.isDoubleSided || idCardTemplate.layout.back) {
            backUrl = await renderCardToDataUrl(
              person,
              idCardTemplate,
              idCardProject.name,
              idCardProject.academic_year,
              "back"
            );
          }

          newMap.set(person.id, { front: frontUrl, back: backUrl });
        }
      }
      setCardImagesMap(newMap);
      return newMap;
    } finally {
      setIsRenderingCards(false);
    }
  }, [idCardProject, idCardTemplate, idCardPersons, selectedPersonIds, cardImagesMap, idCardGenerations]);

  // Calculate authoritative ID Card Sheet Layout
  const idCardPrintLayout: PrintLayout | null = useMemo(() => {
    if (!idCardProject || idCardPersons.length === 0 || selectedPersonIds.size === 0) {
      return null;
    }

    const cardInputs = idCardPersons
      .filter((p) => selectedPersonIds.has(p.id))
      .map((p) => ({
        personId: p.id,
        hasBack: Boolean(idCardTemplate?.layout.isDoubleSided || idCardTemplate?.layout.back),
      }));

    return calculatePrintLayout(idCardPrintConfig, cardInputs);
  }, [idCardProject, idCardPersons, selectedPersonIds, idCardTemplate, idCardPrintConfig]);

  // Total summary calculations
  const totalSummary = useMemo(() => {
    const docFilesCount = documents.length;
    const idCardsCount = idCardProject ? selectedPersonIds.size : 0;
    const totalPrintedPages = documents.reduce((acc, d) => acc + (d.selectedPageCount * d.copies), 0);
    const totalSheets =
      documents.reduce((acc, d) => acc + d.totalPhysicalSheets, 0) +
      (idCardPrintLayout?.totalSheets || 0);

    const bwPages = documents.reduce((acc, d) => acc + (d.bwPageCount * d.copies), 0);
    const colorPages = documents.reduce((acc, d) => acc + (d.colorPageCount * d.copies), 0) + idCardsCount;

    return {
      docFilesCount,
      idCardsCount,
      totalItems: docFilesCount + (idCardProject ? 1 : 0),
      totalPrintedPages: totalPrintedPages + (idCardsCount * (idCardTemplate?.layout.isDoubleSided ? 2 : 1)),
      totalSheets,
      bwPages,
      colorPages,
      orderAmount: order?.totalAmount || 0,
    };
  }, [documents, idCardProject, selectedPersonIds, idCardPrintLayout, idCardTemplate, order]);

  // Handle status transition
  const handleStatusChange = async (newStatus: PrintJobStatus, notes?: string) => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await updatePrintJobStatus(order.orderCode, newStatus, adminName, notes);
      if (!res.success) {
        alert(res.error || `Failed to transition status to ${newStatus}`);
        setLoading(false);
        return;
      }

      // If transition to COMPLETED, sync order status in store
      if (newStatus === "COMPLETED") {
        PalakDataStore.updateOrderStatus(order.orderCode, "COMPLETED", `Order completed via Print Center by ${adminName}`);
      } else if (newStatus === "READY") {
        PalakDataStore.updateOrderStatus(order.orderCode, "READY_FOR_PICKUP", `Print completed and packed by ${adminName}`);
      } else if (newStatus === "PRINTED") {
        PalakDataStore.updateOrderStatus(order.orderCode, "IN_PRODUCTION", `Documents printed by ${adminName}`);
      }

      const updated = await getPrintJobByOrderCode(order.orderCode);
      setPrintJob(updated);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      alert(`Status transition error: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Open interactive Print Preview
  const handleOpenPrintPreview = async () => {
    if (totalSummary.totalItems === 0) {
      alert("No printable documents or ID cards attached to this order.");
      return;
    }

    if (idCardProject) {
      await ensureCardImagesRendered();
    }
    setPreviewCurrentPage(1);
    setPreviewOpen(true);
  };

  // Trigger Physical Browser Print
  const handlePrintAll = async () => {
    if (totalSummary.totalItems === 0) {
      alert("No documents or ID cards attached to this order.");
      return;
    }

    setIsProcessing(true);
    setPrintFeedback("Preparing physical print stream...");

    try {
      let printedAnything = false;

      // 1. Print ID cards if present
      if (idCardProject && idCardPrintLayout) {
        const images = await ensureCardImagesRendered();
        setPrintFeedback(`Dispatching ${selectedPersonIds.size} ID cards on ${idCardPrintLayout.totalSheets} sheet(s)...`);
        const printed = await printSheetsInBrowser(
          idCardPrintLayout,
          images,
          `${idCardProject.name} ID Cards (${order?.orderCode})`
        );
        if (printed) printedAnything = true;
      }

      // 2. Print Document Files
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const urlToUse = doc.fileUrl || doc.storagePath;
        if (!urlToUse) continue;

        setPrintFeedback(`Printing file ${i + 1} of ${documents.length}: ${doc.fileName}...`);
        try {
          await printDocumentFile(urlToUse, doc.fileName, doc.mimeType);
          printedAnything = true;
        } catch (docErr) {
          console.warn(`Print failure for ${doc.fileName}:`, docErr);
        }
      }

      if (printedAnything) {
        setPrintFeedback("Sent to print dialogue. Please confirm printing below.");
        setPendingPrintNotes(`Physical print initiated by ${adminName} for ${totalSummary.totalItems} item(s)`);
        setPrintConfirmModalOpen(true);
      }
    } catch (err: any) {
      setPrintFeedback(`Print error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm Print Results (Mark Printed vs Keep Status)
  const handleConfirmPrintSuccess = async (success: boolean) => {
    setPrintConfirmModalOpen(false);
    if (!order) return;

    if (success) {
      setLoading(true);
      try {
        // If ID cards were printed, mark generations in database
        if (idCardProject && idCardGenerations.length > 0) {
          const genIdsToMark = idCardGenerations
            .filter((g) => selectedPersonIds.has(g.person_id))
            .map((g) => g.id);
          await markGenerationsAsPrinted(genIdsToMark);
        }

        await handleStatusChange("PRINTED", pendingPrintNotes || `Marked printed by ${adminName}`);
        setPrintFeedback("✓ Documents successfully printed and status updated to PRINTED.");
      } catch (err: any) {
        alert(`Failed to update print status: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setPrintFeedback("Print status unchanged.");
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (totalSummary.totalItems === 0) {
      alert("No printable items available to download.");
      return;
    }

    setIsProcessing(true);
    setPrintFeedback("Generating authoritative PDF...");

    try {
      if (idCardProject && idCardPrintLayout) {
        const images = await ensureCardImagesRendered();
        const pdfBlob = await buildSheetPdf(idCardPrintLayout, images, {
          title: `${idCardProject.name}_ID_Cards`,
        });
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${idCardProject.name.replace(/\s+/g, "_")}_Sheets.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      }

      // Also trigger downloads for attached documents if user desires
      for (const doc of documents) {
        if (doc.fileUrl || doc.storagePath) {
          await downloadFile(doc.fileUrl || doc.storagePath!, doc.fileName);
        }
      }

      setPrintFeedback("✓ PDF download complete.");
    } catch (err: any) {
      setPrintFeedback(`PDF download error: ${err.message}`);
      alert("Failed to build PDF. Please check your data and retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const cleanReason = overrideReason.trim();
    if (cleanReason.length < 3) {
      alert("Please provide a valid reason (at least 3 characters) for the override.");
      return;
    }

    setOverrideSubmitting(true);
    try {
      if (overrideTarget?.type === "doc") {
        const doc = overrideTarget.doc;
        const reqVal = (doc as any)[overrideField];

        const overrideObj: AdminPrintOverride = {
          id: `ovr_${Date.now()}`,
          documentId: doc.documentId,
          fileName: doc.fileName,
          field: overrideField,
          requestedValue: reqVal,
          actualValue: overrideValue,
          changedBy: adminName,
          changedAt: new Date().toISOString(),
          reason: cleanReason,
        };

        const res = await addPrintJobOverride(order.orderCode, overrideObj, adminName);
        if (res.success) {
          const updated = await getPrintJobByOrderCode(order.orderCode);
          setPrintJob(updated);
          setOverrideTarget(null);
          setOverrideReason("");
          setOverrideValue("");
          if (onOrderUpdated) onOrderUpdated();
        } else {
          alert(res.error || "Failed to record override.");
        }
      } else if (overrideTarget?.type === "idcard") {
        // ID Card setting override
        const reqVal = (idCardPrintConfig as any)[overrideField];
        let parsedVal: any = overrideValue;
        if (["cardWidthMm", "cardHeightMm", "gapHorizontalMm", "gapVerticalMm", "marginTopMm", "marginBottomMm", "marginLeftMm", "marginRightMm"].includes(overrideField)) {
          parsedVal = Number(overrideValue);
        }

        setIdCardPrintConfig((prev) => ({
          ...prev,
          [overrideField]: parsedVal,
        }));

        const overrideObj: AdminPrintOverride = {
          id: `ovr_idcard_${Date.now()}`,
          documentId: idCardProject?.id || "idcard_batch",
          fileName: `${idCardProject?.name || "ID Cards"} Settings`,
          field: overrideField,
          requestedValue: reqVal,
          actualValue: parsedVal,
          changedBy: adminName,
          changedAt: new Date().toISOString(),
          reason: cleanReason,
        };

        await addPrintJobOverride(order.orderCode, overrideObj, adminName);
        const updated = await getPrintJobByOrderCode(order.orderCode);
        setPrintJob(updated);
        setOverrideTarget(null);
        setOverrideReason("");
        setOverrideValue("");
      }
    } catch (err: any) {
      alert(`Override error: ${err.message}`);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const currentStatus = printJob?.status || "PENDING";
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;

  if (!isOpen || !order || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-2.5 sm:p-4 md:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Print Center"
    >
      <div
        className="flex flex-col w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#123B70] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white font-bold">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Admin Print Center</h2>
                <span className="rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-xs font-bold font-mono">
                  {order.orderCode}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Customer: <span className="font-bold text-white">{order.customerName}</span> ({order.customerPhone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold border",
                statusInfo.bg,
                statusInfo.text,
                statusInfo.border
              )}
            >
              {statusInfo.label}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
          {/* Quick Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("specs")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeTab === "specs"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              📄 Document Specifications ({totalSummary.totalItems})
            </button>
            <button
              onClick={() => setActiveTab("overrides")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeTab === "overrides"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              ⚙️ Admin Overrides ({printJob?.overrides?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeTab === "audit"
                  ? "bg-white text-[#123B70] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              📋 Audit Trail ({printJob?.auditLogs?.length || 0})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPrintPreview}
              disabled={isProcessing || totalSummary.totalItems === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#123B70] border border-slate-300 hover:bg-slate-50 text-xs font-extrabold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Eye className="h-4 w-4 text-blue-600" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isProcessing || totalSummary.totalItems === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 text-xs font-extrabold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrintAll}
              disabled={isProcessing || totalSummary.totalItems === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{isProcessing ? "Processing..." : "🖨️ PRINT ALL DOCUMENTS"}</span>
            </button>
          </div>
        </div>

        {printFeedback && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-xs font-bold text-[#123B70] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{printFeedback}</span>
            </div>
            <button onClick={() => setPrintFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm font-semibold gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-[#123B70]" />
              <span>Loading document specifications & layout...</span>
            </div>
          )}

          {errorMessage && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={loadPrintJobData}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tab 1: Document Specifications */}
          {activeTab === "specs" && !loading && (
            <div className="space-y-6">
              {/* Order Overview Summary */}
              {totalSummary.totalItems > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Printable Documents</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {totalSummary.docFilesCount} file(s) {idCardProject ? `+ ${totalSummary.idCardsCount} ID Cards` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Printed Pages/Cards</span>
                    <span className="font-extrabold text-slate-900 text-sm">{totalSummary.totalPrintedPages} units</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">B/W vs Color</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ⚫ {totalSummary.bwPages} / 🌈 {totalSummary.colorPages}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Physical Sheets</span>
                    <span className="font-extrabold text-slate-900 text-sm">📑 {totalSummary.totalSheets} sheets</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Order Value</span>
                    <span className="font-extrabold text-emerald-700 text-sm">₹{totalSummary.orderAmount.toFixed(2)}</span>
                  </div>
                </div>
              ) : null}

              {/* ID Card Project Section */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-700" />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Universal ID Card Printing Workflow
                      </h3>
                      <p className="text-xs text-slate-500">
                        {idCardProject
                          ? `Project: ${idCardProject.name} (${idCardProject.academic_year}) • ${idCardPersons.length} Student(s)`
                          : "Connect or select an ID card project for this order"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProjectId || ""}
                      onChange={(e) => setSelectedProjectId(e.target.value || null)}
                      className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <option value="">-- Select ID Card Project --</option>
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.academic_year})
                        </option>
                      ))}
                    </select>

                    {idCardProject && (
                      <button
                        onClick={() => {
                          setOverrideTarget({ type: "idcard" });
                          setOverrideField("paperSize");
                          setOverrideValue(idCardPrintConfig.paperSize);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Layout Settings</span>
                      </button>
                    )}
                  </div>
                </div>

                {idCardProject ? (
                  <div className="space-y-4">
                    {/* ID Card Specs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                        <span className="text-slate-400 font-semibold block">Card Dimensions</span>
                        <span className="font-extrabold text-slate-900">
                          {idCardPrintConfig.cardWidthMm} × {idCardPrintConfig.cardHeightMm} mm
                        </span>
                        <span className="text-[11px] text-indigo-700 font-bold block mt-0.5">
                          Standard ISO PVC Size
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                        <span className="text-slate-400 font-semibold block">Paper & Sheet Format</span>
                        <span className="font-extrabold text-slate-900 uppercase">
                          {idCardPrintConfig.paperSize} ({idCardPrintLayout?.paperWidthMm} × {idCardPrintLayout?.paperHeightMm} mm)
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 capitalize">
                          {idCardPrintLayout?.orientation} Orientation
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                        <span className="text-slate-400 font-semibold block">Print Mode & Flip</span>
                        <span className="font-extrabold text-slate-900 capitalize">
                          {idCardPrintConfig.printMode.replace(/-/g, " ")}
                        </span>
                        <div className="text-[11px] text-slate-600 font-semibold block mt-0.5">
                          {idCardPrintConfig.printMode === "duplex" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-900">
                              Duplex: {idCardPrintConfig.duplexFlip === "long-edge" ? "Long Edge" : "Short Edge"}
                            </span>
                          ) : idCardPrintConfig.printMode === "front-back-together" ? (
                            "Front + Back Together"
                          ) : (
                            "Front Only"
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                        <span className="text-slate-400 font-semibold block">Capacity & Calculated Sheets</span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {idCardPrintLayout?.cardsPerPage || 0} cards/page
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          📑 {idCardPrintLayout?.totalSheets || 0} physical sheet(s) total
                        </span>
                      </div>
                    </div>

                    {/* Student Selection Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Selected Cards to Print:</span>
                        <span className="font-extrabold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md">
                          {selectedPersonIds.size} of {idCardPersons.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPersonIds(new Set(idCardPersons.map((p) => p.id)))}
                          className="px-2 py-1 rounded bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedPersonIds(new Set())}
                          className="px-2 py-1 rounded bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-2 text-center">
                    No ID card project currently associated with this order. Use the dropdown above to link a project.
                  </div>
                )}
              </div>

              {/* Standard Document Breakdown List */}
              {documents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <span>Attached Document Files ({documents.length})</span>
                  </h3>

                  {documents.map((doc, idx) => {
                    const overridesForDoc = printJob?.overrides?.filter((o) => o.documentId === doc.documentId) || [];

                    return (
                      <div
                        key={doc.documentId || idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                      >
                        {/* Doc Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#123B70] text-xs font-bold">
                              #{idx + 1}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 truncate max-w-md">
                              {doc.fileName}
                            </h4>
                            <span className="text-xs text-slate-400 font-normal">
                              ({(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.totalPages} doc pages)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.fileUrl && (
                              <button
                                onClick={() => printDocumentFile(doc.fileUrl!, doc.fileName, doc.mimeType)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#123B70] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print File</span>
                              </button>
                            )}
                            {doc.fileUrl && (
                              <button
                                onClick={() => downloadFile(doc.fileUrl!, doc.fileName)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setOverrideTarget({ type: "doc", doc });
                                setOverrideField("paperSize");
                                setOverrideValue(doc.paperSize);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Override Settings</span>
                            </button>
                          </div>
                        </div>

                        {/* Specs Matrix */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Color Mode</span>
                            <span className="font-extrabold text-slate-900 capitalize">
                              {doc.colorMode === "bw"
                                ? "⚫ Black & White"
                                : doc.colorMode === "color"
                                ? "🌈 Full Color"
                                : `🎨 Mixed (${doc.colorPageCount} Color, ${doc.bwPageCount} B/W)`}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Sides & Layout</span>
                            <span className="font-extrabold text-slate-900 capitalize">
                              {doc.sides === "single"
                                ? "1️⃣ Single-Sided"
                                : doc.sides === "double_long"
                                ? "🔄 Double (Long Edge)"
                                : "🔃 Double (Short Edge)"}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {doc.pagesPerSheet || 1} page(s) per sheet side
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Paper & Weight</span>
                            <span className="font-extrabold text-slate-900 uppercase">
                              {doc.paperSize} • {doc.gsm} GSM
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5 capitalize">
                              {doc.paperType} Paper • {doc.orientation}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-semibold block">Copies & Sheets</span>
                            <span className="font-extrabold text-slate-900">
                              {doc.copies} Copy/Copies
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                              📑 {doc.totalPhysicalSheets} sheets total
                            </span>
                          </div>
                        </div>

                        {/* Finishing & Covers */}
                        {(doc.binding !== "none" ||
                          doc.frontCover !== "none" ||
                          doc.backCover !== "none" ||
                          doc.finishing?.lamination ||
                          doc.finishing?.holePunching ||
                          doc.finishing?.bookletMode) && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                            <span className="text-slate-400 font-bold text-[11px]">FINISHING:</span>
                            {doc.binding !== "none" && (
                              <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-bold capitalize">
                                🔗 {doc.binding} Binding
                              </span>
                            )}
                            {doc.frontCover !== "none" && (
                              <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-bold capitalize">
                                📘 Front: {doc.frontCover}
                              </span>
                            )}
                            {doc.backCover !== "none" && (
                              <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 font-bold capitalize">
                                📙 Back: {doc.backCover}
                              </span>
                            )}
                            {doc.finishing?.lamination && (
                              <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-bold">
                                ✨ Thermal Lamination
                              </span>
                            )}
                            {doc.finishing?.holePunching && (
                              <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 font-bold">
                                ⚪ Hole Punching
                              </span>
                            )}
                            {doc.finishing?.bookletMode && (
                              <span className="rounded-md bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 font-bold">
                                📖 Booklet Fold
                              </span>
                            )}
                          </div>
                        )}

                        {/* Overrides indicator */}
                        {overridesForDoc.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <span className="font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span>Active Admin Overrides for this document ({overridesForDoc.length}):</span>
                            </span>
                            {overridesForDoc.map((ovr) => (
                              <div key={ovr.id} className="text-[11px] pl-4">
                                • <span className="font-semibold">{ovr.field}</span>: Requested "
                                <span className="line-through text-slate-500">{String(ovr.requestedValue)}</span>" →
                                Set to "<span className="font-bold text-amber-950">{String(ovr.actualValue)}</span>"
                                (Reason: {ovr.reason} by {ovr.changedBy})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {totalSummary.totalItems === 0 && !idCardProject && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs space-y-3">
                  <p className="font-semibold">No print specifications have been configured for this order.</p>
                  <p className="text-slate-400">
                    If this order requires ID cards, choose a project from the selector above to configure specifications.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Admin Overrides */}
          {activeTab === "overrides" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Override Audit Log ({printJob?.overrides?.length || 0})
                </h3>
                <span className="text-xs text-slate-400">
                  All adjustments preserve the customer's original requested configuration.
                </span>
              </div>

              {printJob?.overrides && printJob.overrides.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {printJob.overrides.map((ovr) => (
                    <div key={ovr.id} className="p-4 bg-white hover:bg-slate-50 transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ovr.fileName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(ovr.changedAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Field: <span className="font-bold text-blue-900 font-mono">{ovr.field}</span> | Requested:{" "}
                        <span className="font-semibold text-slate-500 line-through">{String(ovr.requestedValue)}</span>{" "}
                        → Actual: <span className="font-bold text-emerald-700">{String(ovr.actualValue)}</span>
                      </div>
                      <div className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-semibold">Reason:</span> {ovr.reason} (by{" "}
                        <span className="font-bold text-slate-900">{ovr.changedBy}</span>)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No admin overrides have been applied. All print configurations reflect standard values.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Full Audit Trail */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Action & Lifecycle History ({printJob?.auditLogs?.length || 0})
              </h3>

              {printJob?.auditLogs && printJob.auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {printJob.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{log.notes}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Performed by: <span className="font-semibold text-slate-700">{log.performedBy}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No audit entries recorded yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Lifecycle Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Job Status Progression:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleStatusChange("READY_TO_PRINT", `Marked Ready to Print by ${adminName}`)}
              disabled={currentStatus === "READY_TO_PRINT" || currentStatus === "COMPLETED"}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              Ready to Print
            </button>
            <button
              onClick={() => handleStatusChange("PRINTED", `Marked Printed by ${adminName}`)}
              disabled={currentStatus === "PRINTED" || currentStatus === "COMPLETED"}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              Mark Printed
            </button>
            <button
              onClick={() => {
                if (currentStatus !== "PRINTED" && currentStatus !== "QUALITY_CHECK" && currentStatus !== "READY") {
                  if (!confirm("Documents have not been confirmed as PRINTED yet. Proceed with Quality Check?")) return;
                }
                handleStatusChange("QUALITY_CHECK", `Quality Check Passed by ${adminName}`);
              }}
              disabled={currentStatus === "QUALITY_CHECK" || currentStatus === "COMPLETED"}
              className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              Quality Check Pass
            </button>
            <button
              onClick={() => handleStatusChange("READY", `Marked Ready for Customer Pickup by ${adminName}`)}
              disabled={currentStatus === "READY" || currentStatus === "COMPLETED"}
              className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              Ready for Pickup
            </button>
            <button
              onClick={() => {
                if (currentStatus !== "READY" && currentStatus !== "QUALITY_CHECK" && currentStatus !== "PRINTED") {
                  if (!confirm("Order has not finished standard print & QC progression. Complete order now?")) return;
                }
                handleStatusChange("COMPLETED", `Order Delivered / Completed by ${adminName}`);
              }}
              disabled={currentStatus === "COMPLETED"}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              Complete Order
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sheet Print Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col h-screen animate-in fade-in">
          {/* Header Bar */}
          <div className="flex-none bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#123B70]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {idCardProject ? `${idCardProject.name} — Sheet Print Preview` : "Document Print Preview"}
                </h3>
              </div>

              {idCardPrintLayout && idCardPrintLayout.pages.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-700">
                  <button
                    onClick={() => setPreviewCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={previewCurrentPage <= 1}
                    className="p-1 hover:bg-white rounded disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    Sheet {previewCurrentPage} of {idCardPrintLayout.pages.length}
                  </span>
                  <button
                    onClick={() => setPreviewCurrentPage((p) => Math.min(idCardPrintLayout.pages.length, p + 1))}
                    disabled={previewCurrentPage >= idCardPrintLayout.pages.length}
                    className="p-1 hover:bg-white rounded disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={() => {
                  setPreviewOpen(false);
                  handlePrintAll();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Proceed to Physical Print</span>
              </button>

              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start bg-slate-900/60">
            {idCardPrintLayout && idCardPrintLayout.pages[previewCurrentPage - 1] ? (
              <div className="flex flex-col items-center space-y-4">
                <div
                  className="bg-white shadow-2xl rounded-sm relative overflow-hidden transition-all"
                  style={{
                    width: `${idCardPrintLayout.paperWidthMm * 2.8}px`,
                    height: `${idCardPrintLayout.paperHeightMm * 2.8}px`,
                  }}
                >
                  {idCardPrintLayout.pages[previewCurrentPage - 1].cards.map((card: CardPosition, cIdx: number) => {
                    const person = idCardPersons.find((p) => p.id === card.personId);
                    const urls = cardImagesMap.get(card.personId);
                    const img = card.side === "front" ? urls?.front : urls?.back;

                    return (
                      <div
                        key={cIdx}
                        className="absolute flex items-center justify-center bg-slate-50 overflow-hidden"
                        style={{
                          left: `${card.xMm * 2.8}px`,
                          top: `${card.yMm * 2.8}px`,
                          width: `${idCardPrintLayout.cardWidthMm * 2.8}px`,
                          height: `${idCardPrintLayout.cardHeightMm * 2.8}px`,
                          border: idCardPrintLayout.showCutGuides ? "0.5px dashed #94a3b8" : "none",
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={`${person?.name || "Card"} ${card.side}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center px-1">
                            {isRenderingCards ? "Rendering..." : person?.name || "Card"}
                            <br />
                            ({card.side})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-300 text-center">
                  Sheet format: <span className="font-bold uppercase text-white">{idCardPrintConfig.paperSize}</span> • Physical Size:{" "}
                  <span className="font-bold text-white">
                    {idCardPrintLayout.paperWidthMm} × {idCardPrintLayout.paperHeightMm} mm
                  </span>{" "}
                  • Card Size:{" "}
                  <span className="font-bold text-white">
                    {idCardPrintLayout.cardWidthMm} × {idCardPrintLayout.cardHeightMm} mm
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-white space-y-2 py-12">
                <p className="text-sm font-bold">Standard Document Preview</p>
                <p className="text-xs text-slate-300">
                  {documents.length} document(s) ready for physical output.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-Print Confirmation Modal */}
      {printConfirmModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Confirm Physical Print Result</h3>
                <p className="text-xs text-slate-500">Did all documents send and print successfully on your machine?</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>• Clicking "Yes, Mark Printed" will advance the order status and record an audit log.</p>
              <p>• Clicking "No, Keep Current Status" will preserve the existing status for re-print.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmPrintSuccess(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                No, Keep Current Status
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPrintSuccess(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Mark Printed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmitOverride}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {overrideTarget.type === "idcard" ? "ID Card Layout Override" : "Document Setting Override"}
              </h3>
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Override machine setting for:{" "}
              <span className="font-bold text-slate-900">
                {overrideTarget.type === "idcard"
                  ? `${idCardProject?.name || "ID Card"} Print Layout`
                  : overrideTarget.doc.fileName}
              </span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Field to Override</label>
                {overrideTarget.type === "idcard" ? (
                  <select
                    value={overrideField}
                    onChange={(e) => {
                      setOverrideField(e.target.value);
                      setOverrideValue(String((idCardPrintConfig as any)[e.target.value] ?? ""));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="paperSize">Paper Size (a4, a5)</option>
                    <option value="paperOrientation">Paper Orientation (auto, portrait, landscape)</option>
                    <option value="cardWidthMm">Card Width in mm (e.g. 85.6)</option>
                    <option value="cardHeightMm">Card Height in mm (e.g. 54)</option>
                    <option value="gapHorizontalMm">Horizontal Gap in mm (e.g. 2)</option>
                    <option value="gapVerticalMm">Vertical Gap in mm (e.g. 2)</option>
                    <option value="marginTopMm">Margin Top in mm (e.g. 10)</option>
                    <option value="marginLeftMm">Margin Left in mm (e.g. 10)</option>
                    <option value="printMode">Print Mode (front-only, front-back-together, duplex)</option>
                    <option value="duplexFlip">Duplex Flip (long-edge, short-edge)</option>
                  </select>
                ) : (
                  <select
                    value={overrideField}
                    onChange={(e) => {
                      setOverrideField(e.target.value);
                      setOverrideValue(String((overrideTarget.doc as any)[e.target.value] ?? ""));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="paperSize">Paper Size (a4, a3, a5, letter, legal)</option>
                    <option value="gsm">Paper GSM (70, 75, 80, 100, 120, 160, 250, 300, 350)</option>
                    <option value="colorMode">Color Mode (bw, color, mixed)</option>
                    <option value="sides">Sides (single, double_long, double_short)</option>
                    <option value="binding">Binding (none, staple, spiral, comb, soft, hard)</option>
                    <option value="copies">Copies Count</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Value</label>
                <input
                  type="text"
                  required
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="e.g. 80, a4, spiral, front-only..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Override (Required) *</label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Machine 80 GSM paper tray selected per operator verification"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overrideSubmitting}
                className="px-4 py-2 rounded-xl bg-[#123B70] text-white text-xs font-bold hover:bg-[#0e2f5a] disabled:opacity-50 cursor-pointer"
              >
                {overrideSubmitting ? "Saving..." : "Save Override with Audit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
};

