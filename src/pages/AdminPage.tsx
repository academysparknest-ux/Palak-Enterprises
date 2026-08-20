import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useLocation, useNavigate, useParams } from "react-router-dom";
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
  FileUp,
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
  getStaffInvoices,
  regenerateStaffInvoice,
} from "../lib/supabase/database";
import {
  DEFAULT_PRINT_PRICING,
  type PrintPricingConfig,
} from "../config/printPricing";
import { useRealtimeOrders } from "../hooks/useRealtimeOrders";
import { dispatchAdminToast } from "../lib/realtime/adminOrderEvents";
import { getWhatsAppLink } from "../config/business";
import {
  AdminFilePreviewModal,
  AdminFileActions,
  type DocumentItem,
} from "../components/AdminDocumentViewer";
import { InvoiceModal } from "../components/invoice/InvoiceModal";
import type { StoredInvoice } from "../lib/invoice/types";
import { PalakInvoiceStore } from "../lib/invoice/invoiceStore";
import { downloadInvoicePDF, getWhatsAppInvoiceShareLink } from "../lib/invoice/pdfUtils";
import { cn } from "../lib/utils";
import {
  sortPrintingQueue,
  calculateQueueStats,
  getQueueClassification,
  isOrderInActivePrintingQueue,
  extractRazorpayId,
  isOrderPaidOnline,
} from "../lib/queue";

export const AdminPage: React.FC = () => {
  const { user, isStaff, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ orderCode?: string }>();

  // Determine active tab dynamically from location pathname or searchParams
  const getTabFromLocation = useCallback(() => {
    const p = location.pathname;
    if (p.includes("/payments")) return "payments";
    if (p.includes("/pricing")) return "pricing";
    if (p.includes("/services-requests")) return "services";
    if (p.includes("/quotes")) return "quotes";
    if (p.includes("/designs")) return "designs";
    const tabParam = searchParams.get("tab");
    if (tabParam && ["orders", "invoices", "payments", "pricing", "services", "quotes", "designs"].includes(tabParam)) {
      return tabParam as "orders" | "invoices" | "payments" | "pricing" | "services" | "quotes" | "designs";
    }
    return "orders";
  }, [location.pathname, searchParams]);

  const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "payments" | "pricing" | "services" | "quotes" | "designs">(getTabFromLocation);
  const [loading, setLoading] = useState(false);

  // Synchronize activeTab whenever location or search parameters change
  useEffect(() => {
    setActiveTab(getTabFromLocation());
  }, [getTabFromLocation]);

  const isNestedInLayout = location.pathname.startsWith("/admin/") || location.pathname === "/admin";

  // Sync tab with URL search parameter or route if user clicks internal tabs
  const handleSelectTab = (tab: "orders" | "invoices" | "payments" | "pricing" | "services" | "quotes" | "designs") => {
    setActiveTab(tab);
    if (isNestedInLayout) {
      const tabPathMap: Record<string, string> = {
        orders: "/admin/orders",
        invoices: "/admin/orders?tab=invoices",
        payments: "/admin/payments",
        pricing: "/admin/pricing",
        services: "/admin/services-requests",
        quotes: "/admin/quotes",
        designs: "/admin/designs",
      };
      if (tabPathMap[tab]) {
        navigate(tabPathMap[tab]);
      }
    } else {
      setSearchParams({ tab });
    }
  };

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [serviceRequests, setServiceRequests] = useState<StoredServiceRequest[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<StoredQuoteRequest[]>([]);
  const [designRequests, setDesignRequests] = useState<StoredDesignRequest[]>([]);

  // Invoice Modal & Search State
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<StoredInvoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [generatingInvoiceCode, setGeneratingInvoiceCode] = useState<string | null>(null);

  // Active Document Preview in Modal
  const [activePreviewDoc, setActivePreviewDoc] = useState<DocumentItem | null>(null);

  // Search & Filter for Orders
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "PRIORITY" | "NORMAL" | "TODAY" | "NEW" | "IN_PRODUCTION" | "READY_FOR_PICKUP" | "COMPLETED" | "UNPAID">("ALL");

  // Search & Filter for Payments Dashboard
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"ALL" | "ONLINE" | "SHOP">("ALL");
  const [paymentDateFilter, setPaymentDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);

  // Selected Order Drawer / Modal State (Derived dynamically to eliminate stale snapshots)
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);
  const selectedOrderForModal = orders.find((o) => o.orderCode === selectedOrderCode) || null;
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
      const [cloudOrders, cloudInvoices, cloudServices, cloudQuotes, pricing] = await Promise.all([
        getStaffOrders().catch((err) => {
          console.warn("getStaffOrders notice:", err);
          return [];
        }),
        getStaffInvoices().catch((err) => {
          console.warn("getStaffInvoices notice:", err);
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

      // Authoritative Cloud Orders (if cloud query succeeded, sync to local cache; if offline, fallback to local)
      const freshOrders: StoredOrder[] = Array.isArray(cloudOrders) ? cloudOrders : PalakDataStore.getOrders();
      let allOrders: StoredOrder[] = [];
      setOrders((prev) => {
        const mergedMap = new Map<string, StoredOrder>();
        freshOrders.forEach((o) => {
          mergedMap.set(o.orderCode.trim().toUpperCase(), o);
        });
        // Preserve any orders that arrived in real-time before loadData completed
        prev.forEach((o) => {
          const code = o.orderCode.trim().toUpperCase();
          if (!mergedMap.has(code)) {
            mergedMap.set(code, o);
          } else {
            const existing = mergedMap.get(code)!;
            mergedMap.set(code, { ...existing, ...o });
          }
        });
        allOrders = Array.from(mergedMap.values());
        allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        PalakDataStore.syncOrdersFromCloud(allOrders);
        return allOrders;
      });

      // Build valid active order codes set to prevent orphaned financial records
      const validOrderCodes = new Set((allOrders.length > 0 ? allOrders : freshOrders).map((o) => o.orderCode.trim().toUpperCase()));
      PalakInvoiceStore.pruneOrphanedInvoices(validOrderCodes);

      // Invoices: authoritatively bound to active orders
      let allInvoices: StoredInvoice[] = [];
      if (Array.isArray(cloudInvoices)) {
        allInvoices = cloudInvoices.filter((inv) => inv.orderCode && validOrderCodes.has(inv.orderCode.trim().toUpperCase()));
      } else {
        allInvoices = PalakInvoiceStore.getAllLocalInvoices().filter((inv) => inv.orderCode && validOrderCodes.has(inv.orderCode.trim().toUpperCase()));
      }

      // Ensure any completed order has an invoice automatically generated if not yet present
      const invoiceOrderCodes = new Set(allInvoices.map((inv) => inv.orderCode));
      for (const order of (allOrders.length > 0 ? allOrders : freshOrders)) {
        if (order.orderStatus === "COMPLETED" && !invoiceOrderCodes.has(order.orderCode)) {
          try {
            const genRes = await PalakDataStore.generateInvoiceForOrder(order, false, "System Auto-Sync");
            if (genRes.invoice) {
              allInvoices.push(genRes.invoice);
              invoiceOrderCodes.add(order.orderCode);
            }
          } catch (e) {
            console.warn("Auto invoice check warning:", e);
          }
        }
      }

      allInvoices.sort(
        (a, b) => new Date(b.invoiceDate || b.createdAt).getTime() - new Date(a.invoiceDate || a.createdAt).getTime()
      );
      PalakInvoiceStore.syncInvoicesFromCloud(allInvoices);
      setInvoices(allInvoices);

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
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOrders(PalakDataStore.getOrders());
        setInvoices(PalakInvoiceStore.getAllLocalInvoices());
      } else {
        // Online error: do not resurrect stale local data
        setOrders([]);
        setInvoices([]);
      }
      setServiceRequests(PalakDataStore.getServiceRequests());
      setQuoteRequests(PalakDataStore.getQuoteRequests());
      setDesignRequests(PalakDataStore.getDesignRequests());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenInvoiceModal = async (orderCode: string) => {
    let inv = invoices.find((i) => i.orderCode.toUpperCase() === orderCode.toUpperCase()) || PalakDataStore.getInvoiceForOrder(orderCode);
    if (!inv) {
      const order = orders.find((o) => o.orderCode.toUpperCase() === orderCode.toUpperCase());
      if (order) {
        setGeneratingInvoiceCode(orderCode);
        const res = await PalakDataStore.generateInvoiceForOrder(order, false, user?.name || "Palak Staff ERP");
        inv = res.invoice;
        setGeneratingInvoiceCode(null);
        await loadData();
      }
    }
    if (inv) {
      setSelectedInvoiceForModal(inv);
      setInvoiceModalOpen(true);
    }
  };

  const handleRegenerateInvoiceForOrder = async (orderCode: string, reason?: string) => {
    const inv = await regenerateStaffInvoice(orderCode, user?.name || "Palak Staff ERP", reason);
    if (inv) {
      setSelectedInvoiceForModal(inv);
      await loadData();
    }
  };

  useEffect(() => {
    if (isStaff || isNestedInLayout) {
      loadData();
    }
  }, [isStaff, isNestedInLayout, loadData]);

  // Real-time order handling without full page reload
  const handleRealtimeNewOrder = useCallback((newOrder: StoredOrder) => {
    setOrders((prev) => {
      const code = (newOrder.orderCode || "").trim().toUpperCase();
      const id = newOrder.id;
      const exists = prev.some((o) => (code && o.orderCode.trim().toUpperCase() === code) || (id && o.id === id));
      if (exists) {
        return prev.map((o) => ((code && o.orderCode.trim().toUpperCase() === code) || (id && o.id === id)) ? { ...o, ...newOrder } : o);
      }
      const updated = [newOrder, ...prev];
      updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return updated;
    });

    // Notify staff with a toast popup
    dispatchAdminToast(
      "New Order Received",
      "success",
      `#${newOrder.orderCode} • ${newOrder.customerName || "Customer"} (₹${(Number(newOrder.totalAmount) || 0).toLocaleString("en-IN")})`
    );
  }, []);

  const handleRealtimeOrderUpdated = useCallback((updatedOrder: StoredOrder) => {
    setOrders((prev) => {
      const code = (updatedOrder.orderCode || "").trim().toUpperCase();
      const id = updatedOrder.id;
      return prev.map((o) => ((code && o.orderCode.trim().toUpperCase() === code) || (id && o.id === id)) ? { ...o, ...updatedOrder } : o);
    });
  }, []);

  const handleRealtimeOrderDeleted = useCallback((payload: { orderCode?: string; id?: string }) => {
    const deletedCode = (payload.orderCode || "").trim().toUpperCase();
    const deletedId = payload.id;
    setOrders((prev) => prev.filter((o) => {
      if (deletedId && o.id === deletedId) return false;
      if (deletedCode && o.orderCode.trim().toUpperCase() === deletedCode) return false;
      return true;
    }));
    if (deletedCode) {
      setInvoices((prev) => prev.filter((inv) => inv.orderCode?.trim().toUpperCase() !== deletedCode));
      PalakDataStore.deleteOrder(deletedCode);
    }
  }, []);

  useRealtimeOrders({
    onNewOrder: handleRealtimeNewOrder,
    onOrderUpdated: handleRealtimeOrderUpdated,
    onOrderDeleted: handleRealtimeOrderDeleted,
  });

  // Listen for admin refresh trigger from top header bar
  useEffect(() => {
    const handleAdminRefresh = () => {
      loadData();
    };
    window.addEventListener("admin-refresh" as any, handleAdminRefresh);
    return () => {
      window.removeEventListener("admin-refresh" as any, handleAdminRefresh);
    };
  }, [loadData]);

  // Open Order Drawer & Load Timeline
  const handleOpenOrderModal = useCallback(async (order: StoredOrder) => {
    setSelectedOrderCode(order.orderCode);
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
  }, []);

  // Close Order Drawer & safely clear URL params without full page reload
  const handleCloseOrderModal = useCallback(() => {
    setSelectedOrderCode(null);
    setStaffNoteInput("");
    setOrderHistoryTimeline([]);

    if (searchParams.has("selected") || searchParams.has("order") || searchParams.has("orderCode")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("selected");
      nextParams.delete("order");
      nextParams.delete("orderCode");
      setSearchParams(nextParams, { replace: true });
    } else if (params.orderCode) {
      navigate("/admin/orders", { replace: true });
    }
  }, [searchParams, setSearchParams, params.orderCode, navigate]);

  // Deep Link & Notification Auto-Selection / Highlighting
  const targetOrderCode = params.orderCode || searchParams.get("selected") || searchParams.get("order") || searchParams.get("orderCode");

  useEffect(() => {
    if (!targetOrderCode) return;
    const cleanTarget = targetOrderCode.trim().toUpperCase();

    const matchingOrder = orders.find(
      (o) => o.orderCode.toUpperCase() === cleanTarget || o.id === targetOrderCode
    );

    if (matchingOrder) {
      if (selectedOrderCode !== matchingOrder.orderCode) {
        handleOpenOrderModal(matchingOrder);
      }
      if (activeTab !== "orders") {
        setActiveTab("orders");
      }
      setTimeout(() => {
        const el = document.getElementById(`order-${matchingOrder.orderCode}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  }, [targetOrderCode, orders, selectedOrderCode, activeTab, handleOpenOrderModal]);

  const handleUpdateOrderStatus = async (orderCode: string, newStatus: StoredOrder["orderStatus"]) => {
    if (updatingStatus) return; // Prevent double-clicks / concurrent updates
    setUpdatingStatus(orderCode);
    try {
      await updateStaffOrderStatus(orderCode, newStatus);
      // Update local store + UI
      PalakDataStore.updateOrderStatus(orderCode, newStatus);
      await loadData();
      const history = await getOrderStatusHistory(orderCode);
      setOrderHistoryTimeline(history);
    } catch (e) {
      console.error("Status update failed — database not updated:", e);
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
      const history = await getOrderStatusHistory(order.orderCode);
      setOrderHistoryTimeline(history);
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
      const history = await getOrderStatusHistory(orderCode);
      setOrderHistoryTimeline(history);
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

  // KPI calculations & Queue Engine Analytics
  const queueStats = calculateQueueStats(orders);
  const priorityOrdersCount = queueStats.priorityActiveCount;
  const normalOrdersCount = queueStats.normalActiveCount;
  const totalOrdersCount = orders.length;
  const todayOrdersCount = orders.filter((o) => isToday(o.createdAt)).length;
  const newOrdersCount = orders.filter((o) => o.orderStatus === "NEW" || o.orderStatus === "UNDER_REVIEW").length;
  const printingOrdersCount = orders.filter((o) => o.orderStatus === "IN_PRODUCTION").length;
  const readyOrdersCount = orders.filter((o) => o.orderStatus === "READY_FOR_PICKUP").length;
  const completedOrdersCount = orders.filter((o) => o.orderStatus === "COMPLETED").length;
  const unpaidOrdersCount = orders.filter((o) => o.paymentStatus === "pending" || !o.paymentStatus).length;

  // Payments & Revenue Financial Analytics
  const isPaidOrder = (o: StoredOrder) => isOrderPaidOnline(o);

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

  // Invoices & Billing Financial Analytics
  const invoiceStats = React.useMemo(() => {
    return PalakInvoiceStore.calculateInvoiceStats(invoices, completedOrdersCount);
  }, [invoices, completedOrdersCount]);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      const q = invoiceSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.orderCode.toLowerCase().includes(q) ||
        (inv.customerSnapshot?.name || "").toLowerCase().includes(q) ||
        (inv.customerSnapshot?.phone || "").includes(q);

      let matchesPayment = true;
      const isPaid = inv.paymentStatus === "confirmed" || inv.paymentStatus === "paid";
      if (invoicePaymentFilter === "PAID") matchesPayment = isPaid;
      if (invoicePaymentFilter === "PENDING") matchesPayment = !isPaid;

      let matchesDate = true;
      const invDate = inv.invoiceDate || inv.createdAt;
      if (invoiceDateFilter === "TODAY") matchesDate = isToday(invDate);
      if (invoiceDateFilter === "WEEK") matchesDate = isWithinPastDays(invDate, 7);
      if (invoiceDateFilter === "MONTH") matchesDate = isWithinPastDays(invDate, 30);

      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [invoices, invoiceSearchQuery, invoicePaymentFilter, invoiceDateFilter]);

  const exportInvoicesCSV = () => {
    const headers = [
      "Invoice Number",
      "Order Reference",
      "Invoice Date",
      "Customer Name",
      "Customer Phone",
      "Total Amount (INR)",
      "Amount Paid",
      "Amount Due",
      "Payment Status",
      "Payment Method",
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.orderCode,
      new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN"),
      `"${(inv.customerSnapshot?.name || "").replace(/"/g, '""')}"`,
      `"${inv.customerSnapshot?.phone || ""}"`,
      inv.totalAmount,
      inv.amountPaid,
      inv.amountDue,
      inv.paymentStatus.toUpperCase(),
      inv.paymentMethod,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `palak_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered & Deterministically Sorted Orders (Priority FIFO first, then Normal FIFO)
  const filteredOrders = React.useMemo(() => {
    const matched = orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q);

      const qMeta = getQueueClassification(o);

      let matchesQuick = true;
      if (quickFilter === "TODAY") {
        matchesQuick = isToday(o.createdAt);
      } else if (quickFilter === "PRIORITY") {
        matchesQuick = qMeta.queuePriority === 1 && isOrderInActivePrintingQueue(o.orderStatus);
      } else if (quickFilter === "NORMAL") {
        matchesQuick = qMeta.queuePriority === 2 && isOrderInActivePrintingQueue(o.orderStatus);
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

    return sortPrintingQueue(matched);
  }, [orders, searchQuery, quickFilter, statusFilter]);

  if (!isStaff && !isNestedInLayout) {
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

  return (
    <div className={isNestedInLayout ? "pb-6" : "min-h-screen bg-[#F1F5F9] pb-20"}>
      {/* Top Staff ERP Navigation Bar — Hidden when inside AdminLayout */}
      {!isNestedInLayout && (
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
      )}

          <div className="mx-auto max-w-7xl px-2 sm:px-4 pt-3 space-y-4">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2.5">
          <button
            onClick={() => handleSelectTab("orders")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "orders" ? "bg-white border-[#123B70] shadow-sm ring-2 ring-[#123B70]/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Print Orders</span>
              <Package className="h-3.5 w-3.5 text-[#123B70]" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{orders.length}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">{newOrdersCount} pending review</div>
          </button>

          <button
            onClick={() => handleSelectTab("invoices")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "invoices" ? "bg-white border-[#123B70] shadow-sm ring-2 ring-[#123B70]/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Tax Invoices</span>
              <Receipt className="h-3.5 w-3.5 text-[#123B70]" />
            </div>
            <div className="text-lg sm:text-xl font-black text-[#123B70] mt-0.5">{invoices.length}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">₹{invoiceStats.totalInvoicedAmount.toLocaleString("en-IN")} Invoiced</div>
          </button>

          <button
            onClick={() => handleSelectTab("payments")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "payments" ? "bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Payments & Revenue</span>
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">₹{totalRevenueCollected.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              ₹{onlineRevenueCollected.toLocaleString("en-IN")} Online • ₹{pendingReceivablesAmount.toLocaleString("en-IN")} Pending
            </div>
          </button>

          <button
            onClick={() => handleSelectTab("pricing")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "pricing" ? "bg-white border-blue-600 shadow-sm ring-2 ring-blue-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Print Pricing</span>
              <Settings className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">Engine</div>
            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Active Rates</div>
          </button>

          <button
            onClick={() => handleSelectTab("services")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "services" ? "bg-white border-amber-500 shadow-sm ring-2 ring-amber-500/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Digital / CSC</span>
              <Globe className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{serviceRequests.length}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Citizen Requests</div>
          </button>

          <button
            onClick={() => handleSelectTab("quotes")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "quotes" ? "bg-white border-teal-600 shadow-sm ring-2 ring-teal-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Quote Inquiries</span>
              <FileText className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{quoteRequests.length}</div>
            <div className="text-[10px] text-teal-600 font-semibold mt-0.5">Custom Orders</div>
          </button>

          <button
            onClick={() => handleSelectTab("designs")}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === "designs" ? "bg-white border-purple-600 shadow-sm ring-2 ring-purple-600/20" : "bg-white/80 border-slate-200 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Design Studio</span>
              <Palette className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{designRequests.length}</div>
            <div className="text-[10px] text-purple-600 font-semibold mt-0.5">Proofs & Layouts</div>
          </button>
        </div>

        {/* Tab 1: Printing Orders Queue */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {/* New Order Alert Banner */}
            {newOrdersCount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="font-extrabold text-xs sm:text-xs block">
                      🔔 {newOrdersCount} New Online Print Order{newOrdersCount > 1 ? "s" : ""} Received!
                    </span>
                    <span className="text-[10px] text-amber-700">
                      Orders submitted via website are synced to Supabase database. Review and start production.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setQuickFilter("NEW");
                    setStatusFilter("ALL");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  View New Orders
                </button>
              </div>
            )}

            {/* Quick Filter Summary Counters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setQuickFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "ALL" && statusFilter === "ALL"
                    ? "bg-[#123B70] text-white border-[#123B70] shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">All Orders</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{totalOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("PRIORITY");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative",
                  quickFilter === "PRIORITY"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                )}
              >
                <div className="text-[10px] font-bold flex items-center justify-between">
                  <span>⚡ Priority</span>
                  {priorityOrdersCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black mt-0.5">{priorityOrdersCount}</div>
                <div className="text-[9px] opacity-80 truncate">Level 1 Queue</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("NORMAL");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "NORMAL"
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                )}
              >
                <div className="text-[10px] font-semibold">📄 Normal</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{normalOrdersCount}</div>
                <div className="text-[9px] opacity-75 truncate">Level 2 (Counter)</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("TODAY");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "TODAY"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Today's</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{todayOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("NEW");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "NEW"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Review</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{newOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("IN_PRODUCTION");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "IN_PRODUCTION"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Printing</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{printingOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("READY_FOR_PICKUP");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "READY_FOR_PICKUP"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Ready Pick</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{readyOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("COMPLETED");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "COMPLETED"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Completed</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{completedOrdersCount}</div>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("UNPAID");
                  setStatusFilter("ALL");
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  quickFilter === "UNPAID"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="text-[10px] font-semibold opacity-80">Counter Pay</div>
                <div className="text-base sm:text-lg font-black mt-0.5">{unpaidOrdersCount}</div>
              </button>
            </div>

            {/* Printing Queue Visual Roadmap Summary Bar */}
            <div className="rounded-xl bg-gradient-to-r from-slate-900 via-[#123B70] to-slate-900 p-3 text-white shadow-xs space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-amber-300">
                  <Printer className="h-3.5 w-3.5 text-amber-400" />
                  <span>Printing Queue Hierarchy (Priority FIFO → Normal FIFO)</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
                  <span>🔥 Priority Active: <strong className="text-amber-300 font-black">{priorityOrdersCount}</strong></span>
                  <span>•</span>
                  <span>📄 Normal Active: <strong className="text-white font-black">{normalOrdersCount}</strong></span>
                </div>
              </div>
              <p className="text-[11px] text-slate-200 leading-normal">
                <strong>Rule:</strong> Paid-online orders jump ahead to Priority Queue (FIFO by payment time; printed immediately). Send Document orders wait in Normal Queue; print starts when customer availability is verified at counter.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Instant Online Print Orders Queue
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Received through Supabase database • Showing {filteredOrders.length} order(s) sorted by Priority & FIFO
                  </p>
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Order ID / Phone / Name..."
                      className="rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2.5 py-1 text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setQuickFilter("ALL");
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    {orderStatuses.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-2.5">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const firstItem = order.items[0];
                    const options = firstItem?.selectedOptions || {};
                    const finishing = (options.finishing || {}) as Record<string, boolean>;
                    const qMeta = getQueueClassification(order);
                    const isPriority = qMeta.queuePriority === 1;
                    const positionInfo = queueStats.positionsMap.get(order.orderCode);
                    const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "paid";
                    const isOnlineOrder = order.paymentMethod === "upi_online" || order.paymentMethod === "pay_online";
                    const isSelected = selectedOrderCode === order.orderCode;

                    return (
                      <div
                        key={order.id}
                        id={`order-${order.orderCode}`}
                        className={cn(
                          "rounded-xl border p-3.5 space-y-2.5 transition-all bg-white shadow-xs",
                          isSelected
                            ? "border-[#123B70] ring-2 ring-[#123B70]/40 shadow-sm bg-blue-50/20"
                            : isPriority
                            ? "border-amber-400/80 ring-1 ring-amber-400/30 hover:border-amber-500"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {/* Top Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${
                              isPriority
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {isPriority ? <Printer className="h-4 w-4 text-amber-700" /> : <FileUp className="h-4 w-4 text-slate-600" />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-black text-xs sm:text-sm text-[#123B70]">
                                  {order.orderCode}
                                </span>

                                {/* Prominent Queue Badges */}
                                {isPriority ? (
                                  <span className="flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-950 border border-amber-400/60 px-2 py-0.2 text-[9px] font-black shadow-xs">
                                    <span>🔥 PRIORITY</span>
                                    <span>•</span>
                                    <span>💳 PAID ONLINE</span>
                                    {positionInfo && <span className="bg-amber-400 text-slate-950 px-1 py-0.2 rounded-sm font-black">#{positionInfo.positionInQueue}</span>}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.2 text-[9px] font-extrabold">
                                    <span>📄 NORMAL</span>
                                    <span>•</span>
                                    <span>💰 PAY AT SHOP</span>
                                    {positionInfo && <span className="bg-slate-200 text-slate-900 px-1 py-0.2 rounded-sm font-bold">#{positionInfo.positionInQueue}</span>}
                                  </span>
                                )}

                                <span className="rounded-full px-1.5 py-0.2 text-[9px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                                  {options.documentType || firstItem?.productName || "Print Job"}
                                </span>

                                {isToday(order.createdAt) && (
                                  <span className="rounded-full bg-blue-100 text-blue-800 text-[8px] font-extrabold px-1.5 py-0.2">
                                    TODAY
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Payment Badge & Toggle */}
                            <button
                              onClick={() => handleTogglePaymentStatus(order)}
                              disabled={updatingPayment}
                              title="Click to toggle Paid / Unpaid"
                              className={cn(
                                "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border transition-all cursor-pointer",
                                isPaid
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                              )}
                            >
                              <CreditCard className="h-2.5 w-2.5" />
                              <span>
                                {isOnlineOrder
                                  ? (isPaid ? "Paid Online" : "Online (Pending)")
                                  : (isPaid ? "Pay at Shop — Paid" : "Pay at Counter")}
                              </span>
                            </button>

                            <span className="text-xs font-black text-slate-900 px-1">
                              ₹{order.totalAmount}
                            </span>

                            {/* Status Selector */}
                            <select
                              value={order.orderStatus}
                              disabled={updatingStatus === order.orderCode}
                              onChange={(e: any) => handleUpdateOrderStatus(order.orderCode, e.target.value)}
                              className={cn(
                                "rounded-lg border px-2 py-1 text-[11px] font-black uppercase tracking-wider focus:outline-hidden cursor-pointer disabled:opacity-50",
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
                              className="p-1.5 rounded-lg bg-[#123B70]/10 hover:bg-[#123B70]/20 text-[#123B70] transition-colors cursor-pointer"
                              title="Inspect Full Order Drawer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <a
                              href={getWhatsAppLink(
                                `Hello ${order.customerName}, this is Palak Enterprises regarding your order *${order.orderCode}* (Status: ${order.orderStatus}).`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Specifications & Finishing Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                          {/* Printing Specs */}
                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
                            <span className="font-bold text-slate-700 block uppercase text-[9px] tracking-wider">
                              Printing Specs
                            </span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
                              <div>Paper: <span className="font-semibold text-slate-800">{String(options.paperSize || "A4").toUpperCase()}</span></div>
                              <div>Color: <span className="font-semibold text-slate-800">{options.colorMode === "bw" ? "B&W" : "Color"}</span></div>
                              <div>Sides: <span className="font-semibold text-slate-800">{options.sides === "single" ? "Single" : "Double"}</span></div>
                              <div>Copies: <span className="font-semibold text-slate-800">{firstItem?.quantity || 1}</span></div>
                            </div>
                          </div>

                          {/* Finishing Checklist */}
                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
                            <span className="font-bold text-slate-700 block uppercase text-[9px] tracking-wider">
                              Finishing Checklist
                            </span>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                              <div className={cn("flex items-center gap-1 font-medium", finishing.spiralBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.spiralBinding ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                                <span>Spiral Binding</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.combBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.combBinding ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                                <span>Comb Binding</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.lamination ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.lamination ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                                <span>Lamination</span>
                              </div>
                              <div className={cn("flex items-center gap-1 font-medium", finishing.stapling ? "text-emerald-700 font-bold" : "text-slate-400")}>
                                {finishing.stapling ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                                <span>Stapling</span>
                              </div>
                            </div>
                          </div>

                          {/* File & Instructions */}
                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1.5">
                            <span className="font-bold text-slate-700 block uppercase text-[9px] tracking-wider">
                              Attached Customer Files {order.items?.filter((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath).length > 1 ? `(${order.items.filter((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath).length})` : ""}
                            </span>

                            {order.items?.some((it) => it.uploadedFileName || it.uploadedFileUrl || it.selectedOptions?.storagePath) ? (
                              <div className="space-y-1">
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
                              <span className="text-[10px] text-slate-400 italic">No digital file uploaded</span>
                            )}

                            {order.orderNotes && (
                              <p className="text-[10px] text-slate-500 italic bg-white/70 p-1.5 rounded-md border border-slate-200">
                                Note: "{order.orderNotes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Invoice Indicator & Action Bar for Completed Orders */}
                        {order.orderStatus === "COMPLETED" && (() => {
                          const inv = invoices.find((i) => i.orderCode.toUpperCase() === order.orderCode.toUpperCase()) || PalakDataStore.getInvoiceForOrder(order.orderCode);
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100 bg-slate-50/60 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl">
                              <div className="flex items-center gap-1.5">
                                {inv ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span>Invoice #{inv.invoiceNumber} — Generated</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-md">
                                    Invoice Missing
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {inv ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInvoiceModal(order.orderCode)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>View Bill</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await downloadInvoicePDF(inv);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                      title="Direct PDF download"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>PDF</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInvoiceModal(order.orderCode)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                      title="Print preview"
                                    >
                                      <Printer className="h-3 w-3" />
                                      <span>Print</span>
                                    </button>
                                    <a
                                      href={getWhatsAppInvoiceShareLink(inv)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                                      title="Send invoice via WhatsApp"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      <span>Send Bill</span>
                                    </a>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={generatingInvoiceCode === order.orderCode}
                                    onClick={async () => {
                                      setGeneratingInvoiceCode(order.orderCode);
                                      await PalakDataStore.generateInvoiceForOrder(order, false, user?.name || "Palak Staff ERP");
                                      await loadData();
                                      setGeneratingInvoiceCode(null);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    <RefreshCw className={cn("h-3 w-3", generatingInvoiceCode === order.orderCode && "animate-spin")} />
                                    <span>Generate Bill Now</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No print orders matching your filter criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tax Invoices & Billing Dashboard */}
        {activeTab === "invoices" && (
          <div className="space-y-4 animate-fadeUp">
            {/* Financial & Invoices Overview Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Total Invoices Issued */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Invoices</span>
                  <div className="h-7 w-7 rounded-lg bg-[#123B70] text-white flex items-center justify-center shadow-xs">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {invoiceStats.totalInvoices}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Sequential PE Numbers
                </div>
              </div>

              {/* Today's Invoices */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Today's Invoices</span>
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                  {invoiceStats.todayInvoices}
                </div>
                <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
                  Fulfilled & Billed Today
                </div>
              </div>

              {/* Month's Invoices */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">This Month</span>
                  <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-950 mt-1">
                  {invoiceStats.monthInvoices}
                </div>
                <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                  Current Billing Cycle
                </div>
              </div>

              {/* Total Invoiced Amount */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Invoiced Turnover</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                  ₹{invoiceStats.totalInvoicedAmount.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  ₹{invoiceStats.totalPaidAmount.toLocaleString("en-IN")} Paid • ₹{invoiceStats.totalDueAmount.toLocaleString("en-IN")} Due
                </div>
              </div>

              {/* Pending Bills for Completed Orders */}
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Bills</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  {invoiceStats.pendingInvoices}
                </div>
                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                  {invoiceStats.pendingInvoices === 0 ? "All Completed Billed" : "Unbilled Completed"}
                </div>
              </div>
            </div>

            {/* Invoices List Table Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-[#123B70]" />
                    <span>Official Tax Invoices & Retail Bills</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Showing {filteredInvoices.length} of {invoices.length} generated invoice(s)
                  </p>
                </div>

                {/* Filters & Export Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input
                      type="text"
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder="Search Invoice # / Order / Phone..."
                      className="rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2.5 py-1 text-xs focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={invoicePaymentFilter}
                    onChange={(e: any) => setInvoicePaymentFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID">Paid Only</option>
                    <option value="PENDING">Payment Due</option>
                  </select>

                  <select
                    value={invoiceDateFilter}
                    onChange={(e: any) => setInvoiceDateFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today</option>
                    <option value="WEEK">Past 7 Days</option>
                    <option value="MONTH">Past 30 Days</option>
                  </select>

                  <button
                    type="button"
                    onClick={exportInvoicesCSV}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse admin-table">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/50">
                      <th className="py-2 px-2.5">Invoice #</th>
                      <th className="py-2 px-2.5">Order Ref</th>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5">Items Summary</th>
                      <th className="py-2 px-2.5 text-right">Grand Total</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => {
                        const isPaid = inv.paymentStatus === "confirmed" || inv.paymentStatus === "paid";
                        const itemsSummary = inv.items?.map((it) => `${it.productName} (x${it.quantity})`).join(", ") || "Printing Service";

                        return (
                          <tr key={inv.id || inv.invoiceNumber} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-2.5 font-mono font-black text-[#123B70]">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-700">
                              {inv.orderCode}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">
                              {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-slate-900">{inv.customerSnapshot?.name || "Customer"}</div>
                              <div className="text-[10px] text-slate-500">{inv.customerSnapshot?.phone || "N/A"}</div>
                            </td>
                            <td className="py-2 px-2.5 max-w-xs truncate text-slate-600 text-[11px]" title={itemsSummary}>
                              {itemsSummary}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black font-mono text-slate-900">
                              ₹{Number(inv.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <span
                                className={cn(
                                  "px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-0.5 border",
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : "bg-amber-50 text-amber-900 border-amber-300"
                                )}
                              >
                                {isPaid ? "PAID" : "DUE"}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceForModal(inv);
                                    setInvoiceModalOpen(true);
                                  }}
                                  className="p-1 rounded-md text-[#123B70] hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="View Full Bill"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await downloadInvoicePDF(inv);
                                  }}
                                  className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Download PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceForModal(inv);
                                    setInvoiceModalOpen(true);
                                  }}
                                  className="p-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Print Bill"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                                <a
                                  href={getWhatsAppInvoiceShareLink(inv)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  title="Send Bill on WhatsApp"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs">
                          No invoices matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Payments & Revenue Dashboard */}
        {activeTab === "payments" && (
          <div className="space-y-4 animate-fadeUp">
            {/* Financial Overview Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Total Revenue Collected */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Collected</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                  ₹{totalRevenueCollected.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{paidOrders.length} Paid Order{paidOrders.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              {/* Online Razorpay Payments */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#123B70]">Online (Razorpay)</span>
                  <div className="h-7 w-7 rounded-lg bg-[#123B70] text-white flex items-center justify-center shadow-xs">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  ₹{onlineRevenueCollected.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
                  {onlinePaidOrders.length} Online ({paidOrders.length ? Math.round((onlinePaidOrders.length / paidOrders.length) * 100) : 0}%)
                </div>
              </div>

              {/* Pending Receivables (Pay at Shop) */}
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending at Shop</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  ₹{pendingReceivablesAmount.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                  {unpaidOrdersList.length} Counter Orders
                </div>
              </div>

              {/* Today's Collections */}
              <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Today's Revenue</span>
                  <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-purple-950 mt-1">
                  ₹{todayRevenue.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                  {todayPaidOrders.length} Paid Today
                </div>
              </div>

              {/* Average Order Value */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg Ticket Value</span>
                  <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  ₹{avgTicketValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Per paid transaction
                </div>
              </div>
            </div>

            {/* Gateway Configuration & Quick Status Banner */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-900 via-[#123B70] to-indigo-950 text-white p-3.5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.2 text-[10px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Razorpay Active</span>
                    </span>
                    <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-1.5 py-0.2 text-[9px] font-black text-amber-300 uppercase tracking-wide">
                      Test Mode
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white">
                    Razorpay Online Payments & Counter Collections Ledger
                  </h3>
                  <p className="text-[11px] text-blue-200/90 leading-normal max-w-2xl">
                    Online orders (UPI, QR, cards) have Razorpay IDs. In-store collections can be marked Paid with one click.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <a
                    href="https://dashboard.razorpay.com/app/payments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    <span>Razorpay Dashboard</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => loadData()}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter, Search & Export Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, Customer Name, Phone, or Razorpay ID..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:border-[#123B70] focus:outline-hidden"
                  />
                  {paymentSearchQuery && (
                    <button
                      onClick={() => setPaymentSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Export CSV Button */}
                <button
                  onClick={exportPaymentsCSV}
                  disabled={filteredPaymentOrders.length === 0}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600" />
                  <span>Export CSV ({filteredPaymentOrders.length})</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                {/* Status Filters */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 mr-0.5 flex items-center gap-0.5">
                    <Filter className="h-2.5 w-2.5" />
                    <span>Status:</span>
                  </span>

                  <button
                    onClick={() => setPaymentStatusFilter("ALL")}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
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
                      "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
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
                      "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                      paymentStatusFilter === "PENDING"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                    )}
                  >
                    ⏳ Pending ({unpaidOrdersList.length})
                  </button>
                </div>

                {/* Method & Timeframe Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-0.5">Method:</span>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                    >
                      <option value="ALL">All Methods</option>
                      <option value="ONLINE">⚡ Online (UPI)</option>
                      <option value="SHOP">🏪 Shop Counter</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-0.5">Time:</span>
                    <select
                      value={paymentDateFilter}
                      onChange={(e) => setPaymentDateFilter(e.target.value as any)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
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
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">
                    Payment Transactions Ledger ({filteredPaymentOrders.length})
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Filtered Total: <strong className="text-emerald-700">₹{filteredPaymentOrders.filter(isPaidOrder).reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString("en-IN")}</strong> paid &amp; <strong className="text-amber-700">₹{filteredPaymentOrders.filter((o) => !isPaidOrder(o)).reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString("en-IN")}</strong> pending
                  </p>
                </div>
              </div>

              {filteredPaymentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100 admin-table">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Order Code</th>
                        <th className="px-3 py-2">Date & Time</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2">Service / Items</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Payment Method</th>
                        <th className="px-3 py-2">Razorpay ID</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
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
                            <td className="px-3 py-2 font-mono font-bold text-[#123B70]">
                              <button
                                onClick={() => handleOpenOrderModal(order)}
                                className="hover:underline cursor-pointer"
                                title="Click to view full order details"
                              >
                                {order.orderCode}
                              </button>
                            </td>

                            {/* Date */}
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
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
                            <td className="px-3 py-2">
                              <div className="font-bold text-slate-900 truncate max-w-[130px]">
                                {order.customerName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {order.customerPhone}
                              </div>
                            </td>

                            {/* Service / Items */}
                            <td className="px-3 py-2 max-w-[160px]">
                              <div className="font-semibold text-slate-800 truncate text-[11px]" title={serviceTitle}>
                                {serviceTitle}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {order.items?.length || 1} item(s) • {order.fulfillmentType === "delivery" ? "Delivery" : "Store Pickup"}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-3 py-2 font-black text-slate-900 text-xs whitespace-nowrap">
                              ₹{order.totalAmount}
                            </td>

                            {/* Payment Method Badge */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {isOnline ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CreditCard className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <span>🏪 Shop</span>
                                </span>
                              )}
                            </td>

                            {/* Razorpay Reference ID */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {rzpId ? (
                                <div className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold text-slate-700 border border-slate-200">
                                  <span className="truncate max-w-[90px]">{rzpId}</span>
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
                                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-2.5 w-2.5 text-slate-500" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  {isOnline ? "Simulated" : "In-store"}
                                </span>
                              )}
                            </td>

                            {/* Payment Status Badge */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                                  isPaid
                                    ? "bg-emerald-500 text-white"
                                    : "bg-amber-100 text-amber-900 border border-amber-300"
                                )}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-2.5 w-2.5 text-amber-700" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                              {/* Toggle Payment Button */}
                              <button
                                onClick={() => handleTogglePaymentStatus(order)}
                                disabled={updatingPayment}
                                className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50",
                                  isPaid
                                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                    : "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                )}
                                title={isPaid ? "Mark as Unpaid / Pending" : "Mark as Paid at Store Counter"}
                              >
                                {isPaid ? "Unpaid" : "Paid ✓"}
                              </button>

                              {/* WhatsApp Notice / Receipt */}
                              <a
                                href={getWhatsAppLink(
                                  `Hello ${order.customerName},\n\nRegarding your Palak Enterprises Order *${order.orderCode}* (₹${order.totalAmount}):\nPayment Status: *${isPaid ? "PAID" : "PENDING (Pay at Counter)"}*.\n\nThank you!`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 inline-flex rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                                title="Send WhatsApp Receipt"
                              >
                                <MessageSquare className="h-3 w-3 text-emerald-600" />
                              </a>

                              {/* View Details Modal */}
                              <button
                                onClick={() => handleOpenOrderModal(order)}
                                className="p-1 inline-flex rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="View full order details"
                              >
                                <Eye className="h-3 w-3 text-[#123B70]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-slate-400 space-y-1.5">
                  <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No payment records found matching your filter criteria.</p>
                  <p className="text-[10px] text-slate-400">Try adjusting your search term or clearing the status/method filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Print Pricing Manager */}
        {activeTab === "pricing" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-4.5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Print Pricing & Finishing Configuration
                </h2>
                <p className="text-[11px] text-slate-500">
                  Configure live per-page rates, paper multipliers, and binding/lamination charges for Instant Online Services.
                </p>
              </div>

              {pricingSavedNotice && (
                <div className="flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 px-2.5 py-1 text-xs font-bold border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pricing saved & active!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePricingConfig} className="space-y-4">
              {/* 1. Base Rates */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Document Printing Base Rates (A4)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">B&W Single Side (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">B&W Double Side (₹/side)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Color Single Side (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Color Double Side (₹/side)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Finishing Options Pricing */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Finishing Options Charges
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Spiral Binding (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Comb Binding (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Lamination (₹/page)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Stapling (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Passport & ID Cards */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Passport Photos & PVC ID Cards
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">8 Photo Sheet (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">16 Photo Sheet (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">PVC ID Single (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Lanyard + Holder (₹)</label>
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={pricingSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#123B70] hover:bg-[#0c274c] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{pricingSaving ? "Saving..." : "Save Pricing Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Digital Services List */}
        {activeTab === "services" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Digital / CSC Applications</h2>
              <span className="text-[11px] text-slate-400">{serviceRequests.length} Total Requests</span>
            </div>

            <div className="space-y-2">
              {serviceRequests.length > 0 ? (
                serviceRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5 hover:border-slate-300 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-mono font-bold text-amber-600 text-xs sm:text-sm">{req.requestCode}</span>
                        <span className="text-xs font-bold text-slate-900 ml-1.5">{req.serviceName}</span>
                        <span className="text-[11px] text-slate-500 ml-1.5">({req.customerName} - {req.customerPhone})</span>
                      </div>

                      <select
                        value={req.requestStatus}
                        onChange={(e: any) => handleUpdateServiceStatus(req.requestCode, e.target.value)}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 cursor-pointer"
                      >
                        {serviceStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {req.uploadedDocumentUrls && req.uploadedDocumentUrls.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                          Applicant Documents ({req.uploadedDocumentUrls.length})
                        </span>
                        <div className="space-y-0.5">
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
                <div className="text-center py-6 text-xs text-slate-400">No applications in queue.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Quotes List */}
        {activeTab === "quotes" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Custom Quote Inquiries</h2>
              <span className="text-[11px] text-slate-400">{quoteRequests.length} Total</span>
            </div>

            <div className="space-y-2">
              {quoteRequests.length > 0 ? (
                quoteRequests.map((q) => (
                  <div key={q.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5 hover:border-slate-300 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#123B70] text-xs sm:text-sm">{q.quoteCode}</span>
                        <span className="text-xs font-bold text-slate-800 ml-1.5">{q.serviceOrProductType}</span>
                        <span className="text-[11px] text-slate-500 ml-1">({q.customerName} - {q.customerPhone})</span>
                      </div>

                      <select
                        value={q.quoteStatus}
                        onChange={(e: any) => handleUpdateQuoteStatus(q.quoteCode, e.target.value)}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="NEW">NEW</option>
                        <option value="ESTIMATE_PREPARED">ESTIMATE_PREPARED</option>
                        <option value="QUOTE_SENT">QUOTE_SENT</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="DECLINED">DECLINED</option>
                      </select>
                    </div>

                    {q.referenceFileUrls && q.referenceFileUrls.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                          Reference Documents ({q.referenceFileUrls.length})
                        </span>
                        <div className="space-y-0.5">
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
                <div className="text-center py-6 text-xs text-slate-400">No quotes pending.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Designs List */}
        {activeTab === "designs" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Design Studio Requests</h2>
              <span className="text-[11px] text-slate-400">{designRequests.length} Total</span>
            </div>

            <div className="space-y-2">
              {designRequests.length > 0 ? (
                designRequests.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-3 space-y-1.5 hover:border-slate-300 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-purple-700 text-xs sm:text-sm">{d.designCode}</span>
                        <span className="text-xs font-bold text-slate-900 ml-1.5">{d.titleOrEvent}</span>
                        <span className="text-[11px] text-slate-500 ml-1">({d.customerName})</span>
                      </div>

                      <select
                        value={d.designStatus}
                        onChange={(e: any) => handleUpdateDesignStatus(d.designCode, e.target.value)}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="NEW">NEW</option>
                        <option value="IN_DESIGN">IN_DESIGN</option>
                        <option value="PROOF_SENT">PROOF_SENT</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="SENT_TO_PRINT">SENT_TO_PRINT</option>
                      </select>
                    </div>

                    {((d.referenceFileUrls && d.referenceFileUrls.length > 0) || d.proofFileUrl) && (
                      <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                          Design Assets & Proofs
                        </span>
                        <div className="space-y-0.5">
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
                <div className="text-center py-6 text-xs text-slate-400">No design requests.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Order Detail Drawer / Modal */}
      {selectedOrderForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseOrderModal();
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl space-y-3.5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-[#123B70]">
                    {selectedOrderForModal.orderCode}
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
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
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Placed: {new Date(selectedOrderForModal.createdAt).toLocaleString()} • Fulfillment: {selectedOrderForModal.fulfillmentType}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseOrderModal}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Close Order Details Modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Customer & Payment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Customer Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Customer Details</span>
                <div className="space-y-0.5 text-xs">
                  <div><strong>Name:</strong> {selectedOrderForModal.customerName}</div>
                  <div><strong>Phone:</strong> {selectedOrderForModal.customerPhone}</div>
                  {selectedOrderForModal.customerEmail && (
                    <div><strong>Email:</strong> {selectedOrderForModal.customerEmail}</div>
                  )}
                  {selectedOrderForModal.userId && (
                    <div><strong>User ID:</strong> <span className="font-mono text-[10px] text-slate-600">{selectedOrderForModal.userId}</span></div>
                  )}
                </div>
                <div className="pt-1">
                  <a
                    href={getWhatsAppLink(`Hello ${selectedOrderForModal.customerName}, regarding your Palak Enterprises order (${selectedOrderForModal.orderCode}): `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Open WhatsApp Chat</span>
                  </a>
                </div>
              </div>

              {/* Payment & Financial Snapshot Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Financial Breakdown</span>
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-700">Order Snapshot</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  {selectedOrderForModal.subtotalAmount !== undefined && (
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">₹{selectedOrderForModal.subtotalAmount}</span>
                    </div>
                  )}
                  {selectedOrderForModal.discountAmount !== undefined && selectedOrderForModal.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-₹{selectedOrderForModal.discountAmount}</span>
                    </div>
                  )}
                  {selectedOrderForModal.platformFee !== undefined && selectedOrderForModal.platformFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee:</span>
                      <span className="font-semibold text-slate-900">₹{selectedOrderForModal.platformFee}</span>
                    </div>
                  )}
                  {selectedOrderForModal.deliveryFee !== undefined && selectedOrderForModal.deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee:</span>
                      <span className="font-semibold text-slate-900">₹{selectedOrderForModal.deliveryFee}</span>
                    </div>
                  )}
                  {selectedOrderForModal.otherCharges !== undefined && selectedOrderForModal.otherCharges > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Other Charges:</span>
                      <span className="font-semibold text-slate-900">₹{selectedOrderForModal.otherCharges}</span>
                    </div>
                  )}
                  {selectedOrderForModal.taxAmount !== undefined && selectedOrderForModal.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST / Tax {selectedOrderForModal.taxRate ? `(${selectedOrderForModal.taxRate}%)` : ''}:</span>
                      <span className="font-semibold text-slate-900">₹{selectedOrderForModal.taxAmount}</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-slate-200 flex justify-between items-baseline">
                    <strong>Grand Total:</strong>
                    <span className="text-sm font-black text-slate-900">₹{selectedOrderForModal.totalAmount}</span>
                  </div>
                  <div><strong>Method:</strong> {selectedOrderForModal.paymentMethod === "upi_online" || selectedOrderForModal.paymentMethod === "pay_online" ? "UPI / Online Payment" : "Pay at Shop Counter"}</div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <strong>Status:</strong>
                    <span className={cn(
                      "rounded-md px-1.5 py-0.2 text-[10px] font-bold",
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
                  className="w-full mt-1.5 py-1 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  {selectedOrderForModal.paymentStatus === "confirmed" ? "Mark as Pending / Unpaid" : "✓ Mark as Paid / Verified"}
                </button>
              </div>
            </div>

            {/* Queue & Dispatch Metadata Card */}
            {(() => {
              const modalQMeta = getQueueClassification(selectedOrderForModal);
              const isModalPriority = modalQMeta.queuePriority === 1;
              const modalQPos = queueStats.positionsMap.get(selectedOrderForModal.orderCode);
              return (
                <div className={cn(
                  "rounded-xl border p-3 space-y-1.5",
                  isModalPriority ? "bg-amber-500/10 border-amber-400/60" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Printing Queue Dispatch Status</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border",
                      isModalPriority ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-slate-200 text-slate-800 border-slate-300"
                    )}>
                      {isModalPriority ? "🔥 Priority Queue (Level 1)" : "📄 Normal Queue (Level 2)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Queue Position:</span>
                      <strong className="text-slate-900 font-black">
                        {modalQPos ? `#${modalQPos.positionInQueue} in ${isModalPriority ? "Priority" : "Normal"} Queue` : "Completed / Ready"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Submitted At:</span>
                      <span className="text-slate-700 font-mono text-[10px]">
                        {new Date(selectedOrderForModal.submittedAt || selectedOrderForModal.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Payment Verified At:</span>
                      <span className="text-slate-700 font-mono text-[10px]">
                        {selectedOrderForModal.priorityAt ? new Date(selectedOrderForModal.priorityAt).toLocaleString("en-IN") : "N/A (Pending at Counter)"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Print Specification & Options */}
            {selectedOrderForModal.items.map((item, idx) => {
              const opts = item.selectedOptions || {};
              const fin = (opts.finishing || {}) as Record<string, boolean>;

              return (
                <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      Product: {opts.documentType || item.productName || "Custom Print"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Qty: {item.quantity} • ₹{item.totalPrice}
                    </span>
                  </div>

                  {/* Print Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="text-[9px] text-slate-400 block">Paper Size</span>
                      <span className="font-bold text-slate-800">{String(opts.paperSize || "A4").toUpperCase()}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="text-[9px] text-slate-400 block">Color Mode</span>
                      <span className="font-bold text-slate-800">{opts.colorMode === "bw" ? "B&W" : "Color"}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="text-[9px] text-slate-400 block">Sides</span>
                      <span className="font-bold text-slate-800">{opts.sides === "single" ? "Single Side" : "Double Side"}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="text-[9px] text-slate-400 block">Orientation</span>
                      <span className="font-bold text-slate-800">{opts.orientation || "Portrait"}</span>
                    </div>
                  </div>

                  {/* Finishing Checklist */}
                  <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">Finishing Services Required</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                      <div className={cn("flex items-center gap-1 font-medium", fin.spiralBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.spiralBinding ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                        <span>Spiral Binding</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.combBinding ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.combBinding ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                        <span>Comb Binding</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.lamination ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.lamination ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                        <span>Lamination</span>
                      </div>
                      <div className={cn("flex items-center gap-1 font-medium", fin.stapling ? "text-emerald-700 font-bold" : "text-slate-400")}>
                        {fin.stapling ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-300" />}
                        <span>Stapling</span>
                      </div>
                    </div>
                  </div>

                  {/* Attached File Display & Actions */}
                  {(item.uploadedFileName || item.uploadedFileUrl) && (
                    <div className="space-y-0.5 pt-0.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block">
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
            <div className="space-y-2">
              {selectedOrderForModal.orderNotes && (
                <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-2.5 text-xs text-amber-900">
                  <strong>Customer Instructions:</strong> "{selectedOrderForModal.orderNotes}"
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Staff Notes & Production Remarks
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={staffNoteInput}
                    onChange={(e) => setStaffNoteInput(e.target.value)}
                    placeholder="e.g. Printed on 100 GSM paper, front glossy laminated..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveStaffNote(selectedOrderForModal.orderCode)}
                    disabled={savingNote}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Transition Action Buttons */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Update Production Status (Auto-notifies Customer)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "UNDER_REVIEW")}
                  className={cn(
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
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
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
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
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
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
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "READY_FOR_PICKUP"
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  4. Ready Pickup
                </button>

                <button
                  type="button"
                  disabled={Boolean(updatingStatus)}
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal.orderCode, "COMPLETED")}
                  className={cn(
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
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
                    "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50",
                    selectedOrderForModal.orderStatus === "CANCELLED"
                      ? "bg-rose-600 text-white border-rose-700"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-rose-700"
                  )}
                >
                  Cancel Order
                </button>
              </div>
            </div>

            {/* Official Tax Invoice Card in Order Modal */}
            {(() => {
              const inv = invoices.find((i) => i.orderCode.toUpperCase() === selectedOrderForModal.orderCode.toUpperCase()) || PalakDataStore.getInvoiceForOrder(selectedOrderForModal.orderCode);
              return (
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase text-[#123B70] tracking-wider flex items-center gap-1">
                      <Receipt className="h-3.5 w-3.5 text-[#123B70]" />
                      Official Tax Invoice & Billing
                    </span>
                    {inv ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                        <span>#{inv.invoiceNumber}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {selectedOrderForModal.orderStatus === "COMPLETED" ? "Ready to Generate" : "Auto-generates on Completion"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {inv ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceForModal(inv);
                            setInvoiceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#123B70] hover:bg-[#0c274c] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Bill</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await downloadInvoicePDF(inv);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceForModal(inv);
                            setInvoiceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print</span>
                        </button>

                        <a
                          href={getWhatsAppInvoiceShareLink(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Send Bill</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRegenerateInvoiceForOrder(selectedOrderForModal.orderCode)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer ml-auto"
                          title="Regenerate bill snapshot from latest order values"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Regenerate</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={generatingInvoiceCode === selectedOrderForModal.orderCode}
                        onClick={async () => {
                          setGeneratingInvoiceCode(selectedOrderForModal.orderCode);
                          await PalakDataStore.generateInvoiceForOrder(selectedOrderForModal, false, user?.name || "Palak Staff ERP");
                          await loadData();
                          setGeneratingInvoiceCode(null);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3 w-3", generatingInvoiceCode === selectedOrderForModal.orderCode && "animate-spin")} />
                        <span>Generate Official Bill Now</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Audit Trail: Status History Timeline */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <History className="h-3 w-3" />
                Audit Trail & Status History
              </span>

              {loadingTimeline ? (
                <div className="text-center py-2 text-xs text-slate-400">Loading history...</div>
              ) : orderHistoryTimeline.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {orderHistoryTimeline.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#123B70] mt-1 shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px]">{h.new_status || h.newStatus}</span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(h.created_at || h.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[10px]">{h.message_en || h.messageEn}</p>
                        {h.performed_by && (
                          <span className="text-[9px] text-slate-400 block">By: {h.performed_by}</span>
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

      {/* Dedicated Interactive Tax Invoice & Bill Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoice={selectedInvoiceForModal}
        isAdmin={true}
        onRegenerate={selectedInvoiceForModal ? (reason?: string) => handleRegenerateInvoiceForOrder(selectedInvoiceForModal.orderCode, reason) : undefined}
      />
    </div>
  );
};

export default AdminPage;
