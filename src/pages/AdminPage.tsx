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

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q);

    const matchesStatus = statusFilter === "ALL" || o.orderStatus === statusFilter;
    return matchesQuery && matchesStatus;
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Instant Online Print Orders Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect printing parameters, finishing requirements, and update customer pickup status.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Order ID / Phone..."
                    className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-all bg-white shadow-xs"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#123B70] flex items-center justify-center font-bold">
                            <Printer className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm sm:text-base text-[#123B70]">
                                {order.orderCode}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {options.documentType || firstItem?.productName || "Print Job"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Customer: <span className="font-bold text-slate-800">{order.customerName}</span> ({order.customerPhone})
                              {order.customerEmail && ` • ${order.customerEmail}`}
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            ₹{order.totalAmount}
                          </span>

                          <select
                            value={order.orderStatus}
                            onChange={(e: any) => handleUpdateOrderStatus(order.orderCode, e.target.value)}
                            className={cn(
                              "rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider focus:outline-hidden cursor-pointer",
                              order.orderStatus === "READY_FOR_PICKUP"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : order.orderStatus === "IN_PRODUCTION"
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : "bg-slate-50 text-slate-800 border-slate-300"
                            )}
                          >
                            {orderStatuses.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>

                          <a
                            href={getWhatsAppLink(`Hello ${order.customerName}, regarding your Palak Enterprises print order (${order.orderCode}): `)}
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
                          {firstItem?.uploadedFileName ? (
                            <div className="flex items-center justify-between text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              <span className="truncate font-semibold max-w-[140px]">{firstItem.uploadedFileName}</span>
                              {firstItem.uploadedFileUrl && (
                                <a
                                  href={firstItem.uploadedFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>View / Download</span>
                                </a>
                              )}
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
    </div>
  );
};

export default AdminPage;
