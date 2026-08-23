import type { StoredInvoice } from "./types";
import { roundCurrency } from "./invoiceStore";
import { buildInvoiceVerificationUrl, getAppBaseUrl } from "./qrUtils";
import { supabase, isSupabaseConfigured } from "../supabase/client";

/**
 * Gets or dynamically renders the authoritative InvoiceView DOM element.
 * If the element #invoice-print-root is already present on the page (e.g. in preview modal or on screen), returns it.
 * If not (e.g. user clicked download/print directly from table or tracking screen),
 * dynamically renders the InvoiceView component into an offscreen container and provides cleanup.
 */
async function getOrRenderInvoiceElement(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ element: HTMLElement; cleanup?: () => void }> {
  // 1. Try explicit ID or element
  if (typeof elementOrId === "string") {
    const el = document.getElementById(elementOrId);
    if (el) return { element: el };
  } else if (elementOrId instanceof HTMLElement) {
    return { element: elementOrId };
  }

  // 2. Try standard root ID or active invoice root
  const standardRoot = document.getElementById("invoice-print-root");
  if (standardRoot) {
    return { element: standardRoot };
  }

  const existing =
    (invoice.orderCode && document.getElementById(`invoice-view-${invoice.orderCode}`)) ||
    (document.querySelector(".palak-invoice-root") as HTMLElement | null);
  if (existing) {
    return { element: existing };
  }

  // 3. Create an offscreen mount point with exact styling width
  const container = document.createElement("div");
  container.className = "palak-invoice-print-container";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.maxWidth = "794px";
  container.style.background = "#ffffff";
  container.style.zIndex = "-9999";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  try {
    const [React, { createRoot }, { InvoiceView }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("../../components/invoice/InvoiceView"),
    ]);

    const root = createRoot(container);
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(InvoiceView, {
          invoice,
          id: "invoice-print-root",
          className: "shadow-none border border-slate-200 p-7",
        })
      );
      // Wait for React commit and layout paint
      setTimeout(() => resolve(), 300);
    });

    const rendered =
      (container.querySelector("#invoice-print-root") as HTMLElement) ||
      (container.querySelector(".palak-invoice-root") as HTMLElement) ||
      container;

    return {
      element: rendered,
      cleanup: () => {
        try {
          root.unmount();
        } catch {}
        try {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        } catch {}
      },
    };
  } catch (err) {
    console.warn("Failed to render offscreen invoice:", err);
    return {
      element: container,
      cleanup: () => {
        try {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        } catch {}
      },
    };
  }
}

/**
 * Generates an authoritative single-page A4 PDF Blob from the canonical invoice DOM.
 */
export async function generateInvoicePDFBlob(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
  let cleanupFn: (() => void) | undefined;
  try {
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;

    const { element: targetElement, cleanup } = await getOrRenderInvoiceElement(
      invoice,
      elementOrId
    );
    cleanupFn = cleanup;

    const safeNumber = (invoice.invoiceNumber || invoice.orderCode || "BILL").replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `Palak-Enterprises-Invoice-${safeNumber}.pdf`;

    if (!targetElement || !targetElement.innerHTML || targetElement.innerHTML.trim().length === 0) {
      throw new Error("Invoice element could not be found for PDF capture.");
    }

    // High-DPI canvas capture matching the exact displayed invoice DOM
    const canvas = await html2canvas(targetElement, {
      scale: 2, // 2x high resolution for crisp vector-like text
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210; // A4 standard width in mm
    const pageHeight = 297; // A4 standard height in mm

    // Embed on exactly 1 single A4 page
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

    const blob = pdf.output("blob");
    return { success: true, blob, filename };
  } catch (err: any) {
    console.error("generateInvoicePDFBlob error:", err);
    return { success: false, error: err?.message || "Failed to generate PDF" };
  } finally {
    if (cleanupFn) {
      cleanupFn();
    }
  }
}

/**
 * Downloads a crisp, exact single-page A4 PDF invoice directly from the canonical invoice DOM.
 * Filename format: Palak-Enterprises-Invoice-{invoiceNumber}.pdf
 */
export async function downloadInvoicePDF(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await generateInvoicePDFBlob(invoice, elementOrId);
    if (!res.success || !res.blob || !res.filename) {
      return { success: false, error: res.error || "Failed to generate PDF" };
    }

    // Create a temporary object URL and trigger download
    const url = URL.createObjectURL(res.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = res.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { success: true };
  } catch (err: any) {
    console.error("downloadInvoicePDF error:", err);
    return { success: false, error: err?.message || "Failed to download PDF" };
  }
}

/**
 * Computes deterministic storage path for an invoice PDF.
 * Format: invoice-pdfs/YYYY/MM/INVOICE_NUMBER.pdf
 */
export function getInvoicePDFStoragePath(invoice: StoredInvoice): string {
  const invDate = new Date(invoice.invoiceDate || Date.now());
  const year = isNaN(invDate.getFullYear()) ? new Date().getFullYear() : invDate.getFullYear();
  const month = isNaN(invDate.getMonth())
    ? String(new Date().getMonth() + 1).padStart(2, "0")
    : String(invDate.getMonth() + 1).padStart(2, "0");
  const safeInvoiceNumber = (invoice.invoiceNumber || invoice.orderCode || "BILL").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `invoice-pdfs/${year}/${month}/${safeInvoiceNumber}.pdf`;
}

/**
 * Uploads or ensures the generated invoice PDF is hosted in Supabase Storage.
 * Returns a secure, short-lived HTTPS signed URL (e.g. 7-day validity for sharing).
 */
export async function uploadInvoicePDFToStorage(
  invoice: StoredInvoice,
  pdfBlob?: Blob,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; signedUrl?: string; storagePath?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: "Cloud database storage is not configured. Direct cloud PDF URL cannot be generated.",
    };
  }

  const storagePath = getInvoicePDFStoragePath(invoice);

  try {
    let blobToUpload = pdfBlob;
    if (!blobToUpload) {
      const genRes = await generateInvoicePDFBlob(invoice, elementOrId);
      if (!genRes.success || !genRes.blob) {
        return { success: false, error: genRes.error || "Failed to generate invoice PDF for storage." };
      }
      blobToUpload = genRes.blob;
    }

    // 1. Upload/Upsert to private 'customer-documents' bucket
    const { error: uploadError } = await supabase.storage
      .from("customer-documents")
      .upload(storagePath, blobToUpload, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[Palak Storage] PDF upload notice:", uploadError.message || uploadError);
      // Attempt to proceed to sign URL if already present, or return error
    }

    // 2. Generate 7-day (604,800 seconds) signed URL
    const { data: signData, error: signError } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(storagePath, 604800, {
        download: false,
      });

    if (signError || !signData?.signedUrl) {
      throw new Error(signError?.message || "Failed to generate secure signed PDF link.");
    }

    return {
      success: true,
      signedUrl: signData.signedUrl,
      storagePath,
    };
  } catch (err: any) {
    console.error("uploadInvoicePDFToStorage exception:", err);
    return {
      success: false,
      error: err?.message || "Unable to upload and host invoice PDF.",
    };
  }
}

/** Normalizes phone numbers (handles 10-digit Indian numbers, trims spaces, handles +91/0) */
export function normalizeWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.startsWith("91") && digits.length > 10) {
    return digits;
  }
  return digits;
}

/** Formats dynamic WhatsApp message with invoice metadata, canonical verification link, and secure PDF URL */
export function formatWhatsAppInvoiceMessage(invoice: StoredInvoice, pdfUrl?: string): string {
  const customerName = invoice.customerSnapshot?.name?.trim() || "Customer";
  const businessName = invoice.businessSnapshot?.nameEn || "Palak Enterprises";
  const invoiceNum = invoice.invoiceNumber;
  const orderRef = invoice.orderCode;
  const totalAmount = roundCurrency(invoice.totalAmount).toFixed(2);
  const verifyUrl =
    buildInvoiceVerificationUrl(invoice) ||
    `${getAppBaseUrl()}/verify-invoice/${encodeURIComponent(invoiceNum || "")}`;

  let paymentStatusText = "Payment Due";
  if (invoice.paymentStatus === "paid" || (invoice.paymentStatus === "confirmed" && invoice.amountDue <= 0)) {
    paymentStatusText = "Paid";
  } else if (invoice.paymentStatus === "partially_paid") {
    paymentStatusText = `Partially Paid (Due: ₹${roundCurrency(invoice.amountDue).toFixed(2)})`;
  } else if (invoice.paymentStatus === "refunded") {
    paymentStatusText = "Refunded";
  } else if (invoice.paymentStatus === "failed") {
    paymentStatusText = "Payment Failed";
  } else {
    paymentStatusText = "Payment Due";
  }

  const messageLines = [
    `Hello ${customerName},`,
    ``,
    `Thank you for choosing ${businessName}.`,
    ``,
    `Your official bill is ready.`,
    ``,
    `Invoice: ${invoiceNum}`,
    ...(orderRef ? [`Order Ref: ${orderRef}`] : []),
    `Amount: ₹${totalAmount}`,
    `Payment Status: ${paymentStatusText}`,
    ``,
    `View / Verify your official bill:`,
    verifyUrl,
    ...(pdfUrl ? [``, `Download PDF Bill:`, pdfUrl] : []),
    ``,
    `Thank you,`,
    businessName,
    `Printing & Digital Services`,
  ];

  return messageLines.join("\n");
}

/** Builds a WhatsApp sharing URL containing pre-filled message and target phone */
export function buildWhatsAppInvoiceUrl(invoice: StoredInvoice, pdfUrl: string): string {
  const phone = normalizeWhatsAppPhone(invoice.customerSnapshot?.phone);
  const message = formatWhatsAppInvoiceMessage(invoice, pdfUrl);
  const encoded = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

/**
 * End-to-end orchestration to generate PDF, upload to Supabase Storage, and open WhatsApp.
 */
export async function shareInvoiceOnWhatsApp(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string,
  onProgress?: (stage: "preparing" | "uploading" | "opening") => void
): Promise<{ success: boolean; error?: string }> {
  try {
    onProgress?.("preparing");
    const genRes = await generateInvoicePDFBlob(invoice, elementOrId);
    if (!genRes.success || !genRes.blob) {
      return { success: false, error: genRes.error || "Failed to generate invoice PDF." };
    }

    onProgress?.("uploading");
    const uploadRes = await uploadInvoicePDFToStorage(invoice, genRes.blob, elementOrId);
    if (!uploadRes.success || !uploadRes.signedUrl) {
      return {
        success: false,
        error: uploadRes.error || "Unable to host PDF bill. Please check network and try again.",
      };
    }

    onProgress?.("opening");
    const waUrl = buildWhatsAppInvoiceUrl(invoice, uploadRes.signedUrl);

    // Responsive Desktop / Mobile launch
    const win = window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      // Popup blocked fallback
      window.location.href = waUrl;
    }

    return { success: true };
  } catch (err: any) {
    console.error("shareInvoiceOnWhatsApp error:", err);
    return { success: false, error: err?.message || "An unexpected error occurred sharing on WhatsApp." };
  }
}

/**
 * Ensures all font and image resources (logos, QR code) inside the invoice element
 * are fully rendered and painted before triggering print or PDF capture.
 */
async function waitForInvoiceAssets(element: HTMLElement, maxWaitMs = 1200): Promise<void> {
  try {
    if (typeof document !== "undefined" && "fonts" in document && (document.fonts as any)?.ready) {
      await Promise.race([
        (document.fonts as any).ready,
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    }
  } catch {}

  const images = Array.from(element.querySelectorAll("img"));
  if (images.length === 0) return;

  const imagePromises = images.map((img) => {
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const finish = () => {
        img.removeEventListener("load", finish);
        img.removeEventListener("error", finish);
        resolve();
      };
      img.addEventListener("load", finish);
      img.addEventListener("error", finish);
      setTimeout(finish, 800);
    });
  });

  await Promise.race([
    Promise.all(imagePromises),
    new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);
}

/**
 * Triggers clean, dedicated bill printing.
 * Guarantees ONLY the invoice is printed (no background page bleed,
 * no modal scroll clipping, exact colors, and crisp typography).
 */
export async function printInvoiceElement(
  invoiceOrElementOrId?: StoredInvoice | HTMLElement | string,
  explicitId?: string
): Promise<void> {
  let targetElement: HTMLElement | null = null;
  let cleanupFn: (() => void) | undefined;

  if (explicitId) {
    targetElement = document.getElementById(explicitId);
  }

  if (!targetElement && typeof invoiceOrElementOrId === "string") {
    targetElement = document.getElementById(invoiceOrElementOrId);
  } else if (!targetElement && invoiceOrElementOrId instanceof HTMLElement) {
    targetElement = invoiceOrElementOrId;
  } else if (
    !targetElement &&
    invoiceOrElementOrId &&
    typeof invoiceOrElementOrId === "object" &&
    ("orderCode" in invoiceOrElementOrId || "invoiceNumber" in invoiceOrElementOrId)
  ) {
    targetElement =
      document.getElementById("invoice-print-root") ||
      (invoiceOrElementOrId.orderCode ? document.getElementById(`invoice-modal-content-${invoiceOrElementOrId.orderCode}`) : null) ||
      (invoiceOrElementOrId.orderCode ? document.getElementById(`invoice-view-${invoiceOrElementOrId.orderCode}`) : null);

    if (!targetElement) {
      const { element, cleanup } = await getOrRenderInvoiceElement(invoiceOrElementOrId);
      targetElement = element;
      cleanupFn = cleanup;
    }
  } else if (!targetElement) {
    targetElement =
      document.getElementById("invoice-print-root") ||
      document.querySelector(".palak-invoice-root");
  }

  // Ensure body has the print isolation class
  document.body.classList.add("palak-invoice-print-active");

  if (targetElement) {
    await waitForInvoiceAssets(targetElement, 1000);
  }

  const cleanupAndRestore = () => {
    document.body.classList.remove("palak-invoice-print-active");
    if (cleanupFn) {
      cleanupFn();
    }
  };

  window.addEventListener("afterprint", cleanupAndRestore, { once: true });

  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      console.warn("Print execution warning:", e);
    } finally {
      setTimeout(cleanupAndRestore, 3000);
    }
  }, 100);
}

/** Formats a professional WhatsApp message with invoice summary (legacy sync fallback) */
export function getWhatsAppInvoiceShareLink(invoice: StoredInvoice): string {
  const phone = normalizeWhatsAppPhone(invoice.customerSnapshot?.phone);
  const itemsList = (invoice.items || [])
    .map((item, idx) => `  ${idx + 1}. *${item.productName}* (Qty: ${item.quantity}${item.unit ? ` ${item.unit}` : ""}) — ₹${roundCurrency(item.totalPrice).toFixed(2)}`)
    .join("\n");

  const messageLines = [
    `🧾 *PALAK ENTERPRISES — ${invoice.documentType === "RETAIL_BILL" ? "RETAIL BILL" : "TAX INVOICE"}*`,
    `----------------------------------------`,
    `Invoice No: *${invoice.invoiceNumber}*`,
    invoice.orderCode ? `Order Code: *${invoice.orderCode}*` : `Type: *Store Bill*`,
    `Date: *${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}*`,
    `Customer: *${invoice.customerSnapshot?.name || "Customer"}*`,
    ``,
    `*Items:*`,
    itemsList,
    ``,
    `----------------------------------------`,
    `*Grand Total: ₹${roundCurrency(invoice.totalAmount).toFixed(2)}*`,
    `Payment Status: *${invoice.paymentStatus.toUpperCase()}*`,
    `----------------------------------------`,
    `📍 Near Block Gate, Chakia, Bihar - 845412`,
    `📞 +91 99052 38015`,
  ];

  const fullMessage = encodeURIComponent(messageLines.join("\n"));
  return phone
    ? `https://wa.me/${phone}?text=${fullMessage}`
    : `https://wa.me/?text=${fullMessage}`;
}
