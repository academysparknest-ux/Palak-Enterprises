import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Package,
  Globe,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Building,
  Key,
  Printer,
  ChevronRight,
  FileText,
  Sparkles,
  MessageSquare,
  Clock,
  ArrowRight,
  CheckCircle2,
  Layers,
  Search,
  Receipt,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  PalakDataStore,
  type StoredOrder,
  type StoredServiceRequest,
  type StoredQuoteRequest,
} from "../lib/storage/store";
import { getUserOrders, getInvoiceByOrderCode } from "../lib/supabase/database";
import { supabase, isSupabaseConfigured } from "../lib/supabase/client";
import { SEO } from "../components/SEO";
import { business, getWhatsAppLink } from "../config/business";
import { InvoiceModal } from "../components/invoice/InvoiceModal";
import type { StoredInvoice } from "../lib/invoice/types";
import { PalakInvoiceStore } from "../lib/invoice/invoiceStore";

export const AccountPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user, isAuthenticated, isStaff, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. All Hooks MUST be called unconditionally at the top level
  const tabParam = searchParams.get("tab");
  const initialTab = (tabParam === "services" || tabParam === "quotes" || tabParam === "profile")
    ? tabParam
    : "orders";
  const [activeTab, setActiveTab] = useState<"orders" | "services" | "quotes" | "profile">(initialTab);

  const [customerOrders, setCustomerOrders] = useState<StoredOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [customerServices, setCustomerServices] = useState<StoredServiceRequest[]>([]);
  const [customerQuotes, setCustomerQuotes] = useState<StoredQuoteRequest[]>([]);

  // Invoice modal state
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<StoredInvoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const handleOpenOrderInvoice = async (orderCode: string) => {
    let inv = PalakInvoiceStore.getLocalInvoiceByOrderCode(orderCode);
    if (!inv) {
      inv = (await getInvoiceByOrderCode(orderCode, user?.phone).catch(() => null)) || undefined;
    }
    if (inv) {
      setSelectedInvoiceForModal(inv);
      setInvoiceModalOpen(true);
    }
  };

  // Update tab in URL when changed
  const handleTabChange = (tab: "orders" | "services" | "quotes" | "profile") => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Safe user fields
  const userPhone = user?.phone ? String(user.phone).trim() : "";
  const userEmail = user?.email ? String(user.email).trim().toLowerCase() : "";
  const userId = user?.id;

  // 2. Fetch and sync user data
  useEffect(() => {
    let mounted = true;

    if (!isAuthenticated || loading) {
      if (mounted) {
        setCustomerOrders([]);
        setCustomerServices([]);
        setCustomerQuotes([]);
        setOrdersLoading(false);
      }
      return;
    }

    const loadUserData = async () => {
      setOrdersLoading(true);
      try {
        // Fetch orders: Remote Supabase with local store fallback only if offline
        let orders: StoredOrder[] = [];
        let fetchedFromCloud = false;

        if (userId && isSupabaseConfigured) {
          try {
            const remote = await getUserOrders(userId);
            orders = remote;
            fetchedFromCloud = true;
          } catch (e) {
            console.warn("Supabase user orders fetch notice:", e);
          }
        }

        // Only check local fallback if cloud was not configured or offline
        if (!fetchedFromCloud) {
          if (orders.length === 0 && userPhone) {
            try {
              orders = PalakDataStore.getOrdersByPhone(userPhone);
            } catch {
              orders = [];
            }
          }

          if (orders.length === 0) {
            const allOrders = PalakDataStore.getOrders();
            orders = allOrders.filter((o) => {
              if (userPhone && o.customerPhone && o.customerPhone.includes(userPhone)) return true;
              if (userEmail && o.customerEmail && o.customerEmail.toLowerCase() === userEmail) return true;
              if (userId && o.userId === userId) return true;
              return false;
            });
          }
        }

        // Fetch digital service requests safely
        let services: StoredServiceRequest[] = [];
        try {
          const allServices = PalakDataStore.getServiceRequests();
          services = allServices.filter((s) => {
            if (userPhone && s.customerPhone && typeof s.customerPhone === "string" && s.customerPhone.includes(userPhone)) {
              return true;
            }
            if (userEmail && s.customerEmail && typeof s.customerEmail === "string" && s.customerEmail.toLowerCase() === userEmail) {
              return true;
            }
            return false;
          });
        } catch {
          services = [];
        }

        // Fetch quote requests safely
        let quotes: StoredQuoteRequest[] = [];
        try {
          const allQuotes = PalakDataStore.getQuoteRequests();
          quotes = allQuotes.filter((q) => {
            if (userPhone && q.customerPhone && typeof q.customerPhone === "string" && q.customerPhone.includes(userPhone)) {
              return true;
            }
            if (userEmail && q.customerEmail && typeof q.customerEmail === "string" && q.customerEmail.toLowerCase() === userEmail) {
              return true;
            }
            return false;
          });
        } catch {
          quotes = [];
        }

        if (mounted) {
          setCustomerOrders(orders);
          setCustomerServices(services);
          setCustomerQuotes(quotes);
        }
      } catch (err) {
        console.error("Account data load exception:", err);
      } finally {
        if (mounted) {
          setOrdersLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, loading, userId, userPhone, userEmail]);

  // Supabase Realtime: auto-refresh customer orders on status changes
  const customerRealtimeRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !userId || !supabase) return;

    const channel = supabase
      .channel(`customer-orders-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        async () => {
          // Refresh the customer's orders from database
          try {
            const fresh = await getUserOrders(userId);
            if (fresh) {
              setCustomerOrders(fresh);
            }
          } catch (e) {
            console.warn("[Palak] Customer realtime refresh failed:", e);
          }
        }
      )
      .subscribe();

    customerRealtimeRef.current = channel;

    const client = supabase;
    return () => {
      if (customerRealtimeRef.current && client) {
        client.removeChannel(customerRealtimeRef.current);
        customerRealtimeRef.current = null;
      }
    };
  }, [isAuthenticated, userId]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const userDisplayName = useMemo(() => {
    if (user?.name && user.name.trim()) return user.name.trim();
    if (user?.email) return user.email.split("@")[0];
    return currentLang === "hi" ? "ग्राहक" : "Customer";
  }, [user?.name, user?.email, currentLang]);

  const userInitial = useMemo(() => {
    return userDisplayName.charAt(0).toUpperCase() || "U";
  }, [userDisplayName]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "Recently" : d.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  // ==========================================
  // Render State 1: Session Loading
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F7F8FA] px-4">
        <SEO
          title={{
            en: "Customer Account | Palak Enterprises",
            hi: "ग्राहक अकाउंट | पालक इंटरप्राइजेज",
          }}
          description={{
            en: "Manage your Palak Enterprises profile, orders, design requests, and CSC services.",
            hi: "पालक इंटरप्राइजेज प्रोफाइल, ऑर्डर, डिज़ाइन रिक्वेस्ट और सीएससी सेवाओं का प्रबंधन करें।",
          }}
        />
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-card max-w-sm w-full text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Palak Enterprises</h3>
            <p className="text-xs text-slate-500 mt-1">
              {currentLang === "hi" ? "अकाउंट लोड हो रहा है..." : "Loading your account..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render State 2: Not Authenticated
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F8FA] py-16 px-4 sm:px-6 flex items-center justify-center">
        <SEO
          title={{
            en: "Sign In to Your Account | Palak Enterprises",
            hi: "अकाउंट में साइन इन करें | पालक इंटरप्राइजेज",
          }}
          description={{
            en: "Access your printing orders, invoices, proofs, and citizen service requests.",
            hi: "अपने प्रिंटिंग ऑर्डर, इनवॉइस, डिज़ाइन प्रूफ और नागरिक सेवा अनुरोध देखें।",
          }}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 max-w-md w-full shadow-card text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
            <User className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {currentLang === "hi" ? "अकाउंट में साइन इन करें" : "Sign In to Your Account"}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {currentLang === "hi"
                ? "अपने ऑर्डर, इनवॉइस, डिजिटल सेवाएं और डिज़ाइन प्रूफ देखने के लिए कृपया लॉगिन करें।"
                : "Sign in to manage your orders, check proof status, and view CSC citizen services."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/login?returnTo=/account"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] py-3.5 text-xs sm:text-sm font-bold text-white shadow-card transition-all"
            >
              <span>{currentLang === "hi" ? "ईमेल या गूगल से लॉगिन करें" : "Sign In with Email or Google"}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <Link
              to="/signup?returnTo=/account"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3.5 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
            >
              <span>{currentLang === "hi" ? "नया अकाउंट बनाएं" : "Create New Account"}</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{currentLang === "hi" ? "बिना लॉगिन ट्रैक करें:" : "Track without login:"}</span>
            <Link to="/track-order" className="font-bold text-[#123B70] hover:underline inline-flex items-center gap-1">
              <span>{currentLang === "hi" ? "ट्रैक ऑर्डर" : "Track Order"}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render State 3: Authenticated Customer Dashboard
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      <SEO
        title={{
          en: `My Account (${userDisplayName}) | Palak Enterprises`,
          hi: `मेरा अकाउंट (${userDisplayName}) | पालक इंटरप्राइजेज`,
        }}
        description={{
          en: "Manage your Palak Enterprises profile, orders, design requests, and CSC services.",
          hi: "पालक इंटरप्राइजेज प्रोफाइल, ऑर्डर, डिज़ाइन रिक्वेस्ट और सीएससी सेवाओं का प्रबंधन करें।",
        }}
      />

      {/* Header Profile Banner */}
      <div className="relative overflow-hidden bg-[#123B70] border-b border-line text-white py-8 sm:py-10 px-4 sm:px-6">
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
        <div className="relative mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={userDisplayName}
                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-md shrink-0 bg-white/10"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center ring-4 ring-white/20 shadow-md shrink-0">
                {userInitial}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                  {userDisplayName}
                </h1>
                {isStaff ? (
                  <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {isAdmin ? "Admin ERP" : "Staff Member"}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{currentLang === "hi" ? "सत्यापित ग्राहक" : "Verified Customer"}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-amber-300" />
                    <span>{user.email}</span>
                  </span>
                )}
                {user?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>+91 {user.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isStaff && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <Building className="h-4 w-4" />
                <span>{currentLang === "hi" ? "स्टाफ ERP डैशबोर्ड →" : "Staff ERP Board →"}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{currentLang === "hi" ? "लॉगआउट" : "Log Out"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4 space-y-6">

        {/* First-time / Welcome Quick Shortcuts */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{currentLang === "hi" ? `नमस्ते, ${userDisplayName}! त्वरित सेवाएँ` : `Welcome, ${userDisplayName}! Quick Services`}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLang === "hi"
                  ? "तुरंत ऑनलाइन प्रिंटिंग, सरकारी योजनाएं या निमंत्रण कार्ड ऑर्डर करें"
                  : "Start instant online printing, citizen certificates, or wedding invitations"}
              </p>
            </div>

            <a
              href={getWhatsAppLink(`Hi Palak Enterprises, I am logged in as ${userDisplayName} and need assistance.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>{currentLang === "hi" ? "व्हाट्सएप सपोर्ट" : "WhatsApp Help"}</span>
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/online-services"
              className="group rounded-2xl border border-slate-200/90 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 p-3.5 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#123B70] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#123B70]">
                  {currentLang === "hi" ? "प्रिंट ऑर्डर" : "Online Printing"}
                </h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">PDF, Photos, Cards</p>
              </div>
            </Link>

            <Link
              to="/digital-services"
              className="group rounded-2xl border border-slate-200/90 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 p-3.5 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                  {currentLang === "hi" ? "सरकारी सेवाएँ" : "CSC Citizen Services"}
                </h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">PAN, RTPS, Forms</p>
              </div>
            </Link>

            <Link
              to="/wedding-events"
              className="group rounded-2xl border border-slate-200/90 bg-slate-50 hover:bg-rose-50/50 hover:border-rose-200 p-3.5 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-100 text-[#881337] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#881337]">
                  {currentLang === "hi" ? "शादी कार्ड" : "Wedding Cards"}
                </h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">Premium & Offset</p>
              </div>
            </Link>

            <Link
              to="/track-order"
              className="group rounded-2xl border border-slate-200/90 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-200 p-3.5 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                  {currentLang === "hi" ? "ऑर्डर ट्रैक करें" : "Track Any Order"}
                </h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">Live Status Search</p>
              </div>
            </Link>
          </div>

          {/* Store Pickup & Queue-Skipping Notice */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-teal-50/50 to-emerald-50/80 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#123B70] text-white flex items-center justify-center shrink-0">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <span className="font-black text-slate-900 block">
                  📍 {currentLang === "hi" ? "दुकान से संग्रह (Store Pickup at Chakia):" : "Order Collection Location & Zero Queue:"}
                </span>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  {currentLang === "hi"
                    ? "तैयार प्रिंट लेने के लिए दुकान (ब्लॉक गेट, चकिया) आएं। ऑनलाइन ऑर्डर और भुगतान से आपको दुकान पर लाइन में इंतज़ार नहीं करना पड़ता — प्रिंट पहले से तैयार मिलता है!"
                    : "Collect your prints at Palak Enterprises (Near Block Gate, Chakia). Online orders & payments skip counter lines and file-transfer delays for instant collection!"}
                </p>
              </div>
            </div>
            <Link
              to="/track-order"
              className="text-[11px] font-bold text-[#123B70] bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-xl shrink-0 transition-colors"
            >
              {currentLang === "hi" ? "लाइव ट्रैकिंग →" : "Track Order →"}
            </Link>
          </div>
        </div>

        {/* Dashboard Tabs Navigation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs flex flex-wrap items-center gap-1 max-w-2xl">
          <button
            type="button"
            onClick={() => handleTabChange("orders")}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "orders" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "प्रिंट ऑर्डर्स" : "Print Orders"}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {customerOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("services")}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "services" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "डिजिटल सेवाएँ" : "Services"}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "services" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {customerServices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("quotes")}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "quotes" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "कोटेशन" : "Quotes"}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "quotes" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {customerQuotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "profile" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "प्रोफाइल" : "Profile"}</span>
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent mx-auto mb-3" />
                <span>Loading your orders...</span>
              </div>
            ) : customerOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerOrders.map((order) => {
                  const itemsList = Array.isArray(order.items) ? order.items : [];
                  const firstItem = itemsList[0];
                  const paymentMethodClean = (order.paymentMethod || "pay_at_store").replace(/_/g, " ");
                  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "paid";

                  return (
                    <div
                      key={order.id || order.orderCode}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            {order.orderCode}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123B70] border border-blue-200">
                            {order.orderStatus || "NEW"}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {itemsList.length > 0
                            ? itemsList.map((i) => i?.productName || "Print Item").join(", ")
                            : "Custom Print Order"}
                        </h3>

                        {firstItem?.uploadedFileName && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                            <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{firstItem.uploadedFileName}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Total: <strong className="text-slate-900 font-bold">₹{order.totalAmount ?? 0}</strong></span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatDate(order.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[11px] font-medium capitalize px-2 py-0.5 rounded-md ${
                          isPaid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {isPaid ? "✓ Paid" : `Payment: ${paymentMethodClean}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {order.orderStatus === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleOpenOrderInvoice(order.orderCode)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>View Bill</span>
                            </button>
                          )}
                          <Link
                            to={`/track-order?code=${encodeURIComponent(order.orderCode)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                          >
                            <span>Track Status →</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto">
                  <Printer className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "अभी तक कोई प्रिंट ऑर्डर नहीं है" : "No Print Orders Yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === "hi"
                      ? "दस्तावेज, पासपोर्ट फोटो, विजिटिंग कार्ड या बैनर का त्वरित ऑनलाइन ऑर्डर दें।"
                      : "Start an instant online printing order for documents, photos, or business cards."}
                  </p>
                </div>
                <Link
                  to="/online-services"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>{currentLang === "hi" ? "तुरंत प्रिंट ऑर्डर करें" : "Start Online Print Job"}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Digital Services */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {customerServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerServices.map((req) => (
                  <div
                    key={req.id || req.requestCode}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          {req.requestCode}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {req.requestStatus || "NEW"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{req.serviceName}</h3>
                      <p className="text-xs text-slate-500">Applicant: <span className="font-semibold text-slate-700">{req.customerName}</span></p>
                      {req.acknowledgementNumber && (
                        <p className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
                          Ack No: {req.acknowledgementNumber}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {formatDate(req.createdAt)}
                      </span>
                      <Link
                        to={`/track-order?code=${encodeURIComponent(req.requestCode)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                      >
                        <span>View Progress →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                  <Globe className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "कोई सक्रिय डिजिटल सेवा अनुरोध नहीं" : "No Digital Service Requests Found"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === "hi"
                      ? "पैन कार्ड, जाति/आय/निवास प्रमाण पत्र, परीक्षा फॉर्म और सरकारी योजनाओं का आवेदन करें।"
                      : "Apply for PAN cards, RTPS certificates, scholarship forms, and government schemes."}
                  </p>
                </div>
                <Link
                  to="/digital-services"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-all"
                >
                  <Globe className="h-4 w-4" />
                  <span>{currentLang === "hi" ? "सभी सेवाएँ देखें" : "Explore Services Catalog"}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Custom Quotes */}
        {activeTab === "quotes" && (
          <div className="space-y-4">
            {customerQuotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerQuotes.map((q) => (
                  <div
                    key={q.id || q.quoteCode}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          {q.quoteCode}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          {q.quoteStatus || "NEW"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{q.serviceOrProductType}</h3>
                      <p className="text-xs text-slate-500">Qty: <span className="font-semibold text-slate-700">{q.quantity}</span></p>
                      {q.quotedAmount !== undefined && (
                        <p className="text-xs font-bold text-emerald-700">
                          Quoted: ₹{q.quotedAmount}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {formatDate(q.createdAt)}
                      </span>
                      <Link
                        to={`/track-order?code=${encodeURIComponent(q.quoteCode)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                      >
                        <span>View Quote →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="h-16 w-16 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "कोई कोटेशन अनुरोध नहीं" : "No Custom Quote Requests"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === "hi"
                      ? "थोक प्रिंटिंग, विशेष साइज़ या कस्टमाइज़्ड डिज़ाइन के लिए फ्री कोटेशन प्राप्त करें।"
                      : "Get a customized quotation for bulk offset printing, custom dimensions, or graphic design."}
                  </p>
                </div>
                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-6 py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-all"
                >
                  <FileText className="h-4 w-4" />
                  <span>{currentLang === "hi" ? "कोटेशन का अनुरोध करें" : "Request a Quote"}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Profile Info */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-[#123B70]" />
                <span>{currentLang === "hi" ? "व्यक्तिगत व संपर्क जानकारी" : "Personal & Contact Details"}</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="text-sm font-bold text-slate-900">{userDisplayName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="text-sm font-bold text-slate-900">{user?.email || "Not linked"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <span className="text-sm font-bold text-slate-900">
                    {user?.phone ? `+91 ${user.phone}` : "Not linked"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Account Role</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block mt-0.5">
                    {user?.role || "CUSTOMER"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>{currentLang === "hi" ? "सुरक्षा एवं केंद्र संपर्क" : "Security & Center Support"}</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Key className="h-4 w-4 text-[#123B70]" />
                    <span>{currentLang === "hi" ? "पासवर्ड सुरक्षा" : "Password Management"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {currentLang === "hi"
                      ? "पासवर्ड बदलने के लिए रीसेट लिंक अपने ईमेल पर प्राप्त करें।"
                      : "Receive a secure recovery link at your email to update your account password."}
                  </p>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline pt-1"
                  >
                    <span>{currentLang === "hi" ? "पासवर्ड रीसेट लिंक भेजें →" : "Send Password Reset Link →"}</span>
                  </Link>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Building className="h-4 w-4 text-emerald-600" />
                    <span>{currentLang === "hi" ? "स्थानीय केंद्र का पता" : "Local CSC Center & Print Shop"}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {business.address.line1[currentLang]}, {business.address.landmark[currentLang]}, {business.address.city[currentLang]} (CSC ID: {business.registrations.cscId})
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href={`tel:${business.phones[0]}`}
                      className="font-bold text-[#123B70] hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{business.phones[0]}</span>
                    </a>
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>WhatsApp Support</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Invoice Preview Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoice={selectedInvoiceForModal}
        isAdmin={false}
      />
    </div>
  );
};

export default AccountPage;

