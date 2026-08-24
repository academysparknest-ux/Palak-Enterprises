import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { verifyInvoiceAuthenticity } from "../lib/invoice/verificationService";
import type { PublicInvoiceVerificationResult } from "../lib/invoice/verificationService";
import { formatCurrency } from "../lib/invoice/invoiceStore";
import { business } from "../config/business";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  Building,
  Phone,
  ArrowLeft,
  Loader2,
  Clock,
  ExternalLink,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { cn } from "../lib/utils";

export const VerifyInvoicePage: React.FC = () => {
  const { invoiceNumber: paramInvoiceNumber } = useParams<{ invoiceNumber?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // SECURITY AUDIT: Only extract invoice identifier. NEVER read ?amount=, ?status=, ?valid=, etc.
  const rawId = (paramInvoiceNumber || searchParams.get("number") || searchParams.get("id") || "").trim();
  const [inputNumber, setInputNumber] = useState(rawId);
  const [loading, setLoading] = useState(Boolean(rawId));
  const [result, setResult] = useState<PublicInvoiceVerificationResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeVerification = useCallback(async (idToVerify: string) => {
    if (!idToVerify) {
      setLoading(false);
      setResult(null);
      return;
    }

    setLoading(true);

    try {
      const res = await verifyInvoiceAuthenticity(idToVerify);
      setResult(res);
    } catch {
      setResult({
        status: "UNAVAILABLE",
        error: "SERVICE_UNAVAILABLE",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    executeVerification(rawId);
  }, [rawId, retryCount, executeVerification]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputNumber.trim().toUpperCase();
    if (clean && !loading) {
      navigate(`/verify-invoice/${encodeURIComponent(clean)}`);
    }
  };

  const handleRetry = () => {
    if (!loading) {
      setRetryCount((prev) => prev + 1);
    }
  };

  const formattedDate = (d?: string) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Top Branding Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/logo.webp"
              alt="Palak Enterprises"
              className="h-11 w-11 object-contain rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="text-left">
              <span className="text-lg font-black text-[#123B70] tracking-tight block leading-none">
                PALAK ENTERPRISES
              </span>
              <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                Official Bill Verification Portal • बिल सत्यापन
              </span>
            </div>
          </Link>
        </div>

        {/* Search Bar / Input Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                placeholder="Enter Invoice Number (e.g. PE-2026-0042)"
                maxLength={64}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70] uppercase transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputNumber.trim()}
              className="px-5 py-2.5 bg-[#123B70] hover:bg-[#0e2c54] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Verify Bill</span>
            </button>
          </form>
        </div>

        {/* Dynamic Verification Content (Four Mutually Exclusive States) */}
        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center space-y-3 shadow-sm border border-slate-200">
            <Loader2 className="h-9 w-9 text-[#123B70] animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Verifying Invoice Authenticity...</h3>
              <p className="text-xs text-slate-500">Querying authoritative Palak Enterprises billing ledger</p>
            </div>
          </div>
        ) : !rawId ? (
          /* Empty Initial State */
          <div className="bg-white rounded-2xl p-8 text-center space-y-4 shadow-sm border border-slate-200">
            <div className="h-14 w-14 bg-blue-50 text-[#123B70] rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900">Official Invoice Verification</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan the QR code printed on your bill or enter the official sequential invoice number above to verify genuine issuance.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium">
                ✓ CSC Verified Billing
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium">
                ✓ Tamper Proof Records
              </span>
              <span className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium">
                ✓ Government Reg. CSC & UDYAM
              </span>
            </div>
          </div>
        ) : result?.status === "AUTHENTIC" ? (
          /* ─── STATE 1: AUTHENTIC INVOICE (ONLY VIA AUTHORITATIVE DATABASE CONFIRMATION) ─── */
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden space-y-0">
            {/* Top Verified Header Banner */}
            <div className="bg-emerald-600 text-white p-5 text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                <span>✓ AUTHENTIC INVOICE</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">✓ Verified Palak Enterprises Bill</h2>
              <p className="text-xs text-emerald-100">
                This document is verified against official database records.
              </p>
            </div>

            {/* Invoiced Financial & Document Summary */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Prominent Amount & Status Card */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Total Invoiced Amount
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight block mt-0.5">
                    {formatCurrency(result.totalAmount)}
                  </span>
                </div>
                <div className="text-right flex flex-col justify-center items-end">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Payment Status
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 border shadow-2xs",
                      result.paymentStatus === "paid" || result.paymentStatus === "confirmed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : result.paymentStatus === "partially_paid"
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : "bg-amber-50 text-amber-900 border-amber-300"
                    )}
                  >
                    {result.paymentStatus === "paid" || result.paymentStatus === "confirmed" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>PAID</span>
                      </>
                    ) : result.paymentStatus === "partially_paid" ? (
                      <>
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span>PARTIAL PAID</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>PAYMENT DUE</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Document Key Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3 w-3 text-slate-400" />
                    Invoice Number
                  </span>
                  <div className="font-mono font-black text-slate-900 text-sm">{result.invoiceNumber}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    Type: <strong className="text-slate-700">{result.documentType || "TAX INVOICE"}</strong> (FY {result.financialYear})
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Invoice Date
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{formattedDate(result.invoiceDate)}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    Order Ref: <strong className="text-slate-700 font-mono">{result.orderCode || "Store Counter Bill"}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-slate-400" />
                    Payment Breakdown
                  </span>
                  <div className="flex justify-between font-mono text-[11px] text-slate-700">
                    <span>Paid: <strong>{formatCurrency(result.amountPaid)}</strong></span>
                    <span>Due: <strong className={result.amountDue > 0 ? "text-amber-700 font-black" : ""}>{formatCurrency(result.amountDue)}</strong></span>
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    Mode: {result.paymentMethod?.replace(/_/g, " ") || "Store Collection"}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Building className="h-3 w-3 text-slate-400" />
                    Issuing Entity
                  </span>
                  <div className="font-bold text-slate-900 text-xs">{result.businessName}</div>
                  <div className="text-[10px] text-slate-500">
                    CSC ID: 634165120013 • UDYAM-BR-11-0061705
                  </div>
                </div>
              </div>

              {/* Itemized Services / Products List */}
              {result.items && result.items.length > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                    Invoiced Service / Items ({result.items.length})
                  </span>
                  <div className="divide-y divide-slate-200/80">
                    {result.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                        <div>
                          <div className="font-bold text-slate-900 leading-snug">
                            {item.productName}
                          </div>
                          {item.description && (
                            <div className="text-[10px] text-slate-500 leading-tight">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-slate-700 font-semibold">
                            Qty: {item.quantity} {item.unit || "Pcs"}
                          </span>
                          {item.totalPrice !== undefined && item.totalPrice > 0 && (
                            <div className="font-mono font-bold text-slate-900 text-[11px]">
                              {formatCurrency(item.totalPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authoritative Badge Seal */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-[11px] text-emerald-950">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">✓ Verified against official records</span>
                  <p className="text-emerald-800 text-[10px] leading-tight">
                    This invoice is permanently recorded in the Palak Enterprises official billing ledger under Ward No. 7, Saniganj Mohalla, Chakia, East Champaran, Bihar - 845412.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : result?.status === "CANCELLED" ? (
          /* ─── STATE 2: CANCELLED INVOICE (CONFIRMED VOIDED BY DATABASE) ─── */
          <div className="bg-white rounded-2xl shadow-sm border border-amber-300 overflow-hidden space-y-0">
            <div className="bg-amber-600 text-white p-5 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
                <span>INVOICE CANCELLED</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">⚠ Cancelled Invoice</h2>
              <p className="text-xs text-amber-100">
                This invoice exists in our database but has been marked as CANCELLED.
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold">Cancellation Notice:</div>
                <p className="text-[11px]">
                  {result.cancellationReason || "This bill was voided by management and is no longer valid for payment or business claims."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase font-sans">Invoice Number</span>
                  <span className="font-bold text-slate-800">{result.invoiceNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase font-sans">Original Amount</span>
                  <span className="font-bold text-slate-800">{formatCurrency(result.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : result?.status === "UNAVAILABLE" ? (
          /* ─── STATE 4: SERVICE UNAVAILABLE (NETWORK / RPC / TIMEOUT) ─── */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden space-y-0">
            <div className="bg-slate-800 text-white p-5 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                <WifiOff className="h-3.5 w-3.5 text-white" />
                <span>Verification Offline</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">⚠ Unable to Verify</h2>
              <p className="text-xs text-slate-300">
                We couldn't connect to the Palak Enterprises verification service.
              </p>
            </div>

            <div className="p-6 text-center space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Unable to verify invoice <strong className="font-mono text-slate-900 font-bold">"{rawId}"</strong> right now because the authoritative verification database could not be reached. Please check your internet connection and try again.
              </p>

              <div>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#123B70] hover:bg-[#0e2c54] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  <span>Try Again</span>
                </button>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                Authenticity confirmation requires an active connection to official database records.
              </div>
            </div>
          </div>
        ) : (
          /* ─── STATE 3: INVALID INVOICE (NOT FOUND IN DATABASE) ─── */
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden space-y-0">
            <div className="bg-rose-600 text-white p-5 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                <XCircle className="h-3.5 w-3.5 text-white" />
                <span>Verification Failed</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">✕ Invalid Invoice</h2>
              <p className="text-xs text-rose-100">
                This invoice could not be verified in the Palak Enterprises billing system.
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-center">
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                No active or historical record matching <strong className="font-mono text-slate-900 font-bold">"{rawId}"</strong> was found in the authoritative database. Please verify that the invoice number was entered correctly.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Need Assistance from Palak Enterprises?
                </span>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                  <a
                    href={`tel:+91${business.primaryPhone}`}
                    className="inline-flex items-center gap-1.5 text-[#123B70] font-bold hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call Store: +91 {business.primaryPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(`Hello Palak Enterprises, I need help verifying invoice ${rawId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>WhatsApp Support</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Palak Enterprises Home</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 text-[11px] text-slate-400">
        © {new Date().getFullYear()} Palak Enterprises • CSC Digital Seva Kendra, Chakia, Bihar.
      </div>
    </div>
  );
};

export default VerifyInvoicePage;
