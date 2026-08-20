import React from "react";
import type { StoredInvoice } from "../../lib/invoice/types";
import { numberToIndianRupeesWords, roundCurrency } from "../../lib/invoice/invoiceStore";
import { CheckCircle2, AlertCircle, Phone, Mail, MapPin, ShieldCheck, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

interface InvoiceViewProps {
  invoice: StoredInvoice;
  id?: string;
  className?: string;
}

/**
 * Format currency with Indian comma separators and fixed 2 decimal places: e.g. ₹1,142.24
 */
function formatCurrency(amount?: number): string {
  const valid = roundCurrency(Number(amount) || 0);
  return `₹${valid.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, id, className }) => {
  const isPaid = invoice.paymentStatus === "confirmed" || invoice.paymentStatus === "paid";
  const isTemporary = Boolean(invoice.isTemporary || invoice.syncStatus === "LOCAL_PENDING");

  const formattedInvoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN");

  const formattedCompletionDate = invoice.completionDate
    ? new Date(invoice.completionDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : formattedInvoiceDate;

  const totalInWords = numberToIndianRupeesWords(invoice.totalAmount);
  const elementId = id || `invoice-view-${invoice.orderCode}`;

  return (
    <div
      id={elementId}
      className={cn(
        "palak-invoice-root bg-white text-slate-900 mx-auto w-full max-w-[800px] p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-0 print:p-0 print:m-0 print:max-w-none text-xs leading-normal font-sans",
        className
      )}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* ─── 0. Temporary Offline Bill Notice (if un-reconciled) ───────────────── */}
      {isTemporary && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-amber-900 text-xs font-semibold print:hidden">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Temporary Offline Bill ({invoice.invoiceNumber}) — Will automatically synchronize with cloud official numbering.</span>
          </div>
          <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
            Offline Pending
          </span>
        </div>
      )}

      {/* ─── 1. Header Banner & Business Identity ──────────────────────────────── */}
      <div className="invoice-section-avoid-break flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900/80">
        {/* Business Logo & Name */}
        <div className="flex items-start gap-3.5">
          <img
            src={invoice.businessSnapshot.logoUrl || "/logo.webp"}
            alt="Palak Enterprises"
            crossOrigin="anonymous"
            className="h-16 w-16 object-contain rounded-xl border border-slate-100 p-1 bg-white shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#123B70]">
                {invoice.businessSnapshot.nameEn || "Palak Enterprises"}
              </h1>
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                ({invoice.businessSnapshot.nameHi || "पालक इंटरप्राइजेज"})
              </span>
            </div>
            <p className="text-xs font-bold text-amber-700">
              {invoice.businessSnapshot.unitEn || "Palak Printing Press & Digital CSC Hub"}
            </p>
            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{invoice.businessSnapshot.fullAddressEn || "Ward No. 7, Near Block Gate, Chakia, East Champaran, Bihar - 845412"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 pt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                <span>{invoice.businessSnapshot.primaryPhone || "+91 99052 38015"}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-400" />
                <span>{invoice.businessSnapshot.email || "support@palakenterprises.in"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Title & Key Badges */}
        <div className="sm:text-right w-full sm:w-auto space-y-1.5 shrink-0">
          <div className="inline-block bg-[#123B70] text-white px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase">
            Tax Invoice / Retail Bill
          </div>
          <div className="text-sm font-black text-slate-900 font-mono">
            {invoice.invoiceNumber}
          </div>
          <div className="text-[11px] text-slate-500">
            Order Ref: <strong className="text-slate-800 font-mono">{invoice.orderCode}</strong>
          </div>
          <div className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-left sm:text-right">
            <div><strong>CSC ID:</strong> {invoice.businessSnapshot.cscId || "634165120013"}</div>
            <div><strong>Udyam:</strong> {invoice.businessSnapshot.udyamNo || "UDYAM-BR-11-0061705"}</div>
            {invoice.businessSnapshot.gstin && <div><strong>GSTIN:</strong> {invoice.businessSnapshot.gstin}</div>}
          </div>
        </div>
      </div>

      {/* ─── 2. Invoice Meta & Customer Details ─────────────────────────────────── */}
      <div className="invoice-section-avoid-break grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200">
        {/* Customer / Bill To */}
        <div className="space-y-1 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Billed To / Customer Details
          </span>
          <div className="text-sm font-black text-slate-900">
            {invoice.customerSnapshot.name || "Customer"}
          </div>
          <div className="text-xs text-slate-700 flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{invoice.customerSnapshot.phone || "N/A"}</span>
          </div>
          {invoice.customerSnapshot.email && (
            <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 text-slate-400" />
              <span>{invoice.customerSnapshot.email}</span>
            </div>
          )}
          {invoice.customerSnapshot.deliveryAddress?.street ? (
            <div className="text-[11px] text-slate-600 pt-0.5">
              <strong>Delivery Address:</strong> {invoice.customerSnapshot.deliveryAddress.street},{" "}
              {invoice.customerSnapshot.deliveryAddress.city} - {invoice.customerSnapshot.deliveryAddress.pincode}
            </div>
          ) : (
            <div className="text-[11px] text-slate-600 pt-0.5">
              <strong>Fulfillment:</strong> Store Counter Collection (Chakia Shop)
            </div>
          )}
        </div>

        {/* Invoice & Payment Metadata */}
        <div className="space-y-1 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              Invoice & Payment Information
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs pt-1">
              <div>
                <span className="text-slate-500">Invoice Date:</span>
                <span className="font-bold text-slate-800 ml-1">{formattedInvoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-500">Completed On:</span>
                <span className="font-bold text-slate-800 ml-1">{formattedCompletionDate}</span>
              </div>
              <div className="col-span-2 pt-1 flex items-center justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {invoice.paymentMethod ? invoice.paymentMethod.replace(/_/g, " ") : "Pay at Store"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status Pill */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <span className="text-xs font-bold text-slate-700">Payment Status:</span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 border",
                isPaid
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-50 text-amber-900 border-amber-300"
              )}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>PAID</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>PAYMENT DUE</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Itemized Table ─────────────────────────────────────────────────── */}
      <div className="py-5 overflow-x-auto">
        <table className="w-full text-left border-collapse invoice-table">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[11px] font-black uppercase tracking-wider text-slate-700 bg-slate-50/50">
              <th className="py-2.5 px-2 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Item & Description</th>
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
              <th className="py-2.5 px-3 text-right w-20">Discount</th>
              <th className="py-2.5 px-3 text-right w-20">Tax</th>
              <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 invoice-row-avoid-break">
                  <td className="py-3 px-2 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 text-xs">{item.productName}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {item.description}
                      </div>
                    )}
                    {item.uploadedFileName && (
                      <div className="text-[10px] text-blue-700 bg-blue-50/60 rounded px-1.5 py-0.5 inline-block mt-1">
                        📎 {item.uploadedFileName}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800 text-xs">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700 text-xs">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500 text-xs">
                    {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "—"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500 text-xs">
                    {item.tax > 0 ? formatCurrency(item.tax) : "0% (Exempt)"}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900 font-mono text-xs">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                  No items listed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. Calculation Summary & Financials ───────────────────────────────── */}
      <div className="invoice-totals-avoid-break grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 pb-6 border-t-2 border-slate-900">
        {/* Left Column: Words & Notes */}
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
              Total Amount in Words:
            </span>
            <p className="text-xs font-bold text-slate-800 italic mt-0.5 leading-snug">
              {totalInWords}
            </p>
          </div>

          {/* Official Verification Seal */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50">
            <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide block">
                Official Business Invoice
              </span>
              <span className="text-[10px] text-emerald-800 block">
                Verified Record • Palak Enterprises CSC & Printing Hub
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Calculations */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(invoice.subtotalAmount || invoice.totalAmount)}
            </span>
          </div>

          {invoice.discountAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
              <span>Discount:</span>
              <span className="font-mono font-bold">-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}

          {invoice.platformFee !== undefined && invoice.platformFee > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Platform & Tech Fee:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.platformFee)}
              </span>
            </div>
          )}

          {invoice.deliveryFee > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Delivery / Courier Charge:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.deliveryFee)}
              </span>
            </div>
          )}

          {invoice.otherCharges > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Other Charges / Surcharges:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(invoice.otherCharges)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>Taxable Amount:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(invoice.taxableAmount || (invoice.subtotalAmount - (invoice.discountAmount || 0)))}
            </span>
          </div>

          {invoice.taxAmount > 0 ? (
            <>
              {invoice.cgstAmount !== undefined && invoice.sgstAmount !== undefined ? (
                <>
                  <div className="flex justify-between py-0.5 text-[11px] text-slate-500">
                    <span>CGST:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(invoice.cgstAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-[11px] text-slate-500">
                    <span>SGST:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(invoice.sgstAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>GST / Tax {invoice.taxRate ? `(${invoice.taxRate}%)` : ''}:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>GST / Tax:</span>
              <span className="font-mono font-bold text-slate-900">₹0.00 (0% / Exempt)</span>
            </div>
          )}

          {/* Grand Total Bar */}
          <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-[#123B70] text-white text-sm font-black shadow-xs mt-2">
            <span>GRAND TOTAL:</span>
            <span className="text-base font-mono tracking-tight">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>

          <div className="flex justify-between py-1 text-slate-600 pt-1">
            <span>Amount Paid:</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatCurrency(invoice.amountPaid || (isPaid ? invoice.totalAmount : 0))}
            </span>
          </div>

          <div className="flex justify-between py-1 text-slate-600">
            <span>Balance Due:</span>
            <span className={cn("font-mono font-black", invoice.amountDue > 0 ? "text-amber-700" : "text-slate-800")}>
              {formatCurrency(invoice.amountDue || (isPaid ? 0 : invoice.totalAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 5. Terms & Conditions and Signatory Footer ───────────────────────── */}
      <div className="invoice-footer-avoid-break pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end text-[10px] text-slate-500">
        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Terms & Conditions:
          </span>
          <ul className="space-y-0.5 list-none">
            {invoice.businessSnapshot.terms && invoice.businessSnapshot.terms.length > 0 ? (
              invoice.businessSnapshot.terms.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))
            ) : (
              <>
                <li>1. Computer generated bill; physical signature not mandatory.</li>
                <li>2. Inspect delivered materials upon handover.</li>
                <li>3. Thank you for choosing Palak Enterprises!</li>
              </>
            )}
          </ul>
        </div>

        <div className="text-center sm:text-right space-y-1 pt-4 sm:pt-0">
          <div className="font-bold text-slate-800 text-xs">For Palak Enterprises</div>
          <div className="h-10 flex items-center justify-center sm:justify-end text-slate-400 italic text-[11px]">
            [Authorized Signatory]
          </div>
          <div className="text-[10px] text-slate-400">
            Proprietor / Authorized CSC Operator
          </div>
        </div>
      </div>

      {/* Thank you note */}
      <div className="text-center pt-5 border-t border-slate-100 text-slate-600 font-bold text-xs">
        🙏 Thank You For Your Business! • आपके विश्वास के लिए धन्यवाद!
      </div>
    </div>
  );
};

export default InvoiceView;
