import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  LogOut,
  RefreshCw,
  Menu,
  ChevronDown,
  User,
  Shield,
  ShieldCheck,
  ExternalLink,
  Clock,
  Package,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase/client";
import { cn } from "../../lib/utils";
import { notificationSound } from "../../lib/audio/notificationSound";
import { extractServiceNameFromItems } from "../../lib/realtime/adminOrderEvents";
import { useRealtimeOrders } from "../../hooks/useRealtimeOrders";
import type { StoredOrder } from "../../lib/storage/store";

// ─── Notification Types ───────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
  isRead: boolean;
  type?: 'order' | 'service' | 'quote' | 'design' | 'payment';
}

function getNotificationDestination(notif: AdminNotification): string {
  const code = (notif.orderCode || '').toUpperCase().trim();
  if (notif.type === 'service' || code.startsWith('SRV-') || code.startsWith('SVC-')) {
    return `/admin/services-requests?selected=${encodeURIComponent(notif.orderCode)}`;
  }
  if (notif.type === 'quote' || code.startsWith('QT-') || code.startsWith('QUO-')) {
    return `/admin/quotes?selected=${encodeURIComponent(notif.orderCode)}`;
  }
  if (notif.type === 'design' || code.startsWith('DSG-')) {
    return `/admin/designs?selected=${encodeURIComponent(notif.orderCode)}`;
  }
  if (notif.type === 'payment' || code.startsWith('PAY-') || code.startsWith('INV-')) {
    return `/admin/payments?selected=${encodeURIComponent(notif.orderCode)}`;
  }
  // Default to Admin Order Management with selected order parameter
  return `/admin/orders?selected=${encodeURIComponent(notif.orderCode || notif.id)}`;
}

const SEEN_ORDERS_KEY = "palak_admin_seen_orders";
const NOTIF_STATE_KEY = "palak_admin_notifications_v2";

function getSeenOrders(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ORDERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenOrders(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify([...seen]));
  } catch {}
}

function getStoredNotifications(): AdminNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_STATE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifs: AdminNotification[]) {
  try {
    // Keep last 50 notifications
    localStorage.setItem(NOTIF_STATE_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch {}
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── NotificationBell Component ───────────────────────────────────────────────

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>(getStoredNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const seenRef = useRef(getSeenOrders());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const ringTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load initial NEW orders as notifications
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadInitial = async () => {
      try {
        const { data, error } = await client
          .from("orders")
          .select("id, order_code, customer_name, customer_phone, items, order_status, total_amount, created_at")
          .in("order_status", ["NEW", "UNDER_REVIEW"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          if (data.length === 0) {
            // Authoritative ZERO new orders in database: clear all order notifications
            setNotifications([]);
            saveNotifications([]);
          } else {
            const validCodes = new Set(data.map((o: any) => o.order_code));
            const existing = getStoredNotifications().filter((n) => !n.orderCode || validCodes.has(n.orderCode));
            const existingCodes = new Set(existing.map((n) => n.orderCode));

            const newNotifs: AdminNotification[] = data
              .filter((o: any) => !existingCodes.has(o.order_code))
              .map((o: any) => ({
                id: o.id,
                orderCode: o.order_code,
                customerName: o.customer_name,
                customerPhone: o.customer_phone,
                serviceName: extractServiceName(o.items),
                orderStatus: o.order_status,
                totalAmount: Number(o.total_amount) || 0,
                createdAt: o.created_at,
                isRead: seenRef.current.has(o.order_code),
                type: 'order',
              }));

            const merged = [...newNotifs, ...existing].slice(0, 50);
            setNotifications(merged);
            saveNotifications(merged);
          }
        }
      } catch (err) {
        console.warn("[NotificationBell] Initial load notice:", err);
      }
    };

    loadInitial();
  }, []);

  // Process an incoming new order notification
  const handleIncomingNewOrder = useCallback((orderData: StoredOrder) => {
    if (!orderData || !orderData.orderCode) return;
    const code = orderData.orderCode.trim().toUpperCase();

    const notif: AdminNotification = {
      id: orderData.id || crypto.randomUUID(),
      orderCode: orderData.orderCode,
      customerName: orderData.customerName || "Customer",
      customerPhone: orderData.customerPhone || "",
      serviceName: extractServiceNameFromItems(orderData.items),
      orderStatus: orderData.orderStatus || "NEW",
      totalAmount: Number(orderData.totalAmount) || 0,
      createdAt: orderData.createdAt || new Date().toISOString(),
      isRead: seenRef.current.has(code),
      type: 'order',
    };

    setNotifications((prev) => {
      const exists = prev.some((n) => (n.orderCode || '').trim().toUpperCase() === code);
      if (exists) {
        return prev.map((n) => (n.orderCode || '').trim().toUpperCase() === code ? { ...n, ...notif, isRead: n.isRead } : n);
      }
      const updated = [notif, ...prev].slice(0, 50);
      saveNotifications(updated);
      return updated;
    });

    if (!seenRef.current.has(code)) {
      notificationSound.playNewOrderChime(code);
      setRinging(true);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => setRinging(false), 2500);
    }
  }, []);

  // Process order update notification
  const handleIncomingOrderUpdate = useCallback((orderData: StoredOrder) => {
    if (!orderData || !orderData.orderCode) return;
    setNotifications((prev) => {
      const updated: AdminNotification[] = prev.map((n) => {
        if (n.orderCode === orderData.orderCode) {
          return {
            ...n,
            orderStatus: orderData.orderStatus || n.orderStatus,
            totalAmount: orderData.totalAmount !== undefined ? Number(orderData.totalAmount) : n.totalAmount,
            type: n.type || 'order',
          };
        }
        return n;
      });
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const handleIncomingOrderDelete = useCallback((payload: { orderCode?: string; id?: string }) => {
    const { orderCode, id } = payload;
    setNotifications((prev) => {
      const updated = prev.filter((n) => {
        if (!orderCode && !id) return false;
        if (id && n.id === id) return false;
        if (orderCode && n.orderCode === orderCode) return false;
        return true;
      });
      saveNotifications(updated);
      return updated;
    });
  }, []);

  useRealtimeOrders({
    onNewOrder: handleIncomingNewOrder,
    onOrderUpdated: handleIncomingOrderUpdate,
    onOrderDeleted: handleIncomingOrderDelete,
  });

  const markAsRead = useCallback((orderCode: string) => {
    seenRef.current.add(orderCode);
    saveSeenOrders(seenRef.current);

    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.orderCode === orderCode ? { ...n, isRead: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => {
        seenRef.current.add(n.orderCode);
        return { ...n, isRead: true };
      });
      saveSeenOrders(seenRef.current);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-1.5 rounded-lg transition-all cursor-pointer",
          "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
          ringing && "animate-notification-ring"
        )}
        title="Notifications"
      >
        <Bell className={cn("h-4 w-4", ringing && "text-amber-400")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center ring-2 ring-[#0F172A] animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-1.5 w-[320px] sm:w-[350px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
              <p className="text-[10px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-semibold text-[#123B70] hover:underline cursor-pointer px-1.5 py-0.5"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400 font-medium">No notifications yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">New orders will appear here</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.orderCode}
                  to={getNotificationDestination(notif)}
                  onClick={() => {
                    markAsRead(notif.orderCode);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 transition-colors",
                    !notif.isRead && "bg-blue-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                      !notif.isRead
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-slate-900 truncate">
                        New Order
                      </span>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-[#123B70]">
                      {notif.orderCode}
                    </p>
                    <p className="text-[10px] text-slate-600 truncate">
                      {notif.customerName}
                      {notif.customerPhone ? ` • ${notif.customerPhone}` : ""}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                        {notif.serviceName}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700">
                        ₹{notif.totalAmount.toLocaleString("en-IN")}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1 py-0.2 rounded-full",
                          notif.orderStatus === "NEW"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {notif.orderStatus}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <div className="mt-0.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 p-1.5">
              <Link
                to="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[11px] font-bold text-[#123B70] hover:bg-slate-50 transition-colors"
              >
                View All Orders
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Ringing animation styles */}
      <style>{`
        @keyframes notification-ring {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-12deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-8deg); }
          50% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(2deg); }
          80% { transform: rotate(-1deg); }
          90% { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-notification-ring {
          animation: notification-ring 0.8s ease-in-out 3;
        }
      `}</style>
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractServiceName(items: any): string {
  if (!items) return "Print Order";
  try {
    const arr = Array.isArray(items) ? items : JSON.parse(items);
    if (arr.length > 0) {
      return arr[0].productName || arr[0].product_name || "Print Order";
    }
  } catch {}
  return "Print Order";
}

// ─── AdminHeader Component ────────────────────────────────────────────────────

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleSidebar,
  onRefresh,
  loading,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const roleBadge = (() => {
    const role = (user?.role || "STAFF").toUpperCase();
    if (role === "ADMIN") return { label: "Admin", icon: ShieldCheck, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    if (role === "MANAGER") return { label: "Manager", icon: Shield, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
    return { label: "Staff", icon: User, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  })();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="flex items-center justify-between px-3 sm:px-5 h-11">
        {/* Left: Hamburger + Branding */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              PE
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xs text-white tracking-wide block leading-tight">
                Palak Enterprises
              </span>
              <span className="text-[9px] text-slate-400 leading-tight">
                Admin Control Center
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Role badge + ERP Dashboard + Notifications + Profile */}
        <div className="flex items-center gap-1.5">
          {/* Role Badge */}
          <div className={cn(
            "hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold",
            roleBadge.color
          )}>
            <roleBadge.icon className="h-2.5 w-2.5" />
            <span>{roleBadge.label}</span>
          </div>

          {/* Quick ERP Dashboard Link button */}
          <Link
            to="/admin"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            title="Go to main ERP Operations Dashboard"
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-amber-400" />
            <span>ERP Dashboard</span>
          </Link>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-amber-400")} />
            </button>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="h-6 w-6 rounded-md bg-[#123B70] text-white flex items-center justify-center text-[10px] font-bold">
                {(user?.name || "A").charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-[11px] font-semibold text-slate-200 max-w-[100px] truncate">
                {user?.name || "Admin"}
              </span>
              <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden text-slate-900">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Admin"}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
                  <div className={cn(
                    "mt-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md border text-[9px] font-bold",
                    isAdmin
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  )}>
                    <roleBadge.icon className="h-2.5 w-2.5" />
                    {(user?.role || "STAFF").toUpperCase()}
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-amber-800 bg-amber-50/60 font-semibold hover:bg-amber-100/70"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LayoutDashboard className="h-3 w-3 text-amber-600" />
                    ERP Dashboard
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User className="h-3 w-3 text-slate-400" />
                    Admin Settings
                  </Link>
                  <Link
                    to="/"
                    target="_blank"
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                    Preview Website
                  </Link>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 w-full text-left cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
