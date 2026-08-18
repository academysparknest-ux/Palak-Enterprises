import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  MessageSquare,
  Settings,
  Save,
  Printer,
  Eye,
  X,
  CreditCard,
  History,
  TrendingUp,
  Wallet,
  Receipt,
  Download,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  PalakDataStore,
  type StoredOrder,
  type StoredServiceRequest,
  type StoredQuoteRequest,
  type StoredDesignRequest,
} from "../lib/storage/store";
import { supabase } from "../lib/supabase/client";
import {
  getStaffOrders,
  getStaffServiceRequests,
  getStaffQuoteRequests,
  updateStaffOrderStatus,
  updateStaffOrderPaymentStatus,
  addStaffOrderNote,
  getOrderStatusHistory,
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
import {
  AdminFilePreviewModal,
  AdminFileActions,
  type DocumentItem,
} from "../components/AdminDocumentViewer";
import { cn } from "../lib/utils";

export const AdminPage: React.FC = () => {
  const { user, isStaff, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "orders";

  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "pricing" | "services" | "quotes" | "designs">(
    ["orders", "payments", "pricing", "services", "quotes", "designs"].includes(initialTab) ? initialTab : "orders"
  );
  const [loading, setLoading] = useState(false);

  // Sync tab with URL search parameter if user navigates
  const handleSelectTab = (tab: "orders" | "payments" | "pricing" | "services" | "quotes" | "designs") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<StoredServiceRequest[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<StoredQuoteRequest[]>([]);
  const [designRequests, setDesignRequests] = useState<StoredDesignRequest[]>([]);

  // Active Document Preview in Modal
  const [activePreviewDoc, setActivePreviewDoc] = useState<DocumentItem | null>(null);

  // Search & Filter for Orders
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "TODAY" | "NEW" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "COMPLETED" | "UNPAID">("ALL");

  // Search & Filter for Payments Dashboard
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"ALL" | "ONLINE" | "SHOP">("ALL");
  const [paymentDateFilter, setPaymentDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);

  // Selected Order Drawer / Modal State
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<StoredOrder | null>(null);
  const [orderHistoryTimeline, setOrderHistoryTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [staffNoteInput, setStaffNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Pricing Config
  const [pricingConfig, setPricingConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cloudOrders, cloudServices, cloudQuotes, pricing] = await Promise.all([
        getStaffOrders().catch((err) => {
          console.warn("getStaffOrders notice:", err);
          return [];
        }),
        getStaffServiceRequests().catch((err) => {
          console.warn("getStaffServiceRequests notice:", err);
          return [];
        }),
        getStaffQuoteRequests().catch((err) => {
          console.warn("getStaffQuoteRequests notice:", err);
          return [];
        }),
        getPrintPricingConfig().catch(() => DEFAULT_PRINT_PRICING),
      ]);

      // Merge Cloud Orders and Local Orders (deduplicated by orderCode)
      const localOrders = PalakDataStore.getOrders();
      const mergedOrdersMap = new Map<string, StoredOrder>();
      localOrders.forEach((o) => mergedOrdersMap.set(o.orderCode, o));
      cloudOrders.forEach((o) => mergedOrdersMap.set(o.orderCode, o));
      const allOrders = Array.from(mergedOrdersMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(allOrders);

      // Sync active detail modal with fresh data
      setSelectedOrderForModal((prev) => {
        if (!prev) return null;
        const fresh = allOrders.find((o) => o.orderCode === prev.orderCode);
        return fresh || null;
      });

      // Merge Service Requests
      const localServices = PalakDataStore.getServiceRequests();
      const mergedServicesMap = new Map<string, StoredServiceRequest>();
      localServices.forEach((s) => mergedServicesMap.set(s.requestCode, s));
      cloudServices.forEach((s) => mergedServicesMap.set(s.requestCode, s));
      const allServices = Array.from(mergedServicesMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setServiceRequests(allServices);

      // Merge Quote Requests
      const localQuotes = PalakDataStore.getQuoteRequests();
      const mergedQuotesMap = new Map<string, StoredQuoteRequest>();
      localQuotes.forEach((q) => mergedQuotesMap.set(q.quoteCode, q));
      cloudQuotes.forEach((q) => mergedQuotesMap.set(q.quoteCode, q));
      const allQuotes = Array.from(mergedQuotesMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setQuoteRequests(allQuotes);

      setDesignRequests(PalakDataStore.getDesignRequests());
      setPricingConfig(pricing);
    } catch (err) {
      console.error("Admin loadData error:", err);
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

  // Supabase Realtime subscription for orders table
  const realtimeChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  useEffect(() => {
    if (!isStaff || !supabase) return;

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders" },
        () => {
          // Refresh orders from database on any change
          loadData();
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.info("[Palak ERP] Realtime subscription active for orders table.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "[Palak ERP] Realtime subscription could not connect. " +
            "Ensure the 'orders' table is added to the supabase_realtime publication in your Supabase Dashboard."
          );
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current && supabase) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
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
    if (updatingStatus) return; // Prevent double-clicks / concurrent updates
    setUpdatingStatus(orderCode);
    try {
      await updateStaffOrderStatus(orderCode, newStatus);
      // Only update local store + UI after confirmed cloud success
      PalakDataStore.updateOrderStatus(orderCode, newStatus);
      await loadData();
      if (selectedOrderForModal && selectedOrderForModal.orderCode === orderCode) {
        setSelectedOrderForModal((prev) => prev ? { ...prev, orderStatus: newStatus } : null);
        const history = await getOrderStatusHistory(orderCode);
        setOrderHistoryTimeline(history);
      }
    } catch (e) {
      console.error("Status update failed — database not updated:", e);
      // Do NOT update local state or UI on failure
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleTogglePaymentStatus = async (order: StoredOrder) => {
    const isCurrentlyPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "paid";
    const nextStatus = isCurrentlyPaid ? "pending" : "confirmed";
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

  // Payments & Revenue Financial Analytics
  const extractRazorpayId = (notes?: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/\[Razorpay ID:\s*([a-zA-Z0-9_]+)\]/i) || notes.match(/(pay_[a-zA-Z0-9_]+)/i);
    return match ? match[1] : null;
  };

  const isPaidOrder = (o: StoredOrder) =>
    o.paymentStatus === "confirmed" ||
    o.paymentStatus === "paid" ||
    (Boolean(extractRazorpayId(o.orderNotes)) && (o.paymentMethod === "upi_online" || o.paymentMethod === "pay_online"));

  const paidOrders = orders.filter(isPaidOrder);
  const totalRevenueCollected = paidOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const onlinePaidOrders = paidOrders.filter((o) => o.paymentMethod === "upi_online" || o.paymentMethod === "pay_online");
  const onlineRevenueCollected = onlinePaidOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const unpaidOrdersList = orders.filter((o) => !isPaidOrder(o));
  const pendingReceivablesAmount = unpaidOrdersList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const todayPaidOrders = paidOrders.filter((o) => isToday(o.createdAt));
  const todayRevenue = todayPaidOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const avgTicketValue = paidOrders.length > 0 ? Math.round(totalRevenueCollected / paidOrders.length) : 0;

  const isWithinPastDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    return now - d <= days * 24 * 60 * 60 * 1000;
  };

  const filteredPaymentOrders = orders.filter((o) => {
    const q = paymentSearchQuery.toLowerCase().trim();
    const rzpId = (extractRazorpayId(o.orderNotes) || "").toLowerCase();
    const matchesSearch =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      rzpId.includes(q);

    let matchesStatus = true;
    const isPaid = isPaidOrder(o);
    if (paymentStatusFilter === "PAID") {
      matchesStatus = isPaid;
    } else if (paymentStatusFilter === "PENDING") {
      matchesStatus = !isPaid;
    } else if (paymentStatusFilter === "FAILED") {
      matchesStatus = o.paymentStatus === "failed" || o.paymentStatus === "refunded";
    }

    let matchesMethod = true;
    const isOnline = o.paymentMethod === "upi_online" || o.paymentMethod === "pay_online";
    if (paymentMethodFilter === "ONLINE") {
      matchesMethod = isOnline;
    } else if (paymentMethodFilter === "SHOP") {
      matchesMethod = !isOnline;
    }

    let matchesDate = true;
    if (paymentDateFilter === "TODAY") {
      matchesDate = isToday(o.createdAt);
    } else if (paymentDateFilter === "WEEK") {
      matchesDate = isWithinPastDays(o.createdAt, 7);
    } else if (paymentDateFilter === "MONTH") {
      matchesDate = isWithinPastDays(o.createdAt, 30);
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  const exportPaymentsCSV = () => {
    const headers = [
      "Order Code",
      "Date & Time",
      "Customer Name",
      "Customer Phone",
      "Service / Items",
      "Total Amount (INR)",
      "Payment Method",
      "Payment Status",
      "Razorpay Payment ID",
    ];
    const rows = filteredPaymentOrders.map((o) => [
      o.orderCode,
      new Date(o.createdAt).toLocaleString("en-IN"),
      `"${(o.customerName || "").replace(/"/g, '""')}"`,
      `"${o.customerPhone || ""}"`,
      `"${(o.items?.map((i) => i.productName).join("; ") || "Print Job").replace(/"/g, '""')}"`,
      o.totalAmount,
      o.paymentMethod === "upi_online" || o.paymentMethod === "pay_online"
        ? "Online (Razorpay UPI/Cards)"
        : "Pay at Shop Counter",
      isPaidOrder(o) ? "PAID" : "PENDING",
      extractRazorpayId(o.orderNotes) || "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `palak_payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => handleSelectTab("orders")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "orders" ? "bg-white border-[#123B70] shadow-md ring-2 ring-[#123B70]/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Print Orders</span>
              <Package className="h-4 w-4 text-[#123B70]" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{orders.length}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">{newOrdersCount} pending review</div>
          </button>

          <button
            onClick={() => handleSelectTab("payments")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "payments" ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Payments & Revenue</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">₹{totalRevenueCollected.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              ₹{onlineRevenueCollected.toLocaleString("en-IN")} Online • ₹{pendingReceivablesAmount.toLocaleString("en-IN")} Pending
            </div>
          </button>

          <button
            onClick={() => handleSelectTab("pricing")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "pricing" ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Print Pricing</span>
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">Engine</div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">Active Rates</div>
          </button>

          <button
            onClick={() => handleSelectTab("services")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "services" ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Digital / CSC</span>
              <Globe className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{serviceRequests.length}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Citizen Requests</div>
          </button>

          <button
            onClick={() => handleSelectTab("quotes")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "quotes" ? "bg-white border-teal-600 shadow-md ring-2 ring-teal-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Quote Inquiries</span>
              <FileText className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{quoteRequests.length}</div>
            <div className="text-[11px] text-teal-600 font-semibold mt-1">Custom Orders</div>
          </button>

          <button
            onClick={() => handleSelectTab("designs")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === "designs" ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Design Studio</span>
              <Palette className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{designRequests.length}</div>
            <div className="text-[11px] text-purple-600 font-semibold mt-1">Proofs & Layouts</div>
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
                              disabled={updatingStatus === order.orderCode}
                              onChange={(e: any) => handleUpdateOrderStatus(order.orderCode, e.target.value)}
                              className={cn(
                                "rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-hidden cursor-pointer disabled:opacity-50",
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
                          <div className="rounded-xl bg-slate-50 p-3 space-y-2">
                            <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                              Attached Customer Files {order.items?.filter((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath).length > 1 ? `(${order.items.filter((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath).length})` : ""}
                            </span>

                            {order.items?.some((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath) ? (
                              <div className="space-y-1.5">
                                {order.items
                                  .filter((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath)
                                  .map((it, idx) => (
                                    <AdminFileActions
                                      key={idx}
                                      fileName={it.uploadedFileName || `attached-file-${idx + 1}`}
                                      fileUrl={it.uploadedFileUrl || it.selectedOptions?.storagePath || ""}
                                      mimeType={it.selectedOptions?.mimeType}
                                      orderCode={order.orderCode}
                                      compact
                                      onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                                    />
                                  ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No digital file uploaded</span>
                            )}

                            {order.orderNotes && (
                              <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-lg border border-slate-200">
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

        {/* Tab: Payments & Revenue Dashboard */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-fadeUp">
            {/* Financial Overview Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Total Revenue Collected */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Collected</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2">
                  ₹{totalRevenueCollected.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{paidOrders.length} Paid Order{paidOrders.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              {/* Online Razorpay Payments */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">Online (Razorpay)</span>
                  <div className="h-8 w-8 rounded-xl bg-[#123B70] text-white flex items-center justify-center shadow-xs">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  ₹{onlineRevenueCollected.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-blue-700 font-semibold mt-1">
                  {onlinePaidOrders.length} Online ({paidOrders.length ? Math.round((onlinePaidOrders.length / paidOrders.length) * 100) : 0}% of revenue)
                </div>
              </div>

              {/* Pending Receivables (Pay at Shop) */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending at Shop</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-2">
                  ₹{pendingReceivablesAmount.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-amber-700 font-semibold mt-1">
                  {unpaidOrdersList.length} Orders to collect at counter
                </div>
              </div>

              {/* Today's Collections */}
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-800">Today's Revenue</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-950 mt-2">
                  ₹{todayRevenue.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-purple-700 font-semibold mt-1">
                  {todayPaidOrders.length} Paid Order{todayPaidOrders.length === 1 ? "" : "s"} Today
                </div>
              </div>

              {/* Average Order Value */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Ticket Value</span>
                  <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  ₹{avgTicketValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">
                  Per paid transaction
                </div>
              </div>
            </div>

            {/* Gateway Configuration & Quick Status Banner */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-[#123B70] to-indigo-950 text-white p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Razorpay Payment Gateway Active</span>
                    </span>
                    <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-2 py-0.5 text-[10px] font-black text-amber-300 uppercase tracking-wide">
                      Test Mode
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    Razorpay Online Payments & Counter Collections Ledger
                  </h3>
                  <p className="text-xs text-blue-200/90 leading-relaxed max-w-2xl">
                    Online orders processed through UPI, QR codes, debit/credit cards, and netbanking are tagged with official Razorpay Payment IDs. In-store collections can be marked as Paid with one click.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="https://dashboard.razorpay.com/app/payments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    <span>Razorpay Dashboard</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => loadData()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter, Search & Export Toolbar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, Customer Name, Phone, or Razorpay ID (pay_xxx)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                  {paymentSearchQuery && (
                    <button
                      onClick={() => setPaymentSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Export CSV Button */}
                <button
                  onClick={exportPaymentsCSV}
                  disabled={filteredPaymentOrders.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                >
                  <Download className="h-4 w-4 text-slate-600" />
                  <span>Export CSV ({filteredPaymentOrders.length})</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {/* Status Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    <span>Status:</span>
                  </span>

                  <button
                    onClick={() => setPaymentStatusFilter("ALL")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      paymentStatusFilter === "ALL"
                        ? "bg-[#123B70] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    All ({orders.length})
                  </button>

                  <button
                    onClick={() => setPaymentStatusFilter("PAID")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      paymentStatusFilter === "PAID"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                    )}
                  >
                    ✓ Paid ({paidOrders.length})
                  </button>

                  <button
                    onClick={() => setPaymentStatusFilter("PENDING")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      paymentStatusFilter === "PENDING"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                    )}
                  >
                    ⏳ Pending ({unpaidOrdersList.length})
                  </button>
                </div>

                {/* Method & Timeframe Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Method:</span>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      <option value="ALL">All Methods</option>
                      <option value="ONLINE">⚡ Online (Razorpay / UPI)</option>
                      <option value="SHOP">🏪 Pay at Shop Counter</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Time:</span>
                    <select
                      value={paymentDateFilter}
                      onChange={(e) => setPaymentDateFilter(e.target.value as any)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="WEEK">Past 7 Days</option>
                      <option value="MONTH">Past 30 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Payment Transactions Ledger ({filteredPaymentOrders.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Filtered Total: <strong className="text-emerald-700">₹{filteredPaymentOrders.filter(isPaidOrder).reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString("en-IN")}</strong> paid &amp; <strong className="text-amber-700">₹{filteredPaymentOrders.filter((o) => !isPaidOrder(o)).reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString("en-IN")}</strong> pending
                  </p>
                </div>
              </div>

              {filteredPaymentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Order Code</th>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Service / Items</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment Method</th>
                        <th className="px-4 py-3">Razorpay ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPaymentOrders.map((order) => {
                        const isPaid = isPaidOrder(order);
                        const isOnline = order.paymentMethod === "upi_online" || order.paymentMethod === "pay_online";
                        const rzpId = extractRazorpayId(order.orderNotes);
                        const serviceTitle = order.items?.[0]?.productName || "Printing Job";

                        return (
                          <tr key={order.id || order.orderCode} className="hover:bg-slate-50/80 transition-colors">
                            {/* Order Code */}
                            <td className="px-4 py-3.5 font-mono font-bold text-[#123B70]">
                              <button
                                onClick={() => handleOpenOrderModal(order)}
                                className="hover:underline cursor-pointer"
                                title="Click to view full order details"
                              >
                                {order.orderCode}
                              </button>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                              <div className="font-medium text-slate-900">
                                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </td>

                            {/* Customer */}
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 truncate max-w-[140px]">
                                {order.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {order.customerPhone}
                              </div>
                            </td>

                            {/* Service / Items */}
                            <td className="px-4 py-3.5 max-w-[180px]">
                              <div className="font-semibold text-slate-800 truncate" title={serviceTitle}>
                                {serviceTitle}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {order.items?.length || 1} item(s) • {order.fulfillmentType === "delivery" ? "Delivery" : "Store Pickup"}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3.5 font-black text-slate-900 text-sm whitespace-nowrap">
                              ₹{order.totalAmount}
                            </td>

                            {/* Payment Method Badge */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CreditCard className="h-3 w-3 text-emerald-600" />
                                  <span>Online (Razorpay)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <span>🏪 Pay at Shop</span>
                                </span>
                              )}
                            </td>

                            {/* Razorpay Reference ID */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {rzpId ? (
                                <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold text-slate-700 border border-slate-200">
                                  <span className="truncate max-w-[110px]">{rzpId}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(rzpId);
                                      setCopiedPaymentId(rzpId);
                                      setTimeout(() => setCopiedPaymentId(null), 2000);
                                    }}
                                    className="p-0.5 hover:text-slate-900 cursor-pointer"
                                    title="Copy Razorpay ID"
                                  >
                                    {copiedPaymentId === rzpId ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-slate-500" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  {isOnline ? "Simulated" : "In-store Counter"}
                                </span>
                              )}
                            </td>

                            {/* Payment Status Badge */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide",
                                  isPaid
                                    ? "bg-emerald-500 text-white"
                                    : "bg-amber-100 text-amber-900 border border-amber-300"
                                )}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-amber-700" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {/* Toggle Payment Button */}
                              <button
                                onClick={() => handleTogglePaymentStatus(order)}
                                disabled={updatingPayment}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-50",
                                  isPaid
                                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                    : "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                )}
                                title={isPaid ? "Mark as Unpaid / Pending" : "Mark as Paid at Store Counter"}
                              >
                                {isPaid ? "Mark Unpaid" : "Mark Paid ✓"}
                              </button>

                              {/* WhatsApp Notice / Receipt */}
                              <a
                                href={getWhatsAppLink(
                                  `Hello ${order.customerName},\n\nRegarding your Palak Enterprises Order *${order.orderCode}* (₹${order.totalAmount}):\nPayment Status: *${isPaid ? "PAID" : "PENDING (Pay at Counter)"}*.\n\nThank you!`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 inline-flex rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                                title="Send WhatsApp Receipt"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              </a>

                              {/* View Details Modal */}
                              <button
                                onClick={() => handleOpenOrderModal(order)}
                                className="p-1.5 inline-flex rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="View full order details"
                              >
                                <Eye className="h-3.5 w-3.5 text-[#123B70]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                  <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No payment records found matching your filter criteria.</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search term or clearing the status/method filter.</p>
                </div>
              )}
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

                    {req.uploadedDocumentUrls && req.uploadedDocumentUrls.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Applicant Documents ({req.uploadedDocumentUrls.length})
                        </span>
                        <div className="space-y-1">
                          {req.uploadedDocumentUrls.map((url, idx) => (
                            <AdminFileActions
                              key={idx}
                              fileName={req.uploadedDocumentNames?.[idx] || `applicant-doc-${idx + 1}`}
                              fileUrl={url}
                              orderCode={req.requestCode}
                              compact
                              onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
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

                    {q.referenceFileUrls && q.referenceFileUrls.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Reference Documents ({q.referenceFileUrls.length})
                        </span>
                        <div className="space-y-1">
                          {q.referenceFileUrls.map((url, idx) => (
                            <AdminFileActions
                              key={idx}
                              fileName={q.referenceFileNames?.[idx] || `reference-doc-${idx + 1}`}
                              fileUrl={url}
                              orderCode={q.quoteCode}
                              compact
                              onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
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

                    {((d.referenceFileUrls && d.referenceFileUrls.length > 0) || d.proofFileUrl) && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Design Assets & Proofs
                        </span>
                        <div className="space-y-1">
                          {d.referenceFileUrls?.map((url, idx) => (
                            <AdminFileActions
                              key={idx}
                              fileName={d.referenceFileNames?.[idx] || `design-ref-${idx + 1}`}
                              fileUrl={url}
                              orderCode={d.designCode}
                              compact
                              onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                            />
                          ))}
                          {d.proofFileUrl && (
                            <AdminFileActions
                              fileName="design-proof"
                              fileUrl={d.proofFileUrl}
                              orderCode={d.designCode}
                              compact
                              onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                            />
                          )}
                        </div>
                      </div>
                    )}
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

                  {/* Attached File Display & Actions */}
                  {(item.uploadedFileName || item.uploadedFileUrl) && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Customer Artwork / Attached Document
                      </span>
                      <AdminFileActions
                        fileName={item.uploadedFileName}
                        fileUrl={item.selectedOptions?.storagePath || item.uploadedFileUrl}
                        mimeType={item.selectedOptions?.mimeType}
                        orderCode={selectedOrderForModal.orderCode}
                        compact={false}
                        onOpenPreview={(doc) => setActivePreviewDoc(doc)}
                      />
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
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "UNDER_REVIEW")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "UNDER_REVIEW"
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  1. Under Review
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "CONFIRMED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "CONFIRMED"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  2. Confirm Order
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "IN_PRODUCTION")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "IN_PRODUCTION"
                      ? "bg-indigo-600 text-white border-indigo-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  3. Start Printing
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "READY_FOR_PICKUP")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "READY_FOR_PICKUP"
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  4. Ready for Pickup
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "COMPLETED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "COMPLETED"
                      ? "bg-slate-900 text-white border-black"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  5. Mark Completed
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "CANCELLED")}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
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

      {/* Dedicated Inline Document & PDF Preview Modal */}
      <AdminFilePreviewModal
        isOpen={!!activePreviewDoc}
        onClose={() => setActivePreviewDoc(null)}
        document={activePreviewDoc}
      />
    </div>
  );
};

export default AdminPage;
