import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Package, MessageSquare, ShieldCheck, Loader2, Receipt, Download, Printer, Eye, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { SEO } from "../components/SEO";
import { PalakDataStore, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest, type StoredDesignRequest } from "../lib/storage/store";
import { fetchPublicTracking, getInvoiceByOrderCode, type PublicTrackingResponse } from "../lib/supabase/database";
import { OrderTimeline } from "../components/OrderTimeline";
import { OrderItemsSummaryList } from "../components/orders/OrderItemsSummaryList";
import { getWhatsAppLink } from "../config/business";
import { getSingleOrderQueueInfo, extractRazorpayId } from "../lib/queue";
const InvoiceModal = React.lazy(() => import("../components/invoice/InvoiceModal"));
import type { StoredInvoice } from "../lib/invoice/types";
import { PalakInvoiceStore } from "../lib/invoice/invoiceStore";
import { downloadInvoicePDF, printInvoiceElement } from "../lib/invoice/pdfUtils";

export const TrackOrderPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [searchParams, setSearchParams] = useSearchParams();

  const [queryCode, setQueryCode] = useState(searchParams.get("code") || "");
  const [phoneVerification, setPhoneVerification] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [services, setServices] = useState<StoredServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<StoredQuoteRequest[]>([]);
  const [designs, setDesigns] = useState<StoredDesignRequest[]>([]);
  const [rpcTrackingResult, setRpcTrackingResult] = useState<PublicTrackingResponse | null>(null);

  // Invoice view modal state
  const [activeInvoice, setActiveInvoice] = useState<StoredInvoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const handleSearch = useCallback(async (codeToSearch?: string) => {
    const q = (codeToSearch !== undefined ? codeToSearch : queryCode).trim();
    if (!q) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("code", q);
      return next;
    }, { replace: true });

    setLoading(true);
    setSearched(true);

    // 1. Try secure Supabase RPC tracking first
    const rpcRes = await fetchPublicTracking(q, phoneVerification);
    if (rpcRes.success || rpcRes.error === "NOT_FOUND" || rpcRes.error === "PHONE_MISMATCH") {
      setRpcTrackingResult(rpcRes);
      setOrders([]);
      setServices([]);
      setQuotes([]);
      setDesigns([]);

      if (rpcRes.success) {
        // Fetch invoice if it's an order
        const inv = await getInvoiceByOrderCode(q, phoneVerification).catch(() => null);
        setActiveInvoice(inv || PalakInvoiceStore.getLocalInvoiceByOrderCode(q) || null);
      } else {
        setActiveInvoice(null);
      }

      setLoading(false);
      return;
    }

    // 2. Fallback to local store ONLY on true network offline error
    setRpcTrackingResult(null);
    const result = PalakDataStore.lookupAny(q);
    setOrders(result.orders);
    setServices(result.services);
    setQuotes(result.quotes);
    setDesigns(result.designs);

    const localInv = PalakInvoiceStore.getLocalInvoiceByOrderCode(q);
    setActiveInvoice(localInv || null);

    setLoading(false);
  }, [queryCode, phoneVerification, setSearchParams]);

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (initialCode) {
      setQueryCode(initialCode);
      handleSearch(initialCode);
    }
  }, [searchParams, handleSearch]);

  const hasAnyResults = orders.length > 0 || services.length > 0 || quotes.length > 0 || designs.length > 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      <SEO
        title={{ en: "Track Order Status", hi: "ऑर्डर स्थिति ट्रैक करें" }}
        description={{ en: "Real-time print order and digital service tracking for Palak Enterprises customers.", hi: "पालक इंटरप्राइजेज ग्राहकों के लिए रीयल-टाइम प्रिंट ऑर्डर एवं सेवा ट्रैकिंग।" }}
        noIndex={true}
      />
      {/* Header */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-12 px-4 sm:px-6">
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
        <div className="relative mx-auto max-w-4xl text-center space-y-3">
          <div className="text-xs text-slate-300">
            <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Universal Tracking</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {currentLang === "hi" ? "ऑर्डर एवं सेवा अनुरोध ट्रैक करें" : "Track Order & Service Progress"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            {currentLang === "hi"
              ? "अपना ऑर्डर आईडी (PE-O-...), सेवा कोड (PE-S-...), कोटेशन (PE-Q-...) या मोबाइल नंबर दर्ज करें।"
              : "Enter your Order ID, Service Request Code, Quote Reference, or Registered Mobile Number."}
          </p>

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="pt-4 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                placeholder="Tracking ID (e.g. PE-O-2026-1042)"
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-md pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-300 focus:bg-white focus:text-slate-900 focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            <div className="w-full sm:w-44">
              <input
                type="tel"
                value={phoneVerification}
                onChange={(e) => setPhoneVerification(e.target.value)}
                placeholder="Phone (Optional)"
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-3 text-xs sm:text-sm text-white placeholder-slate-300 focus:bg-white focus:text-slate-900 focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-md transition-transform hover:scale-105 cursor-pointer shrink-0"
            >
              <span>{currentLang === "hi" ? "ट्रैक करें" : "Track Status"}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-4 space-y-8">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-card flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#123B70] animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Fetching verified tracking record from Supabase Cloud...</p>
          </div>
        )}

        {searched && !loading && !rpcTrackingResult && !hasAnyResults && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-card animate-fadeUp">
            <Package className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              {currentLang === "hi" ? "कोई रिकॉर्ड नहीं मिला" : `No records found for "${queryCode}"`}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {currentLang === "hi"
                ? "कृपया अपना कोड (जैसे PE-O-2026-XXXX) या 10 अंकों का मोबाइल नंबर पुनः जांचें।"
                : "Please double-check your Order / Service reference ID or 10-digit mobile number."}
            </p>
            <div className="pt-2">
              <a
                href={getWhatsAppLink(`Hello Palak, I want to check my order status for: ${queryCode}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Ask on WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* Live Cloud Database Tracking Result */}
        {rpcTrackingResult?.record && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-card space-y-6 animate-fadeUp">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {rpcTrackingResult.record.orderCode || rpcTrackingResult.record.requestCode || rpcTrackingResult.record.quoteCode}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Verified Cloud Record
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Customer: {rpcTrackingResult.record.customerName} ({rpcTrackingResult.record.customerPhoneMasked})
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-left sm:text-right">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Order Status</div>
                  <div className="text-xs font-black text-[#123B70] uppercase">
                    {rpcTrackingResult.record.orderStatus || rpcTrackingResult.record.requestStatus || rpcTrackingResult.record.quoteStatus || "NEW"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment</div>
                  <div className={`text-xs font-black uppercase ${
                    rpcTrackingResult.record.paymentStatus === "confirmed" || rpcTrackingResult.record.paymentStatus === "paid"
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}>
                    {rpcTrackingResult.record.paymentMethod === "upi_online" || rpcTrackingResult.record.paymentMethod === "pay_online"
                      ? (rpcTrackingResult.record.paymentStatus === "confirmed" || rpcTrackingResult.record.paymentStatus === "paid"
                          ? "PAID ONLINE"
                          : "ONLINE — PENDING")
                      : (rpcTrackingResult.record.paymentStatus === "confirmed" || rpcTrackingResult.record.paymentStatus === "paid"
                          ? "PAY AT SHOP — PAID"
                          : "PAY AT SHOP — PENDING")}
                  </div>
                  {(() => {
                    const rzpId = extractRazorpayId(rpcTrackingResult.record.orderNotes);
                    return rzpId ? (
                      <div className="text-[10px] font-mono text-emerald-800 font-bold mt-0.5 pt-0.5 border-t border-slate-200/80">
                        Txn: <span className="select-all">{rzpId}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Queue Priority Banner */}
            {rpcTrackingResult.entityType === "order" && (() => {
              const qInfo = getSingleOrderQueueInfo(rpcTrackingResult.record, PalakDataStore.getOrders());
              const isPriority = qInfo.queueType === "priority";
              return (
                <div className={`rounded-2xl p-4 border space-y-1.5 ${
                  isPriority
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-950"
                    : "bg-slate-100 border-slate-200 text-slate-800"
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isPriority ? "🔥" : "📄"}</span>
                      <div>
                        <span className="font-black text-xs uppercase tracking-wide block">
                          {isPriority ? "🔥 Priority Printing Queue" : "📄 Normal Printing Queue"}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {isPriority ? "💳 Payment Confirmed" : "💰 Payment at Shop Counter"}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                      isPriority
                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 shadow-xs"
                    }`}>
                      {isPriority ? `Priority Position: #${qInfo.positionInQueue}` : `Normal Queue Position: #${qInfo.positionInQueue}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                    {isPriority
                      ? (currentLang === "hi"
                          ? "आपके ऑर्डर को प्रिंटिंग कतार में प्राथमिकता दी गई है। आपको सामान्य लाइन में इंतज़ार नहीं करना होगा।"
                          : "Your order has priority in the printing queue. Orders are prepared first without waiting in normal queue.")
                      : (currentLang === "hi"
                          ? "आपका ऑर्डर सामान्य कतार में है। दुकान काउंटर पर आपकी मौजूदगी सत्यापित होते ही प्रिंट शुरू होगा और आप काउंटर पर भुगतान करेंगे।"
                          : "Your order is in the normal queue. Printing starts once your presence/availability is verified at the counter, and you pay upon pickup.")}
                  </p>
                </div>
              );
            })()}

            {/* Timeline */}
            <OrderTimeline
              entityType={(rpcTrackingResult.entityType as any) || "order"}
              currentStatus={rpcTrackingResult.record.orderStatus || rpcTrackingResult.record.requestStatus || rpcTrackingResult.record.quoteStatus}
              historyLogs={(rpcTrackingResult.timeline || []).map((tl, idx) => ({
                id: `cloud_tl_${idx}`,
                entityType: (rpcTrackingResult.entityType as any) || "order",
                entityCode: rpcTrackingResult.record.orderCode || rpcTrackingResult.record.requestCode || rpcTrackingResult.record.quoteCode,
                previousStatus: tl.previousStatus,
                newStatus: tl.newStatus,
                messageEn: tl.messageEn,
                messageHi: tl.messageHi,
                performedBy: tl.performedBy,
                createdAt: tl.createdAt,
              }))}
            />

            {/* Ordered Products & Add-ons (Cloud Verified Order) */}
            {rpcTrackingResult.entityType === "order" && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-[#123B70]" />
                    <span>
                      {currentLang === "hi" ? "ऑर्डर की गई सामग्री एवं ऐड-ऑन्स" : "Ordered Products & Add-ons"}
                      {Array.isArray(rpcTrackingResult.record.items) ? ` (${rpcTrackingResult.record.items.length})` : ""}
                    </span>
                  </h4>
                  {rpcTrackingResult.record.totalAmount !== undefined && (
                    <span className="text-xs text-slate-500 font-semibold">
                      {currentLang === "hi" ? "कुल राशि:" : "Total:"}{" "}
                      <strong className="text-slate-900 font-extrabold text-sm font-mono">
                        ₹{rpcTrackingResult.record.totalAmount}
                      </strong>
                    </span>
                  )}
                </div>

                <OrderItemsSummaryList
                  items={rpcTrackingResult.record.items || []}
                  rootPrintSnapshot={rpcTrackingResult.record.printSnapshot}
                  currentLang={currentLang}
                />
              </div>
            )}
            {activeInvoice && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/40 p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">Official Tax Invoice / Bill</span>
                        <span className="font-mono text-[11px] font-black text-[#123B70] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {activeInvoice.invoiceNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-800 font-semibold">
                        {currentLang === "hi" ? "आधिकारिक बिल तैयार है • ऑनलाइन डाउनलोड करें" : "Official verified invoice is ready for download & printing"}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 self-start sm:self-auto">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{currentLang === "hi" ? "बिल तैयार" : "Invoice Generated"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-600">
                    Grand Total: <strong className="text-slate-900 font-black text-sm">₹{activeInvoice.totalAmount}</strong> • Status: <strong className="uppercase text-emerald-800 font-bold">{activeInvoice.paymentStatus}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInvoiceModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{currentLang === "hi" ? "बिल देखें" : "View Bill"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={downloadingInvoice}
                      onClick={async () => {
                        setDownloadingInvoice(true);
                        await downloadInvoicePDF(activeInvoice);
                        setDownloadingInvoice(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{downloadingInvoice ? "Downloading..." : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await printInvoiceElement(activeInvoice);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local Orders Results */}
        {orders.map((order) => {
          const logs = PalakDataStore.getStatusHistory(order.orderCode);
          const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "paid";
          const isOnline = order.paymentMethod === "upi_online" || order.paymentMethod === "pay_online";
          const qInfo = getSingleOrderQueueInfo(order, PalakDataStore.getOrders());
          const isPriority = qInfo.queueType === "priority";

          return (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6 animate-fadeUp"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Physical Printing Order
                  </span>
                  <h2 className="text-xl font-black text-[#123B70] tracking-wide mt-0.5">
                    {order.orderCode}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Customer: <span className="font-semibold text-slate-800">{order.customerName}</span> ({order.customerPhone})
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1 text-left">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Order Status</div>
                    <div className="text-xs font-black text-[#123B70] uppercase">
                      {order.orderStatus.replace(/_/g, " ")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-left">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment</div>
                    <div className={`text-xs font-black uppercase ${
                      isPaid ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {isOnline
                        ? (isPaid ? "PAID ONLINE" : "ONLINE — PENDING")
                        : (isPaid ? "PAY AT SHOP — PAID" : "PAY AT SHOP — PENDING")}
                    </div>
                    {(() => {
                      const rzpId = extractRazorpayId(order.orderNotes);
                      return rzpId ? (
                        <div className="text-[10px] font-mono text-emerald-800 font-bold mt-0.5 pt-0.5 border-t border-slate-200/80">
                          Txn: <span className="select-all">{rzpId}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <a
                    href={getWhatsAppLink(`Inquiry regarding Order ${order.orderCode}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    title="WhatsApp query"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Queue Priority Banner */}
              <div className={`rounded-2xl p-4 border space-y-1.5 ${
                isPriority
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-950"
                  : "bg-slate-100 border-slate-200 text-slate-800"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{isPriority ? "🔥" : "📄"}</span>
                    <div>
                      <span className="font-black text-xs uppercase tracking-wide block">
                        {isPriority ? "🔥 Priority Printing Queue" : "📄 Normal Printing Queue"}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {isPriority ? "💳 Payment Confirmed" : "💰 Payment at Shop Counter"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                    isPriority
                      ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 shadow-xs"
                  }`}>
                    {isPriority ? `Priority Position: #${qInfo.positionInQueue}` : `Normal Queue Position: #${qInfo.positionInQueue}`}
                  </span>
                </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                    {isPriority
                      ? (currentLang === "hi"
                          ? "आपके ऑर्डर को प्रिंटिंग कतार में प्राथमिकता दी गई है। आपको सामान्य लाइन में इंतज़ार नहीं करना होगा।"
                          : "Your order has priority in the printing queue. Orders are prepared first without waiting in normal queue.")
                      : (currentLang === "hi"
                          ? "आपका ऑर्डर सामान्य कतार में है। दुकान काउंटर पर आपकी मौजूदगी सत्यापित होते ही प्रिंट शुरू होगा और आप काउंटर पर भुगतान करेंगे।"
                          : "Your order is in the normal queue. Printing starts once your presence/availability is verified at the counter, and you pay upon pickup.")}
                  </p>
                </div>

                {/* Progress Milestones Timeline */}
                <OrderTimeline
                  currentStatus={order.orderStatus}
                  historyLogs={logs}
                  entityType="order"
                />

                {/* Items Summary Table & Concise Production Specifications */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-[#123B70]" />
                    <span>
                      {currentLang === "hi" ? "ऑर्डर की गई सामग्री एवं ऐड-ऑन्स" : "Ordered Products & Add-ons"} ({order.items.length})
                    </span>
                  </h4>

                  <OrderItemsSummaryList
                    items={order.items || []}
                    rootPrintSnapshot={order.printSnapshot}
                    currentLang={currentLang}
                  />

                  <div className="pt-2 flex justify-between items-baseline text-xs font-bold text-slate-800 border-t border-slate-100">
                    <span>{currentLang === "hi" ? "कुल राशि:" : "Total Amount:"}</span>
                    <span className="text-sm font-extrabold text-[#123B70] font-mono">₹{order.totalAmount}</span>
                  </div>
                </div>

              {/* Official Invoice Card for Local Order */}
              {(() => {
                const orderInv = (activeInvoice && activeInvoice.orderCode && activeInvoice.orderCode.toUpperCase() === order.orderCode.toUpperCase())
                  ? activeInvoice
                  : PalakInvoiceStore.getLocalInvoiceByOrderCode(order.orderCode);

                if (!orderInv && order.orderStatus !== "COMPLETED") return null;

                return (
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">Tax Invoice & Bill</span>
                            {orderInv && (
                              <span className="font-mono text-[10px] font-black text-[#123B70] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {orderInv.invoiceNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-emerald-800 font-semibold">
                            {currentLang === "hi" ? "आधिकारिक बिल उपलब्ध है" : "Official verified invoice is ready"}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 self-start sm:self-auto">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Ready</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (orderInv) {
                            setActiveInvoice(orderInv);
                            setInvoiceModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{currentLang === "hi" ? "बिल देखें" : "View Bill"}</span>
                      </button>

                      {orderInv && (
                        <button
                          type="button"
                          onClick={async () => {
                            await downloadInvoicePDF(orderInv);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {/* 2. Digital Services Results */}
        {services.map((req) => {
          const logs = PalakDataStore.getStatusHistory(req.requestCode);
          return (
            <div
              key={req.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card space-y-6 animate-fadeUp"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">
                    Online & CSC Service Request
                  </span>
                  <h2 className="text-xl font-black text-[#123B70] tracking-wide mt-0.5">
                    {req.requestCode}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Service: <span className="font-semibold text-slate-800">{req.serviceName}</span> • Applicant: {req.customerName}
                  </div>
                </div>

                <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 text-xs font-bold">
                  {req.requestStatus.replace(/_/g, " ")}
                </span>
              </div>

              <OrderTimeline
                currentStatus={req.requestStatus}
                historyLogs={logs}
                entityType="service_request"
              />

              {req.acknowledgementNumber && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Govt Acknowledgement No:</span>
                  <span className="font-mono font-bold text-[#123B70]">{req.acknowledgementNumber}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* 3. Quotes Results */}
        {quotes.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4 animate-fadeUp"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Custom Quote Request</span>
                <h3 className="text-lg font-bold text-slate-900">{q.quoteCode}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {q.quoteStatus}
              </span>
            </div>

            <div className="text-xs text-slate-600 grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Product:</span> {q.serviceOrProductType}</div>
              <div><span className="text-slate-400">Quantity:</span> {q.quantity}</div>
              {q.quotedAmount && (
                <div className="col-span-2 text-emerald-700 font-bold text-sm">
                  Quoted Estimate: ₹{q.quotedAmount}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 4. Designs Results */}
        {designs.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4 animate-fadeUp"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Design Studio Job</span>
                <h3 className="text-lg font-bold text-slate-900">{d.designCode}</h3>
              </div>
              <span className="rounded-full bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 text-xs font-bold">
                {d.designStatus}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Project: <span className="font-semibold text-slate-800">{d.titleOrEvent}</span> ({d.designCategory})
            </p>
          </div>
        ))}
      </div>

      {/* Customer Invoice Preview Modal */}
      {invoiceModalOpen && (
        <React.Suspense fallback={null}>
          <InvoiceModal
            isOpen={invoiceModalOpen}
            onClose={() => setInvoiceModalOpen(false)}
            invoice={activeInvoice}
            isAdmin={false}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default TrackOrderPage;
