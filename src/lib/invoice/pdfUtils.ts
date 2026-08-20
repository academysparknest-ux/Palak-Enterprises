import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { StoredInvoice } from "./types";
import { numberToIndianRupeesWords, roundCurrency } from "./invoiceStore";

/**
 * Downloads a crisp, print-ready A4 PDF invoice directly in the browser
 * Filename format: Invoice-PE-2026-000001.pdf
 */
export async function downloadInvoicePDF(
  invoice: StoredInvoice,
  elementOrId?: HTMLElement | string
): Promise<{ success: boolean; error?: string }> {
  try {
    let targetElement: HTMLElement | null = null;

    if (typeof elementOrId === "string") {
      targetElement = document.getElementById(elementOrId);
    } else if (elementOrId instanceof HTMLElement) {
      targetElement = elementOrId;
    } else {
      targetElement = document.getElementById(`invoice-view-${invoice.orderCode}`);
    }

    const safeNumber = (invoice.invoiceNumber || invoice.orderCode).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `Invoice-${safeNumber}.pdf`;

    if (targetElement) {
      // Capture high-DPI canvas
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: targetElement.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      return { success: true };
    }

    // Fallback programmatic generation if DOM element not rendered
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(invoice.businessSnapshot.nameEn || "Palak Enterprises", 14, 20);
    doc.setFontSize(10);
    doc.text(invoice.businessSnapshot.unitEn || "Printing Press & Digital CSC Hub", 14, 26);
    doc.text(invoice.businessSnapshot.fullAddressEn || "Chakia, East Champaran, Bihar - 845412", 14, 31);
    doc.text(
      `Phone: ${invoice.businessSnapshot.primaryPhone || "+91 99052 38015"} | CSC: ${invoice.businessSnapshot.cscId || "634165120013"}`,
      14,
      36
    );

    doc.line(14, 40, 196, 40);

    doc.setFontSize(14);
    doc.text("TAX INVOICE / RETAIL BILL", 14, 48);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, 55);
    doc.text(`Order Code: ${invoice.orderCode}`, 14, 60);
    doc.text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`, 14, 65);
    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, 14, 70);

    doc.text("Billed To:", 120, 55);
    doc.text(`${invoice.customerSnapshot.name || "Valued Customer"}`, 120, 60);
    doc.text(`Phone: ${invoice.customerSnapshot.phone || "N/A"}`, 120, 65);
    if (invoice.customerSnapshot.email) doc.text(`Email: ${invoice.customerSnapshot.email}`, 120, 70);

    doc.line(14, 76, 196, 76);

    // Items summary table
    let y = 84;
    doc.text("Items & Description", 14, y);
    doc.text("Qty", 130, y);
    doc.text("Unit (₹)", 150, y);
    doc.text("Total (₹)", 175, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    invoice.items.forEach((item, i) => {
      doc.text(`${i + 1}. ${item.productName.slice(0, 45)}`, 14, y);
      doc.text(`${item.quantity}`, 130, y);
      doc.text(`${roundCurrency(item.unitPrice).toFixed(2)}`, 150, y);
      doc.text(`${roundCurrency(item.totalPrice).toFixed(2)}`, 175, y);
      y += 8;
    });

    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: ₹${roundCurrency(invoice.subtotalAmount).toFixed(2)}`, 130, y);
    y += 6;
    if (invoice.discountAmount > 0) {
      doc.text(`Discount: -₹${roundCurrency(invoice.discountAmount).toFixed(2)}`, 130, y);
      y += 6;
    }
    if (invoice.deliveryFee > 0) {
      doc.text(`Delivery Fee: ₹${roundCurrency(invoice.deliveryFee).toFixed(2)}`, 130, y);
      y += 6;
    }
    doc.text(`GST (0% / Exempt): ₹0.00`, 130, y);
    y += 6;
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL: ₹${roundCurrency(invoice.totalAmount).toFixed(2)}`, 120, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Amount Paid: ₹${roundCurrency(invoice.amountPaid).toFixed(2)}`, 130, y);
    y += 6;
    doc.text(`Balance Due: ₹${roundCurrency(invoice.amountDue).toFixed(2)}`, 130, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${numberToIndianRupeesWords(invoice.totalAmount)}`, 14, y);

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

  // Determine production domain safely
  let origin = "https://palakenterprises.in";
  if (typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("localhost")) {
    origin = window.location.origin;
  }

  const message = [
    `🧾 *PALAK ENTERPRISES — TAX INVOICE*`,
    `----------------------------------------`,
    `*Invoice Number:* ${invoice.invoiceNumber}`,
    `*Order Reference:* ${invoice.orderCode}`,
    `*Customer:* ${invoice.customerSnapshot.name || "Customer"}`,
    `*Date:* ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}`,
    `*Payment Status:* ${invoice.paymentStatus.toUpperCase()} (${invoice.paymentMethod.replace(/_/g, " ").toUpperCase()})`,
    `----------------------------------------`,
    `*Items:*`,
    itemsList,
    `----------------------------------------`,
    `*Subtotal:* ₹${roundCurrency(invoice.subtotalAmount).toFixed(2)}`,
    invoice.discountAmount > 0 ? `*Discount:* -₹${roundCurrency(invoice.discountAmount).toFixed(2)}` : null,
    invoice.deliveryFee > 0 ? `*Delivery Fee:* ₹${roundCurrency(invoice.deliveryFee).toFixed(2)}` : null,
    `*GST (0% / Exempt):* ₹0.00`,
    `*Grand Total:* ₹${roundCurrency(invoice.totalAmount).toFixed(2)}`,
    `*Amount Paid:* ₹${roundCurrency(invoice.amountPaid).toFixed(2)}`,
    invoice.amountDue > 0
      ? `*Balance Due:* ₹${roundCurrency(invoice.amountDue).toFixed(2)}`
      : `*Balance Due:* ₹0.00 (Fully Paid)`,
    `----------------------------------------`,
    `📍 *Palak Enterprises & Printing Press*`,
    `Ward No. 7, Near Block Gate, Chakia, East Champaran, Bihar`,
    `Phone: +91 99052 38015 / +91 73249 64770`,
    ``,
    `🔍 Track online & download official PDF copy:`,
    `${origin}/track-order?code=${encodeURIComponent(invoice.orderCode)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const base = targetPhone ? `https://wa.me/${targetPhone}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
}
