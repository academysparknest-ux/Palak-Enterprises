import React from "react";
import type { StoredInvoice } from "../../lib/invoice/types";
import { numberToIndianRupeesWords, formatCurrency } from "../../lib/invoice/invoiceStore";
import { CheckCircle2, AlertCircle, Phone, Mail, MapPin, Clock, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { InvoiceQRCode } from "./InvoiceQRCode";
import { OWNER_SIGNATURE_ONLINE_URL, OWNER_SIGNATURE_LOCAL_URL, business, businessConfig } from "../../config/business";

export interface InvoiceViewProps {
  invoice: StoredInvoice;
  id?: string;
  className?: string;
  signatureUrl?: string;
}

/**
 * Canonical Palak Enterprises A4 Invoice Document.
 * Used identically for: Screen Preview, PDF Download, and Browser Print.
 * Formatted cleanly for single-page A4 output or natural multi-page pagination.
 */
export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  id = "invoice-print-root",
  className,
  signatureUrl,
}) => {
  const isPaid = invoice.paymentStatus === "confirmed" || invoice.paymentStatus === "paid";
  const isPartiallyPaid = invoice.paymentStatus === "partially_paid";
  const isDraft = invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";

  const formattedInvoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const formattedCompletionDate = invoice.completionDate
    ? new Date(invoice.completionDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : formattedInvoiceDate;

  const totalInWords = numberToIndianRupeesWords(invoice.totalAmount);
  const elementId = id || "invoice-print-root";

  const effectiveDocType = invoice.documentType === "RETAIL_BILL" ? "RETAIL BILL" : "TAX INVOICE / RETAIL BILL";
  const activeSignature =
    signatureUrl ||
    invoice.signatureUrl ||
    invoice.businessSnapshot?.signatureUrl ||
    OWNER_SIGNATURE_ONLINE_URL ||
    OWNER_SIGNATURE_LOCAL_URL;

  return (
    <div
      id={elementId}
      className={cn(
        "palak-invoice-root bg-white text-slate-900 mx-auto w-full max-w-[794px] min-h-[1050px] p-6 sm:p-7 rounded-none border border-slate-200 shadow-sm text-xs leading-normal font-sans flex flex-col justify-between print:shadow-none print:border-0 print:p-0 print:m-0 print:max-w-none print:min-h-0 print:w-full print:h-auto print:overflow-visible",
        className
      )}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* ─── TOP SECTION: Badges + Header + Billed To + Items Table ─────── */}
      <div className="space-y-2.5">
        {/* ─── 0. Notices (Screen Only) ─────────────────────────────────── */}
        {isDraft && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 flex items-center justify-between text-amber-900 text-[11px] font-semibold print:hidden">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>DRAFT BILL — Unissued. Saving or issuing will assign an official sequential permanent number.</span>
            </div>
            <span className="bg-amber-200 text-amber-900 text-[9px] px-2 py-0.5 rounded font-black uppercase">
              DRAFT
            </span>
          </div>
        )}

        {isCancelled && (
          <div className="bg-rose-50 border border-rose-300 rounded-lg px-3 py-1.5 flex items-center justify-between text-rose-900 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span>
                <strong>CANCELLED INVOICE:</strong> {invoice.cancellationReason || "Voided by management"}
              </span>
            </div>
            <span className="bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase">
              CANCELLED
            </span>
          </div>
        )}

        {/* ─── 1. Header Banner & Business Identity ──────────────────────── */}
        <div className="invoice-header invoice-section-avoid-break flex flex-row justify-between items-start gap-3 pb-2.5 border-b-2 border-slate-900">
          {/* Left: Logo & Identity */}
          <div className="flex items-start gap-3">
            <img
              src={invoice.businessSnapshot?.logoUrl || "/logo.webp"}
              alt="Palak Enterprises"
              className="h-14 w-14 object-contain rounded-lg border border-slate-200 p-1 bg-white shrink-0 mt-0.5"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-[#123B70]">
                  {invoice.businessSnapshot?.nameEn || "PALAK ENTERPRISES"}
                </h1>
                <span className="text-xs font-bold text-slate-500">
                  ({invoice.businessSnapshot?.nameHi || "पालक इंटरप्राइजेज"})
                </span>
              </div>
              <p className="text-[11px] font-bold text-amber-700">
                {invoice.businessSnapshot?.unitEn || "Palak Printing Press & Digital CSC Hub"}
              </p>
              <p className="text-[10px] text-slate-600 flex items-center gap-1 leading-tight">
                <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                <span>
                  {businessConfig.address.fullAddress.en ||
                    invoice.businessSnapshot?.fullAddressEn ||
                    "Near Block Gate, Chakia, East Champaran, Bihar - 845412"}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                  <span>{invoice.businessSnapshot?.primaryPhone || "+91 99052 38015"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-2.5 w-2.5 text-slate-400" />
                  <span>{invoice.businessSnapshot?.email || "support@palakenterprises.in"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Document Badges & Registrations */}
          <div className="text-right space-y-1 shrink-0 min-w-[190px]">
            <div className="inline-block bg-[#123B70] text-white px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
              {effectiveDocType}
            </div>
            <div className="text-xs font-black text-slate-900 font-mono tracking-tight">
              {invoice.invoiceNumber}
            </div>
            <div className="text-[10px] text-slate-500">
              {invoice.orderCode ? (
                <>Order Ref: <strong className="text-slate-800 font-mono">{invoice.orderCode}</strong></>
              ) : (
                <>Source: <strong className="text-slate-800 uppercase font-semibold">Store Counter Bill</strong></>
              )}
            </div>
            <div className="text-[9px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-right space-y-0.5">
              <div><strong>CSC ID:</strong> {invoice.businessSnapshot?.cscId || "634165120013"}</div>
              <div><strong>UDYAM:</strong> {invoice.businessSnapshot?.udyamNo || "UDYAM-BR-11-0061705"}</div>
              <div><strong>GSTIN:</strong> {business.registrations.gstin || invoice.businessSnapshot?.gstin || "10AVUPP3470E1ZK"}</div>
            </div>
          </div>
        </div>

        {/* ─── 2. Customer & Payment Information Grid ────────────────────── */}
        <div className="invoice-section-avoid-break grid grid-cols-2 gap-3 py-0.5">
          {/* Left Column: Billed To */}
          <div className="space-y-0.5 rounded-lg bg-slate-50/90 p-2.5 border border-slate-200">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
              Billed To / Customer Details
            </span>
            <div className="text-xs font-black text-slate-900">
              {invoice.customerSnapshot?.name || "Walk-in Customer"}
            </div>
            <div className="text-[11px] text-slate-700 flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 text-slate-400" />
              <span>{invoice.customerSnapshot?.phone || "N/A"}</span>
            </div>
            {invoice.customerSnapshot?.email && (
              <div className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                <Mail className="h-2.5 w-2.5 text-slate-400" />
                <span>{invoice.customerSnapshot.email}</span>
              </div>
            )}
            {invoice.customerSnapshot?.gstin && (
              <div className="text-[10px] text-slate-700 font-semibold">
                <strong>Customer GSTIN:</strong> {invoice.customerSnapshot.gstin}
              </div>
            )}
            {invoice.customerSnapshot?.deliveryAddress?.street ? (
              <div className="text-[10px] text-slate-600 pt-0.5 leading-tight">
                <strong>Delivery Address:</strong> {invoice.customerSnapshot.deliveryAddress.street},{" "}
                {invoice.customerSnapshot.deliveryAddress.city || "Chakia"} - {invoice.customerSnapshot.deliveryAddress.pincode || "845412"}
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 pt-0.5">
                <strong>Fulfillment:</strong> Store Counter Collection (Chakia Shop)
              </div>
            )}
          </div>

          {/* Right Column: Invoice & Payment Metadata */}
          <div className="space-y-0.5 rounded-lg bg-slate-50/90 p-2.5 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                Invoice & Payment Information
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] pt-0.5">
                <div>
                  <span className="text-slate-500">Invoice Date:</span>
                  <span className="font-bold text-slate-800 ml-1">{formattedInvoiceDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">Completed On:</span>
                  <span className="font-bold text-slate-800 ml-1">{formattedCompletionDate}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-0.5">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-slate-800 uppercase font-mono">
                    {invoice.paymentMethod ? invoice.paymentMethod.replace(/_/g, " ") : "PAY AT STORE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status Pill */}
            <div className="pt-1.5 flex items-center justify-between border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700">Payment Status:</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border",
                  isPaid
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : isPartiallyPaid
                    ? "bg-blue-50 text-blue-800 border-blue-300"
                    : "bg-amber-50 text-amber-900 border-amber-300"
                )}
              >
                {isPaid ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>PAID</span>
                  </>
                ) : isPartiallyPaid ? (
                  <>
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span>PARTIAL PAID</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    <span>PAYMENT DUE</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 3. Itemized Full-Width Table ───────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse invoice-table">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100/80">
                <th className="py-1.5 px-1.5 w-7 text-center">#</th>
                <th className="py-1.5 px-2">Item & Description</th>
                <th className="py-1.5 px-2 text-center w-16">Qty</th>
                <th className="py-1.5 px-2 text-right w-24">Unit Price (₹)</th>
                <th className="py-1.5 px-2 text-right w-20">Discount (₹)</th>
                <th className="py-1.5 px-2 text-right w-20">Tax</th>
                <th className="py-1.5 px-2.5 text-right w-24">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <tr key={idx} className="invoice-item invoice-row-avoid-break hover:bg-slate-50/50">
                    <td className="py-1.5 px-1.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <div className="font-bold text-slate-900 text-[11px] leading-snug">{item.productName}</div>
                      {item.description && (
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {item.description}
                        </div>
                      )}
                      {item.uploadedFileName && (
                        <div className="text-[9px] text-blue-700 bg-blue-50 rounded px-1.5 py-0.2 inline-block mt-0.5">
                          📎 {item.uploadedFileName}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-slate-800 text-[11px]">
                      {item.quantity} {item.unit && <span className="text-[9px] font-normal text-slate-500">{item.unit}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[11px]">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-500 text-[11px]">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-500 text-[11px]">
                      {item.taxRate !== undefined && item.taxRate > 0
                        ? `${item.taxRate}%`
                        : item.tax > 0
                        ? formatCurrency(item.tax)
                        : "0% (Exempt)"}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-black text-slate-900 font-mono text-[11px]">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-3 text-center text-slate-400 italic text-[11px]">
                    No items listed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── BOTTOM SECTION: Financials + QR + Terms & Signature ─────────── */}
      <div className="space-y-2 pt-2">
        {/* ─── 4. Totals Layout Grid: Left (Words) + Center (QR) + Right (Totals) ─── */}
        <div className="invoice-section invoice-totals-avoid-break grid grid-cols-12 gap-3 pt-2 pb-1.5 border-t-2 border-slate-900 items-start">
          {/* Left Column (5 cols): Amount in Words */}
          <div className="col-span-5 space-y-2">
            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                Total Amount in Words:
              </span>
              <p className="text-[11px] font-bold text-slate-800 italic mt-0.5 leading-snug">
                {totalInWords}
              </p>
            </div>

            {/* Official Verification Badge */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-300 bg-emerald-50/50">
              <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-950 uppercase tracking-wide block">
                  Authoritative Tax Invoice
                </span>
                <span className="text-[8px] text-emerald-800 block">
                  CSC Verified • Palak Enterprises Chakia
                </span>
              </div>
            </div>
          </div>

          {/* Center Column (2 cols): Official Verification QR Code */}
          <InvoiceQRCode invoice={invoice} size={58} className="col-span-2" />

          {/* Right Column (5 cols): Financial Calculations */}
          <div className="col-span-5 space-y-0.5 text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.subtotalAmount || invoice.totalAmount)}
              </span>
            </div>

            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-0.5 border-b border-slate-100 text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono font-bold">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}

            {invoice.deliveryFee > 0 && (
              <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(invoice.deliveryFee)}
                </span>
              </div>
            )}

            {invoice.otherCharges > 0 && (
              <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                <span>Other Charges:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(invoice.otherCharges)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
              <span>Taxable Amount:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.taxableAmount || (invoice.subtotalAmount - (invoice.discountAmount || 0)))}
              </span>
            </div>

            {invoice.taxAmount > 0 ? (
              <>
                {invoice.cgstAmount !== undefined && invoice.sgstAmount !== undefined ? (
                  <>
                    <div className="flex justify-between py-0.2 text-[10px] text-slate-500">
                      <span>CGST:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatCurrency(invoice.cgstAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.2 border-b border-slate-100 text-[10px] text-slate-500">
                      <span>SGST:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatCurrency(invoice.sgstAmount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                    <span>GST / Tax {invoice.taxRate ? `(${invoice.taxRate}%)` : ""}:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(invoice.taxAmount)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                <span>GST / Tax:</span>
                <span className="font-mono font-bold text-slate-900">₹0.00 (0% / Exempt)</span>
              </div>
            )}

            {/* Grand Total Prominent Bar */}
            <div className="flex justify-between items-center py-1 px-2 rounded bg-[#123B70] text-white text-xs font-black shadow-2xs mt-0.5">
              <span>GRAND TOTAL:</span>
              <span className="text-sm font-mono tracking-tight">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between py-0.5 text-slate-600 pt-0.5">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(invoice.amountPaid || (isPaid ? invoice.totalAmount : 0))}
              </span>
            </div>

            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Balance Due:</span>
              <span className={cn("font-mono font-black", invoice.amountDue > 0 ? "text-amber-700" : "text-slate-800")}>
                {formatCurrency(invoice.amountDue || (isPaid ? 0 : invoice.totalAmount))}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 5. Terms & Conditions and Dedicated Signature Area ─────────── */}
        <div className="invoice-section invoice-footer-avoid-break pt-1.5 border-t border-slate-200 grid grid-cols-12 gap-3 items-end text-[9px] text-slate-500">
          {/* Left: Terms & Conditions (7 cols) */}
          <div className="col-span-7">
            <span className="font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
              Terms & Conditions:
            </span>
            <ul className="space-y-0.5 list-none">
              {invoice.businessSnapshot?.terms && invoice.businessSnapshot.terms.length > 0 ? (
                invoice.businessSnapshot.terms.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))
              ) : (
                <>
                  <li>1. This is a computer generated invoice and does not require physical signature.</li>
                  <li>2. Goods/prints once inspected and delivered will not be returned.</li>
                  <li>3. Online services fees are non-refundable once portal filing is initiated.</li>
                  <li>4. Jurisdiction for disputes: Chakia / Motihari, East Champaran, Bihar.</li>
                </>
              )}
            </ul>
          </div>

          {/* Right: Signature Box (5 cols) */}
          <div className="col-span-5 text-right space-y-0.5">
            <div className="font-bold text-slate-900 text-[10px]">For Palak Enterprises</div>
            
            {/* Signature Image or Configurable Placeholder */}
            <div className="h-11 flex items-center justify-end">
              {activeSignature ? (
                <img
                  src={activeSignature}
                  alt="Authorized Signatory - Kumar Pankaj"
                  crossOrigin="anonymous"
                  className="max-h-10 max-w-[150px] object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes(OWNER_SIGNATURE_LOCAL_URL)) {
                      img.src = OWNER_SIGNATURE_LOCAL_URL;
                    }
                  }}
                />
              ) : (
                <div className="border-b border-dashed border-slate-300 w-36 h-7 flex items-end justify-center text-[9px] text-slate-400 italic">
                  [Authorized Signatory]
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-800 font-bold leading-tight">
              {invoice.businessSnapshot?.ownerName || "Kumar Pankaj"}
            </div>
            <div className="text-[7.5px] text-slate-500 font-semibold tracking-wide uppercase">
              {invoice.businessSnapshot?.ownerTitle || "Proprietor"} / Authorized Signatory
            </div>
          </div>
        </div>

        {/* ─── 6. Clean Thank You Footer ─────────────────────────────────── */}
        <div className="text-center pt-1 border-t border-slate-100 text-slate-600 font-bold text-[9px]">
          🙏 Thank You For Your Business! • आपके विश्वास के लिए धन्यवाद!
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
