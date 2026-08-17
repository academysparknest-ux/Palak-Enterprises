import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Globe,
  FileText,
  Palette,
  Lock,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PalakDataStore, type StoredOrder, type StoredServiceRequest, type StoredQuoteRequest, type StoredDesignRequest } from "../lib/storage/store";
import {
  getStaffOrders,
  getStaffServiceRequests,
  getStaffQuoteRequests,
  updateStaffOrderStatus,
  updateStaffServiceStatus,
  updateStaffQuoteStatus,
} from "../lib/supabase/database";

export const AdminPage: React.FC = () => {
  const { user, isStaff, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"orders" | "services" | "quotes" | "designs">("orders");
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<StoredServiceRequest[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<StoredQuoteRequest[]>([]);
  const [designRequests, setDesignRequests] = useState<StoredDesignRequest[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try Supabase live fetch
      const [cloudOrders, cloudServices, cloudQuotes] = await Promise.all([
        getStaffOrders().catch(() => []),
        getStaffServiceRequests().catch(() => []),
        getStaffQuoteRequests().catch(() => []),
      ]);

      if (cloudOrders.length > 0) setOrders(cloudOrders);
      else setOrders(PalakDataStore.getOrders());

      if (cloudServices.length > 0) setServiceRequests(cloudServices);
      else setServiceRequests(PalakDataStore.getServiceRequests());

      if (cloudQuotes.length > 0) setQuoteRequests(cloudQuotes);
      else setQuoteRequests(PalakDataStore.getQuoteRequests());

      setDesignRequests(PalakDataStore.getDesignRequests());
    } catch {
      setOrders(PalakDataStore.getOrders());
      setServiceRequests(PalakDataStore.getServiceRequests());
      setQuoteRequests(PalakDataStore.getQuoteRequests());
      setDesignRequests(PalakDataStore.getDesignRequests());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) {
      loadData();
    }
  }, [isStaff, loadData]);

  const handleUpdateOrderStatus = async (orderCode: string, newStatus: StoredOrder["orderStatus"]) => {
    try {
      await updateStaffOrderStatus(orderCode, newStatus);
    } catch (e) {
      console.warn("Cloud update notice:", e);
    }
    PalakDataStore.updateOrderStatus(orderCode, newStatus);
    await loadData();
  };

  const handleUpdateServiceStatus = async (requestCode: string, newStatus: StoredServiceRequest["requestStatus"]) => {
    try {
      await updateStaffServiceStatus(requestCode, newStatus);
    } catch (e) {
      console.warn("Cloud update notice:", e);
    }
    PalakDataStore.updateServiceRequestStatus(requestCode, newStatus);
    await loadData();
  };

  const handleUpdateQuoteStatus = async (quoteCode: string, newStatus: StoredQuoteRequest["quoteStatus"], amount?: number) => {
    try {
      await updateStaffQuoteStatus(quoteCode, newStatus, amount);
    } catch (e) {
      console.warn("Cloud update notice:", e);
    }
    PalakDataStore.updateQuoteStatus(quoteCode, newStatus, amount);
    await loadData();
  };

  const handleUpdateDesignStatus = (designCode: string, newStatus: StoredDesignRequest["designStatus"]) => {
    PalakDataStore.updateDesignStatus(designCode, newStatus);
    setDesignRequests(PalakDataStore.getDesignRequests());
  };

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 max-w-md text-center space-y-4 shadow-card">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Staff ERP Login Required</h2>
          <p className="text-xs text-slate-500">
            You must log in with authorized staff credentials to access the Palak Operations & Production Management ERP.
          </p>
          <Link
            to="/account"
            className="inline-flex items-center justify-center rounded-xl bg-[#123B70] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] w-full"
          >
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  const orderStatuses: StoredOrder["orderStatus"][] = [
    "NEW",
    "UNDER_REVIEW",
    "CONFIRMED",
    "DESIGN_REVIEW",
    "IN_PRODUCTION",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ];

  const serviceStatuses: StoredServiceRequest["requestStatus"][] = [
    "NEW",
    "DOCUMENTS_VERIFIED",
    "IN_PROCESSING",
    "ACTION_REQUIRED",
    "SUBMITTED_TO_PORTAL",
    "COMPLETED",
    "REJECTED",
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-20">
      {/* Top Staff ERP Navigation Bar */}
      <div className="bg-[#0F172A] text-white py-4 px-4 sm:px-6 border-b border-slate-800">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
              PE
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide block">
                Palak Enterprises — Staff Operations ERP
              </span>
              <span className="text-[10px] text-slate-400">
                Logged in as: {user?.name || "Staff Admin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh queues from Supabase"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab("orders")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "orders" ? "bg-white border-[#123B70] shadow-md ring-2 ring-[#123B70]/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Printing Orders</span>
              <Package className="h-4 w-4 text-[#123B70]" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{orders.length}</div>
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "services" ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Digital / CSC</span>
              <Globe className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{serviceRequests.length}</div>
          </button>

          <button
            onClick={() => setActiveTab("quotes")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "quotes" ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Quote Inquiries</span>
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{quoteRequests.length}</div>
          </button>

          <button
            onClick={() => setActiveTab("designs")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "designs" ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Design Tasks</span>
              <Palette className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{designRequests.length}</div>
          </button>
        </div>

        {/* Tab Content Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab} Queue Management
            </h2>
            <div className="text-xs text-slate-400">
              Live updates synced to client tracking timeline
            </div>
          </div>

          {/* 1. Printing Orders List */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#123B70] text-sm">
                          {order.orderCode}
                        </span>
                        <span className="text-xs text-slate-600 ml-2 font-medium">
                          {order.customerName} ({order.customerPhone})
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          ₹{order.totalAmount}
                        </span>
                        <select
                          value={order.orderStatus}
                          onChange={(e: any) => handleUpdateOrderStatus(order.orderCode, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                          {orderStatuses.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">• {i.productName}</span>
                          <span>(Qty: {i.quantity})</span>
                          {i.uploadedFileName && (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                              File attached: {i.uploadedFileName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.orderNotes && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                        Customer Note: {order.orderNotes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No active printing orders in queue.</div>
              )}
            </div>
          )}

          {/* 2. Digital Services List */}
          {activeTab === "services" && (
            <div className="space-y-4">
              {serviceRequests.length > 0 ? (
                serviceRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-amber-600 text-sm">
                          {req.requestCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900 ml-2">
                          {req.serviceName}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({req.customerName} - {req.customerPhone})
                        </span>
                      </div>

                      <select
                        value={req.requestStatus}
                        onChange={(e: any) => handleUpdateServiceStatus(req.requestCode, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                      >
                        {serviceStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {req.uploadedDocumentNames && req.uploadedDocumentNames.length > 0 && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400">Attached Documents:</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {req.uploadedDocumentNames.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No digital service applications in queue.</div>
              )}
            </div>
          )}

          {/* 3. Quotes List */}
          {activeTab === "quotes" && (
            <div className="space-y-4">
              {quoteRequests.length > 0 ? (
                quoteRequests.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#123B70] text-sm">{q.quoteCode}</span>
                        <span className="text-xs font-bold text-slate-800 ml-2">{q.serviceOrProductType}</span>
                        <span className="text-xs text-slate-500 ml-1">({q.customerName} - {q.customerPhone})</span>
                      </div>

                      <select
                        value={q.quoteStatus}
                        onChange={(e: any) => handleUpdateQuoteStatus(q.quoteCode, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="NEW">NEW</option>
                        <option value="ESTIMATE_PREPARED">ESTIMATE_PREPARED</option>
                        <option value="QUOTE_SENT">QUOTE_SENT</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="DECLINED">DECLINED</option>
                      </select>
                    </div>

                    <div className="text-xs text-slate-600 grid grid-cols-2 gap-2">
                      <div>Qty: {q.quantity}</div>
                      <div>Material: {q.materialPreferences || "Standard"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No quote inquiries pending.</div>
              )}
            </div>
          )}

          {/* 4. Designs List */}
          {activeTab === "designs" && (
            <div className="space-y-4">
              {designRequests.length > 0 ? (
                designRequests.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-purple-700 text-sm">{d.designCode}</span>
                        <span className="text-xs font-bold text-slate-900 ml-2">{d.titleOrEvent}</span>
                        <span className="text-xs text-slate-500 ml-1">({d.customerName})</span>
                      </div>

                      <select
                        value={d.designStatus}
                        onChange={(e: any) => handleUpdateDesignStatus(d.designCode, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="NEW">NEW</option>
                        <option value="IN_DESIGN">IN_DESIGN</option>
                        <option value="PROOF_SENT">PROOF_SENT</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="SENT_TO_PRINT">SENT_TO_PRINT</option>
                      </select>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      Content: {d.contentText}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No design tasks pending.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
