import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Package, MessageSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PalakDataStore, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest, type StoredDesignRequest } from "../lib/storage/store";
import { OrderTimeline } from "../components/OrderTimeline";
import { getWhatsAppLink } from "../config/business";

export const TrackOrderPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const [searchParams] = useSearchParams();

  const [queryCode, setQueryCode] = useState(searchParams.get("code") || "");
  const [searched, setSearched] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [services, setServices] = useState<StoredServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<StoredQuoteRequest[]>([]);
  const [designs, setDesigns] = useState<StoredDesignRequest[]>([]);

  const handleSearch = (codeToSearch?: string) => {
    const q = (codeToSearch !== undefined ? codeToSearch : queryCode).trim();
    if (!q) return;

    const result = PalakDataStore.lookupAny(q);
    setOrders(result.orders);
    setServices(result.services);
    setQuotes(result.quotes);
    setDesigns(result.designs);
    setSearched(true);
  };

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (initialCode) {
      setQueryCode(initialCode);
      handleSearch(initialCode);
    }
  }, [searchParams]);

  const hasAnyResults = orders.length > 0 || services.length > 0 || quotes.length > 0 || designs.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="bg-[#123B70] text-white py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center space-y-3">
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
            className="pt-4 max-w-lg mx-auto flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={queryCode}
                onChange={(e) => setQueryCode(e.target.value)}
                placeholder="e.g. PE-O-2026-1042 or 9905238015"
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-md pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-300 focus:bg-white focus:text-slate-900 focus:outline-hidden transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-md transition-transform hover:scale-105 cursor-pointer shrink-0"
            >
              <span>{currentLang === "hi" ? "ट्रैक करें" : "Track Status"}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-4 space-y-8">
        {searched && !hasAnyResults && (
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

        {/* 1. Orders Results */}
        {orders.map((order) => {
          const logs = PalakDataStore.getStatusHistory(order.orderCode);
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

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 text-[#123B70] border border-blue-200/60 px-3 py-1 text-xs font-bold">
                    {order.orderStatus.replace(/_/g, " ")}
                  </span>
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

              {/* Progress Milestones */}
              <OrderTimeline
                currentStatus={order.orderStatus}
                historyLogs={logs}
                entityType="order"
              />

              {/* Items Summary Table */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ordered Items ({order.items.length})
                </h4>
                <div className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          Qty: {item.quantity} ({item.unitPrice ? `₹${item.unitPrice}/pack` : ""})
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-baseline text-xs font-bold text-slate-800 border-t border-slate-100">
                  <span>Total Amount:</span>
                  <span className="text-sm font-extrabold text-[#123B70]">₹{order.totalAmount}</span>
                </div>
              </div>
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
    </div>
  );
};

export default TrackOrderPage;
