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
  Search,
  CheckCircle2,
  XCircle,
  Download,
  MessageSquare,
  Settings,
  Save,
  Printer,
  Eye,
  X,
  CreditCard,
  History,
  FileDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  PalakDataStore,
  type StoredOrder,
  type StoredServiceRequest,
  type StoredQuoteRequest,
  type StoredDesignRequest,
} from "../lib/storage/store";
import {
  getStaffOrders,
  getStaffServiceRequests,
  getStaffQuoteRequests,
  updateStaffOrderStatus,
  updateStaffOrderPaymentStatus,
  addStaffOrderNote,
  getOrderStatusHistory,
  getSecureSignedUrl,
  updateStaffServiceStatus,
  updateStaffQuoteStatus,
  getPrintPricingConfig,
  updatePrintPricingConfig,
} from "../lib/supabase/database";
import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingConfig,
} from "../config/printPricing";
import { getWhatsAppLink } from "../config/business";
import { cn } from "../lib/utils";

export const AdminPage: React.FC = () => {
  const { user, isStaff, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"orders" | "pricing" | "services" | "quotes" | "designs">("orders");
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<StoredServiceRequest[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<StoredQuoteRequest[]>([]);
  const [designRequests, setDesignRequests] = useState<StoredDesignRequest[]>([]);

  // Search & Filter for Orders
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "TODAY" | "NEW" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "COMPLETED" | "UNPAID">("ALL");

  // Selected Order Drawer / Modal State
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<StoredOrder | null>(null);
  const [orderHistoryTimeline, setOrderHistoryTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [staffNoteInput, setStaffNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Pricing Config
  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cloudOrders, cloudServices, cloudQuotes, pricing] = await Promise.all([
        getStaffOrders().catch(() => []),
        getStaffServiceRequests().catch(() => []),
        getStaffQuoteRequests().catch(() => []),
        getPrintPricingConfig().catch(() => DEFAULT_PRINT_PRICING),
      ]);

      if (cloudOrders.length > 0) setOrders(cloudOrders);
      else setOrders(PalakDataStore.getOrders());

      if (cloudServices.length > 0) setServiceRequests(cloudServices);
      else setServiceRequests(PalakDataStore.getServiceRequests());

      if (cloudQuotes.length > 0) setQuoteRequests(cloudQuotes);
      else setQuoteRequests(PalakDataStore.getQuoteRequests());

      setDesignRequests(PalakDataStore.getDesignRequests());
      setPricingConfig(pricing);
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

  // Open Order Drawer & Load Timeline
  const handleOpenOrderModal = async (order: StoredOrder) => {
    setSelectedOrderForModal(order);
    setStaffNoteInput(order.staffNotes || "");
    setLoadingTimeline(true);
    try {
      const history = await getOrderStatusHistory(order.orderCode);
      setOrderHistoryTimeline(history);
    } catch (e) {
      console.warn("Timeline fetch notice:", e);
      setOrderHistoryTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleUpdateOrderStatus = async (orderCode: string, newStatus: StoredOrder["orderStatus"]) => {
    try {
      await updateStaffOrderStatus(orderCode, newStatus);
    } catch (e) {
      console.warn("Cloud update notice:", e);
    }
    PalakDataStore.updateOrderStatus(orderCode, newStatus);
    await loadData();
    if (selectedOrderForModal && selectedOrderForModal.orderCode === orderCode) {
      setSelectedOrderForModal((prev) => prev ? { ...prev, orderStatus: newStatus } : null);
      const history = await getOrderStatusHistory(orderCode);
      setOrderHistoryTimeline(history);
    }
  };

  const handleTogglePaymentStatus = async (order: StoredOrder) => {
    const nextStatus = order.paymentStatus === "confirmed" ? "pending" : "confirmed";
    setUpdatingPayment(true);
    try {
      await updateStaffOrderPaymentStatus(order.orderCode, nextStatus);
      PalakDataStore.updateOrderPaymentStatus(order.orderCode, nextStatus);
      await loadData();
      if (selectedOrderForModal && selectedOrderForModal.orderCode === order.orderCode) {
        setSelectedOrderForModal((prev) => prev ? { ...prev, paymentStatus: nextStatus } : null);
        const history = await getOrderStatusHistory(order.orderCode);
        setOrderHistoryTimeline(history);
      }
    } catch (e) {
      console.error("Payment status update error:", e);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleSaveStaffNote = async (orderCode: string) => {
    if (!staffNoteInput.trim()) return;
    setSavingNote(true);
    try {
      await addStaffOrderNote(orderCode, staffNoteInput.trim());
      PalakDataStore.addStaffOrderNote(orderCode, staffNoteInput.trim());
      await loadData();
      if (selectedOrderForModal && selectedOrderForModal.orderCode === orderCode) {
        setSelectedOrderForModal((prev) => prev ? { ...prev, staffNotes: staffNoteInput.trim() } : null);
        const history = await getOrderStatusHistory(orderCode);
        setOrderHistoryTimeline(history);
      }
    } catch (e) {
      console.error("Save note error:", e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDownloadFile = async (urlOrPath: string, _fileName?: string) => {
    if (!urlOrPath) return;
    try {
      const signed = await getSecureSignedUrl(urlOrPath, 3600);
      if (signed) {
        window.open(signed, "_blank");
      } else {
        window.open(urlOrPath, "_blank");
      }
    } catch {
      window.open(urlOrPath, "_blank");
    }
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

  const handleSavePricingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricingSaving(true);
    try {
      await updatePrintPricingConfig(pricingConfig);
      setPricingSavedNotice(true);
      setTimeout(() => setPricingSavedNotice(false), 3000);
    } catch (err) {
      console.error("Pricing update error:", err);
    } finally {
      setPricingSaving(false);
    }
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
    "IN_PRODUCTION",
    "READY_FOR_PICKUP",
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

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // KPI calculations
  const totalOrdersCount = orders.length;
  const todayOrdersCount = orders.filter((o) => isToday(o.createdAt)).length;
  const newOrdersCount = orders.filter((o) => o.orderStatus === "NEW" || o.orderStatus === "UNDER_REVIEW").length;
  const printingOrdersCount = orders.filter((o) => o.orderStatus === "IN_PRODUCTION").length;
  const readyOrdersCount = orders.filter((o) => o.orderStatus === "READY_FOR_PICKUP").length;
  const completedOrdersCount = orders.filter((o) => o.orderStatus === "COMPLETED").length;
  const unpaidOrdersCount = orders.filter((o) => o.paymentStatus === "pending" || !o.paymentStatus).length;

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q);

    let matchesQuick = true;
    if (quickFilter === "TODAY") {
      matchesQuick = isToday(o.createdAt);
    } else if (quickFilter === "NEW") {
      matchesQuick = o.orderStatus === "NEW" || o.orderStatus === "UNDER_REVIEW";
    } else if (quickFilter === "IN_PRODUCTION") {
      matchesQuick = o.orderStatus === "IN_PRODUCTION";
    } else if (quickFilter === "READY_FOR_PICKUP") {
      matchesQuick = o.orderStatus === "READY_FOR_PICKUP";
    } else if (quickFilter === "COMPLETED") {
      matchesQuick = o.orderStatus === "COMPLETED";
    } else if (quickFilter === "UNPAID") {
      matchesQuick = o.paymentStatus === "pending" || !o.paymentStatus;
    }

    const matchesStatus = statusFilter === "ALL" || o.orderStatus === statusFilter;
    return matchesQuery && matchesQuick && matchesStatus;
  });

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setActiveTab("orders")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "orders" ? "bg-white border-[#123B70] shadow-md ring-2 ring-[#123B70]/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Print Orders</span>
              <Package className="h-4 w-4 text-[#123B70]" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{orders.length}</div>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "pricing" ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Print Pricing</span>
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xs font-bold text-emerald-600 mt-2">Active Rates</div>
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
              <span className="text-xs font-bold text-slate-500">Design Studio</span>
              <Palette className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{designRequests.length}</div>
          </button>
        </div>

        {/* Tab 1: Printing Orders Queue */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* New Order Alert Banner */}
            {newOrdersCount > 0 && (
              <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="font-extrabold text-xs sm:text-sm block">
                      🔔 {newOrdersCount} New Online Print Order{newOrdersCount > 1 ? "s" : ""} Received!
                    </span>
                    <span className="text-[11px] text-amber-700">
                      Orders submitted via website are synced to Supabase database. Review and start production.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setQuickFilter("NEW");
                    setStatusFilter("ALL");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  View New Orders
                </button>
              </div>
            )}

            {/* Quick Filter Summary Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <button
                onClick={() => {
                  setQuickFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "ALL" && statusFilter === "ALL"
                    ? "bg-white border-[#123B70] shadow-sm ring-2 ring-[#123B70]/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-slate-500">Total Orders</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("TODAY");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "TODAY"
                    ? "bg-blue-50/80 border-blue-600 shadow-sm ring-2 ring-blue-600/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-blue-700">Today's</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">{todayOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("NEW");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "NEW"
                    ? "bg-amber-50/80 border-amber-600 shadow-sm ring-2 ring-amber-600/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-amber-700">Pending Review</div>
                <div className="text-xl font-black text-amber-900 mt-0.5">{newOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("IN_PRODUCTION");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "IN_PRODUCTION"
                    ? "bg-indigo-50/80 border-indigo-600 shadow-sm ring-2 ring-indigo-600/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-indigo-700">Printing</div>
                <div className="text-xl font-black text-indigo-900 mt-0.5">{printingOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("READY_FOR_PICKUP");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "READY_FOR_PICKUP"
                    ? "bg-emerald-50/80 border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-emerald-700">Ready Pickup</div>
                <div className="text-xl font-black text-emerald-900 mt-0.5">{readyOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("COMPLETED");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "COMPLETED"
                    ? "bg-slate-100 border-slate-700 shadow-sm ring-2 ring-slate-700/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-slate-600">Completed</div>
                <div className="text-xl font-black text-slate-800 mt-0.5">{completedOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("UNPAID");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                  quickFilter === "UNPAID"
                    ? "bg-rose-50/80 border-rose-600 shadow-sm ring-2 ring-rose-600/20"
                    : "bg-white/80 border-slate-200 hover:bg-white"
                )}
              >
                <div className="text-[10px] font-bold uppercase text-rose-700">Pay at Counter</div>
                <div className="text-xl font-black text-rose-900 mt-0.5">{unpaidOrdersCount}</div>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Instant Online Print Orders Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Received through Supabase database • Showing {filteredOrders.length} order(s)
                  </p>
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Order ID / Phone / Name..."
                      className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setQuickFilter("ALL");
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    {orderStatuses.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const firstItem = order.items[0];
                    const options = firstItem?.selectedOptions || {};
                    const finishing = (options.finishing || {}) as Record<string, boolean>;
                    const isPaid = order.paymentStatus === "confirmed";

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-all bg-white shadow-xs"
                      >
                        {/* Top Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#123B70] flex items-center justify-center font-bold">
                              <Printer className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-black text-sm sm:text-base text-[#123B70]">
                                  {order.orderCode}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {options.documentType || firstItem?.productName || "Print Job"}
                                </span>
                                {isToday(order.createdAt) && (
                                  <span className="rounded-full bg-blue-100 text-blue-800 text-[9px] font-extrabold px-2 py-0.2">
                                    TODAY
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                                <span>
                                  Customer: <strong className="text-slate-800">{order.customerName}</strong> ({order.customerPhone})
                                </span>
                                {order.customerEmail && <span>• {order.customerEmail}</span>}
                                <span className="text-slate-400">
                                  • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Price, Payment & Action */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Payment Badge & Toggle */}
                            <button
                              onClick={() => handleTogglePaymentStatus(order)}
                              disabled={updatingPayment}
                              title="Click to toggle Paid / Unpaid"
                              className={cn(
                                "flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-extrabold border transition-all cursor-pointer",
                                isPaid
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                              )}
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>{isPaid ? "Paid Online" : "Pay at Shop (Pending)"}</span>
                            </button>

                            <span className="text-sm font-black text-slate-900 px-1">
                              ₹{order.totalAmount}
                            </span>

                            {/* Status Selector */}
                            <select
                              value={order.orderStatus}
                              onChange={(e: any) => handleUpdateOrderStatus(order.orderCode, e.target.value)}
                              className={cn(
                                "rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-hidden cursor-pointer",
                                order.orderStatus === "READY_FOR_PICKUP"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : order.orderStatus === "IN_PRODUCTION"
                                  ? "bg-blue-50 text-blue-800 border-blue-300"
                                  : order.orderStatus === "NEW"
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : "bg-slate-50 text-slate-800 border-slate-300"
                              )}
                            >
                              {orderStatuses.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleOpenOrderModal(order)}
                              className="p-2 rounded-xl bg-[#123B70]/10 hover:bg-[#123B70]/20 text-[#123B70] transition-colors cursor-pointer"
                              title="Inspect Full Order Drawer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <a
                              href={getWhatsAppLink(
                                `Hello ${order.customerName}, this is Palak Enterprises regarding your order *${order.orderCode}* (Status: ${order.orderStatus}).`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          </div>
                        </div>

                        {/* Specifications & Finishing Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          {/* Printing Specs */}
                          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                            <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                              Printing Specs
                            </span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                              <div>Paper: <span className="font-semibold text-slate-800">{String(options.paperSize || "A4").toUpperCase()}</span></div>
                              <div>Color: <span className="font-semibold text-slate-800">{options.colorMode === "bw" ? "B&W" : "Color"}</span></div>
                              <div>Sides: <span className="font-semibold text-slate-800">{options.sides === "single" ? "Single" : "Double"}</span></div>
                              <div>Copies: <span className="font-semibold text-slate-800">{firstItem?.quantity || 1}</span></div>
                            </div>
                          </div>

                          {/* Finishing Checklist */}
                          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                            <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                              Finishing Checklist
                            </span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                              <div className={cn("flex items-center gap-1 font-medium", finishing.spiralBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.spiralBinding ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                                <span>Spiral Binding</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.combBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.combBinding ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                                <span>Comb Binding</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.lamination ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.lamination ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                                <span>Lamination</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.stapling ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.stapling ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                                <span>Stapling</span>
                              </div>
                            </div>
                          </div>

                          {/* File & Instructions */}
                          <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                            <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                              Attached File & Notes
                            </span>
                            {firstItem?.uploadedFileName || firstItem?.uploadedFileUrl ? (
                              <div className="flex items-center justify-between text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                <span className="truncate font-semibold max-w-[140px]">{firstItem.uploadedFileName || "document"}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(firstItem.uploadedFileUrl || "", firstItem.uploadedFileName)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">No digital file uploaded</span>
                            )}

                            {order.orderNotes && (
                              <p className="text-[11px] text-slate-500 italic">
                                Note: "{order.orderNotes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No print orders matching your filter criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Print Pricing Manager */}
        {activeTab === "pricing" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Print Pricing & Finishing Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  Configure live per-page rates, paper multipliers, and binding/lamination charges for Instant Online Services.
                </p>
              </div>

              {pricingSavedNotice && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-bold border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Pricing saved & active!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePricingConfig} className="space-y-6">
              {/* 1. Base Rates */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Document Printing Base Rates (A4)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">B&W Single Side (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.documentPrinting.baseRatePerPage.bwSingle}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            baseRatePerPage: {
                              ...pricingConfig.documentPrinting.baseRatePerPage,
                              bwSingle: parseFloat(e.target.value) || 2.0,
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">B&W Double Side (₹/side)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.documentPrinting.baseRatePerPage.bwDouble}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            baseRatePerPage: {
                              ...pricingConfig.documentPrinting.baseRatePerPage,
                              bwDouble: parseFloat(e.target.value) || 1.5,
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Color Single Side (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.documentPrinting.baseRatePerPage.colorSingle}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            baseRatePerPage: {
                              ...pricingConfig.documentPrinting.baseRatePerPage,
                              colorSingle: parseFloat(e.target.value) || 10.0,
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Color Double Side (₹/side)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.documentPrinting.baseRatePerPage.colorDouble}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            baseRatePerPage: {
                              ...pricingConfig.documentPrinting.baseRatePerPage,
                              colorDouble: parseFloat(e.target.value) || 9.0,
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Finishing Options Pricing */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Finishing Options Charges
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Spiral Binding (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.documentPrinting.finishing.spiralBinding.price}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            finishing: {
                              ...pricingConfig.documentPrinting.finishing,
                              spiralBinding: {
                                ...pricingConfig.documentPrinting.finishing.spiralBinding,
                                price: parseInt(e.target.value) || 30,
                              },
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Comb Binding (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.documentPrinting.finishing.combBinding.price}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            finishing: {
                              ...pricingConfig.documentPrinting.finishing,
                              combBinding: {
                                ...pricingConfig.documentPrinting.finishing.combBinding,
                                price: parseInt(e.target.value) || 25,
                              },
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lamination (₹/page)</label>
                    <input
                      type="number"
                      value={pricingConfig.documentPrinting.finishing.lamination.pricePerPage}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            finishing: {
                              ...pricingConfig.documentPrinting.finishing,
                              lamination: {
                                ...pricingConfig.documentPrinting.finishing.lamination,
                                pricePerPage: parseInt(e.target.value) || 15,
                              },
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Stapling (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.documentPrinting.finishing.stapling.price}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          documentPrinting: {
                            ...pricingConfig.documentPrinting,
                            finishing: {
                              ...pricingConfig.documentPrinting.finishing,
                              stapling: {
                                ...pricingConfig.documentPrinting.finishing.stapling,
                                price: parseInt(e.target.value) || 5,
                              },
                            },
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Passport & ID Cards */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Passport Photos & PVC ID Cards
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">8 Photo Sheet (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.passportPhoto.sheet8}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          passportPhoto: {
                            ...pricingConfig.passportPhoto,
                            sheet8: parseInt(e.target.value) || 50,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">16 Photo Sheet (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.passportPhoto.sheet16}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          passportPhoto: {
                            ...pricingConfig.passportPhoto,
                            sheet16: parseInt(e.target.value) || 90,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">PVC ID Single (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.idCards.pvcSingle}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          idCards: {
                            ...pricingConfig.idCards,
                            pvcSingle: parseInt(e.target.value) || 60,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lanyard + Holder (₹)</label>
                    <input
                      type="number"
                      value={pricingConfig.idCards.withLanyardHolder}
                      onChange={(e) =>
                        setPricingConfig({
                          ...pricingConfig,
                          idCards: {
                            ...pricingConfig.idCards,
                            withLanyardHolder: parseInt(e.target.value) || 25,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={pricingSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] px-6 py-3 text-xs font-bold text-white shadow-card transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{pricingSaving ? "Saving Configuration..." : "Save Pricing Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Digital Services List */}
        {activeTab === "services" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Digital / CSC Applications</h2>
              <span className="text-xs text-slate-400">{serviceRequests.length} Total Requests</span>
            </div>

            <div className="space-y-3">
              {serviceRequests.length > 0 ? (
                serviceRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-slate-200 p-4 space-y-2 hover:border-slate-300 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-amber-600 text-sm">{req.requestCode}</span>
                        <span className="text-xs font-bold text-slate-900 ml-2">{req.serviceName}</span>
                        <span className="text-xs text-slate-500 ml-2">({req.customerName} - {req.customerPhone})</span>
                      </div>

                      <select
                        value={req.requestStatus}
                        onChange={(e: any) => handleUpdateServiceStatus(req.requestCode, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        {serviceStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No applications in queue.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Quotes List */}
        {activeTab === "quotes" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Custom Quote Inquiries</h2>
              <span className="text-xs text-slate-400">{quoteRequests.length} Total</span>
            </div>

            <div className="space-y-3">
              {quoteRequests.length > 0 ? (
                quoteRequests.map((q) => (
                  <div key={q.id} className="rounded-xl border border-slate-200 p-4 space-y-2 hover:border-slate-300 bg-white">
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
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No quotes pending.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Designs List */}
        {activeTab === "designs" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Design Studio Requests</h2>
              <span className="text-xs text-slate-400">{designRequests.length} Total</span>
            </div>

            <div className="space-y-3">
              {designRequests.length > 0 ? (
                designRequests.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-200 p-4 space-y-2 hover:border-slate-300 bg-white">
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
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No design requests.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Order Detail Drawer / Modal */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xl text-[#123B70]">
                    {selectedOrderForModal.orderCode}
                  </span>
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide",
                    selectedOrderForModal.orderStatus === "READY_FOR_PICKUP"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedOrderForModal.orderStatus === "IN_PRODUCTION"
                      ? "bg-blue-100 text-blue-800"
                      : selectedOrderForModal.orderStatus === "NEW"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-800"
                  )}>
                    {selectedOrderForModal.orderStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed: {new Date(selectedOrderForModal.createdAt).toLocaleString()} • Fulfillment: {selectedOrderForModal.fulfillmentType}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer & Payment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Customer Details</span>
                <div className="space-y-1 text-xs">
                  <div><strong>Name:</strong> {selectedOrderForModal.customerName}</div>
                  <div><strong>Phone:</strong> {selectedOrderForModal.customerPhone}</div>
                  {selectedOrderForModal.customerEmail && (
                    <div><strong>Email:</strong> {selectedOrderForModal.customerEmail}</div>
                  )}
                  {selectedOrderForModal.userId && (
                    <div><strong>User ID:</strong> <span className="font-mono text-[11px] text-slate-600">{selectedOrderForModal.userId}</span></div>
                  )}
                </div>
                <div className="pt-2">
                  <a
                    href={getWhatsAppLink(`Hello ${selectedOrderForModal.customerName}, regarding your Palak Enterprises order (${selectedOrderForModal.orderCode}): `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Open WhatsApp Chat</span>
                  </a>
                </div>
              </div>

              {/* Payment Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Payment Details</span>
                <div className="space-y-1 text-xs">
                  <div><strong>Total Amount:</strong> <span className="text-base font-black text-slate-900">₹{selectedOrderForModal.totalAmount}</span></div>
                  <div><strong>Method:</strong> {selectedOrderForModal.paymentMethod === "upi_online" ? "UPI / Online Payment" : "Pay at Shop (Counter)"}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <strong>Status:</strong>
                    <span className={cn(
                      "rounded-lg px-2 py-0.5 text-xs font-bold",
                      selectedOrderForModal.paymentStatus === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    )}>
                      {selectedOrderForModal.paymentStatus === "confirmed" ? "Paid / Verified" : "Pending (Unpaid)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePaymentStatus(selectedOrderForModal)}
                  disabled={updatingPayment}
                  className="w-full mt-2 py-1.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  {selectedOrderForModal.paymentStatus === "confirmed" ? "Mark as Pending / Unpaid" : "✓ Mark as Paid / Verified"}
                </button>
              </div>
            </div>

            {/* Print Specification & Options */}
            {selectedOrderForModal.items.map((item, idx) => {
              const opts = item.selectedOptions || {};
              const fin = (opts.finishing || {}) as Record<string, boolean>;

              return (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900">
                      Product: {opts.documentType || item.productName || "Custom Print"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Qty: {item.quantity} • ₹{item.totalPrice}
                    </span>
                  </div>

                  {/* Print Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Paper Size</span>
                      <span className="font-bold text-slate-800">{String(opts.paperSize || "A4").toUpperCase()}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Color Mode</span>
                      <span className="font-bold text-slate-800">{opts.colorMode === "bw" ? "B&W" : "Color"}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Sides</span>
                      <span className="font-bold text-slate-800">{opts.sides === "single" ? "Single Side" : "Double Side"}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] text-slate-400 block">Orientation</span>
                      <span className="font-bold text-slate-800">{opts.orientation || "Portrait"}</span>
                    </div>
                  </div>

                  {/* Finishing Checklist */}
                  <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Finishing Services Required</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className={cn("flex items-center gap-1 font-medium", fin.spiralBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.spiralBinding ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                        <span>Spiral Binding</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.combBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.combBinding ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                        <span>Comb Binding</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.lamination ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.lamination ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                        <span>Lamination</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.stapling ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.stapling ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                        <span>Stapling</span>
                      </div>
                    </div>
                  </div>

                  {/* Attached File Download */}
                  {(item.uploadedFileName || item.uploadedFileUrl) && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <FileDown className="h-4 w-4 text-[#123B70]" />
                        <span className="text-xs font-bold text-slate-900">{item.uploadedFileName || "Customer File"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(item.uploadedFileUrl || "", item.uploadedFileName)}
                        className="px-3 py-1.5 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Download Original File
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Order Notes & Staff Notes Editor */}
            <div className="space-y-3">
              {selectedOrderForModal.orderNotes && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-900">
                  <strong>Customer Instructions:</strong> "{selectedOrderForModal.orderNotes}"
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Staff Notes & Production Remarks
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={staffNoteInput}
                    onChange={(e) => setStaffNoteInput(e.target.value)}
                    placeholder="e.g. Printed on 100 GSM paper, front glossy laminated..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveStaffNote(selectedOrderForModal.orderCode)}
                    disabled={savingNote}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Transition Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Update Production Status (Auto-notifies Customer)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "UNDER_REVIEW")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "UNDER_REVIEW"
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  1. Under Review
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "CONFIRMED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "CONFIRMED"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  2. Confirm Order
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "IN_PRODUCTION")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "IN_PRODUCTION"
                      ? "bg-indigo-600 text-white border-indigo-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  3. Start Printing
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "READY_FOR_PICKUP")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "READY_FOR_PICKUP"
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  4. Ready for Pickup
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "COMPLETED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "COMPLETED"
                      ? "bg-slate-900 text-white border-black"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  5. Mark Completed
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "CANCELLED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    selectedOrderForModal.orderStatus === "CANCELLED"
                      ? "bg-rose-600 text-white border-rose-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-rose-700"
                  )}
                >
                  Cancel Order
                </button>
              </div>
            </div>

            {/* Audit Trail: Status History Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Audit Trail & Status History
              </span>

              {loadingTimeline ? (
                <div className="text-center py-3 text-xs text-slate-400">Loading history...</div>
              ) : orderHistoryTimeline.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {orderHistoryTimeline.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="h-2 w-2 rounded-full bg-[#123B70] mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{h.new_status || h.newStatus}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(h.created_at || h.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{h.message_en || h.messageEn}</p>
                        {h.performed_by && (
                          <span className="text-[10px] text-slate-400 block">By: {h.performed_by}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No history records found for this order.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
