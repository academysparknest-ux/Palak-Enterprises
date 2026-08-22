import type { StoredInvoice } from "./types";
import { roundCurrency } from "./invoiceStore";

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
 * Downloads a crisp, exact single-page A4 PDF invoice directly from the canonical invoice DOM.
 * Filename format: Palak-Enterprises-Invoice-{invoiceNumber}.pdf
 */
export async function downloadInvoicePDF(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; error?: string }> {
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

    pdf.save(filename);
    return { success: true };
  } catch (err: any) {
    console.error("downloadInvoicePDF error:", err);
    return { success: false, error: err?.message || "Failed to generate PDF" };
  } finally {
    if (cleanupFn) {
      cleanupFn();
    }
  }
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
      setTimeout(cleanupAndRestore, 4000);
    }
  }, 120);
}

/**
 * Instant Print: Renders only the InvoiceDocument and launches print directly without dashboard UI.
 */
export async function instantPrintInvoice(invoice: StoredInvoice): Promise<void> {
  await printInvoiceElement(invoice);
}

/** Formats a professional WhatsApp message with invoice summary and tracking link */
export function getWhatsAppInvoiceShareLink(invoice: StoredInvoice): string {
  const phone = (invoice.customerSnapshot?.phone || "").replace(/\D/g, "");
  const targetPhone = phone.length === 10 ? `91${phone}` : phone;

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
  return targetPhone
    ? `https://wa.me/${targetPhone}?text=${fullMessage}`
    : `https://wa.me/?text=${fullMessage}`;
}
