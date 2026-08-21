import type { StoredInvoice } from "./types";
import { numberToIndianRupeesWords, roundCurrency } from "./invoiceStore";

/**
 * Standard Indian Rupee currency formatter for invoice PDF and text
 */
function formatINR(amount: number): string {
  const rounded = roundCurrency(amount);
  return `₹${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Downloads a crisp, print-ready A4 PDF invoice directly in the browser.
 * Filename format: Palak-Enterprises-Invoice-{invoiceNumber}.pdf
 */
export async function downloadInvoicePDF(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;

    let targetElement: HTMLElement | null = null;

    if (typeof elementOrId === "string") {
      targetElement = document.getElementById(elementOrId);
    } else if (elementOrId instanceof HTMLElement) {
      targetElement = elementOrId;
    } else {
      targetElement = document.getElementById(`invoice-view-${invoice.orderCode}`);
    }

    const safeNumber = (invoice.invoiceNumber || invoice.orderCode).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `Palak-Enterprises-Invoice-${safeNumber}.pdf`;

    if (targetElement) {
      // 1. High-DPI canvas capture with CORS & background color
      const canvas = await html2canvas(targetElement, {
        scale: 2.5, // High resolution for crisp vector-like text
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: targetElement.scrollWidth || 800,
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
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      // First Page
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // Subsequent Pages (Strictly when content exceeds 1 full page > 5mm)
      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      // Add page numbering footer if multi-page
      if (pageNumber > 1) {
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(140, 140, 140);
          pdf.text(`Page ${i} of ${totalPages} • Palak Enterprises Official Tax Invoice`, pageWidth / 2, pageHeight - 6, {
            align: "center",
          });
        }
      }

      pdf.save(filename);
      return { success: true };
    }

    // 2. Programmatic Vector jsPDF Generator (Fallback if DOM element not found)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    let y = 18;


    // Header Branding
    doc.setFontSize(16);
    doc.setTextColor(18, 59, 112); // #123B70
    doc.setFont("helvetica", "bold");
    doc.text(invoice.businessSnapshot.nameEn || "Palak Enterprises", 14, y);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9); // Amber
    y += 5;
    doc.text(invoice.businessSnapshot.unitEn || "Printing Press & Digital CSC Hub", 14, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    y += 4;
    doc.text(invoice.businessSnapshot.fullAddressEn || "Ward No. 7, Near Block Gate, Chakia, East Champaran, Bihar - 845412", 14, y);
    y += 4;
    doc.text(`Phone: ${invoice.businessSnapshot.primaryPhone || "+91 99052 38015"} | Email: ${invoice.businessSnapshot.email || "support@palakenterprises.in"}`, 14, y);

    // Right Header: Invoice Badge & Details
    doc.setFontSize(11);
    doc.setTextColor(18, 59, 112);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE / RETAIL BILL", pageWidth - 14, 18, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageWidth - 14, 23, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(`Order Ref: ${invoice.orderCode}`, pageWidth - 14, 27, { align: "right" });
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`, pageWidth - 14, 31, { align: "right" });
    doc.text(`CSC: ${invoice.businessSnapshot.cscId || "634165120013"} | Udyam: ${invoice.businessSnapshot.udyamNo || "UDYAM-BR-11-0061705"}`, pageWidth - 14, 35, { align: "right" });

    // Divider
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);

    // Billed To Box
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("BILLED TO / CUSTOMER DETAILS", 14, y);
    doc.text("PAYMENT INFORMATION", 120, y);

    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(invoice.customerSnapshot.name || "Customer", 14, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${invoice.paymentStatus.toUpperCase()}`, 120, y);

    y += 4;
    doc.text(`Phone: ${invoice.customerSnapshot.phone || "N/A"}`, 14, y);
    doc.text(`Method: ${(invoice.paymentMethod || "pay_at_store").replace(/_/g, " ").toUpperCase()}`, 120, y);

    if (invoice.customerSnapshot.email) {
      y += 4;
      doc.text(`Email: ${invoice.customerSnapshot.email}`, 14, y);
    }
    if (invoice.customerSnapshot.deliveryAddress?.street) {
      y += 4;
      doc.text(`Delivery: ${invoice.customerSnapshot.deliveryAddress.street}, ${invoice.customerSnapshot.deliveryAddress.city} - ${invoice.customerSnapshot.deliveryAddress.pincode}`, 14, y);
    }

    // Items Table Header
    y += 8;
    doc.setFillColor(245, 247, 250);
    doc.rect(14, y, pageWidth - 28, 7, "F");
    doc.setDrawColor(18, 59, 112);
    doc.setLineWidth(0.4);
    doc.line(14, y + 7, pageWidth - 14, y + 7);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(18, 59, 112);
    doc.text("#", 16, y + 5);
    doc.text("Item & Description", 24, y + 5);
    doc.text("Qty", 125, y + 5, { align: "center" });
    doc.text("Unit (₹)", 150, y + 5, { align: "right" });
    doc.text("Total (₹)", pageWidth - 16, y + 5, { align: "right" });

    y += 11;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    // Items List
    invoice.items.forEach((item, idx) => {
      // Check page overflow
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(idx + 1), 16, y);
      doc.text(item.productName.slice(0, 50), 24, y);
      doc.text(String(item.quantity), 125, y, { align: "center" });
      doc.text(roundCurrency(item.unitPrice).toFixed(2), 150, y, { align: "right" });
      doc.text(roundCurrency(item.totalPrice).toFixed(2), pageWidth - 16, y, { align: "right" });
      y += 6;
    });

    // Divider
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    // Financial Breakdown
    const finX = 130;
    const valX = pageWidth - 16;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    doc.text("Subtotal:", finX, y);
    doc.text(formatINR(invoice.subtotalAmount || invoice.totalAmount), valX, y, { align: "right" });
    y += 4.5;

    if (invoice.discountAmount > 0) {
      doc.setTextColor(22, 101, 52); // Emerald
      doc.text("Discount:", finX, y);
      doc.text(`-${formatINR(invoice.discountAmount)}`, valX, y, { align: "right" });
      doc.setTextColor(60, 60, 60);
      y += 4.5;
    }

    if (invoice.platformFee !== undefined && invoice.platformFee > 0) {
      doc.text("Platform & Tech Fee:", finX, y);
      doc.text(formatINR(invoice.platformFee), valX, y, { align: "right" });
      y += 4.5;
    }

    if (invoice.deliveryFee > 0) {
      doc.text("Delivery Fee:", finX, y);
      doc.text(formatINR(invoice.deliveryFee), valX, y, { align: "right" });
      y += 4.5;
    }

    if (invoice.otherCharges > 0) {
      doc.text("Other Charges:", finX, y);
      doc.text(formatINR(invoice.otherCharges), valX, y, { align: "right" });
      y += 4.5;
    }

    doc.text("Taxable Amount:", finX, y);
    doc.text(formatINR(invoice.taxableAmount || (invoice.subtotalAmount - (invoice.discountAmount || 0))), valX, y, { align: "right" });
    y += 4.5;

    if (invoice.taxAmount > 0) {
      if (invoice.cgstAmount !== undefined && invoice.sgstAmount !== undefined) {
        doc.text("CGST:", finX, y);
        doc.text(formatINR(invoice.cgstAmount), valX, y, { align: "right" });
        y += 4;
        doc.text("SGST:", finX, y);
        doc.text(formatINR(invoice.sgstAmount), valX, y, { align: "right" });
        y += 4.5;
      } else {
        doc.text(`GST (${invoice.taxRate || 18}%):`, finX, y);
        doc.text(formatINR(invoice.taxAmount), valX, y, { align: "right" });
        y += 4.5;
      }
    } else {
      doc.text("GST / Tax:", finX, y);
      doc.text("₹0.00 (0% / Exempt)", valX, y, { align: "right" });
      y += 4.5;
    }

    // Grand Total Bar
    y += 1;
    doc.setFillColor(18, 59, 112);
    doc.rect(115, y, pageWidth - 129, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("GRAND TOTAL:", 118, y + 5.5);
    doc.text(formatINR(invoice.totalAmount), valX, y + 5.5, { align: "right" });
    y += 12;

    // Amount in Words
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Amount in Words: ${numberToIndianRupeesWords(invoice.totalAmount)}`, 14, y);

    // Save
    doc.save(filename);
    return { success: true };
  } catch (err: any) {
    console.error("downloadInvoicePDF error:", err);
    return { success: false, error: err?.message || "Failed to generate PDF" };
  }
}

/** Triggers native print preview styled specifically for clean A4 printing */
export function printInvoiceElement(_elementOrId?: HTMLElement | string): void {
  window.print();
}

/** Formats a professional WhatsApp message with invoice summary and tracking link */
export function getWhatsAppInvoiceShareLink(invoice: StoredInvoice): string {
  const phone = (invoice.customerSnapshot.phone || "").replace(/\D/g, "");
  const targetPhone = phone.length === 10 ? `91${phone}` : phone;

  const itemsList = invoice.items
    .map((item, idx) => `  ${idx + 1}. *${item.productName}* (Qty: ${item.quantity}) — ₹${roundCurrency(item.totalPrice).toFixed(2)}`)
    .join("\n");

  const messageLines = [
    `🧾 *PALAK ENTERPRISES — TAX INVOICE*`,
    `----------------------------------------`,
    `Invoice No: *${invoice.invoiceNumber}*`,
    `Order Code: *${invoice.orderCode}*`,
    `Date: *${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}*`,
    `Customer: *${invoice.customerSnapshot.name || "Customer"}*`,
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
