import { useState, useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { ToastProvider } from "./AdminToast";
import { supabase, isSupabaseConfigured } from "../../lib/supabase/client";
import { useRealtimeOrders } from "../../hooks/useRealtimeOrders";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

export const AdminLayout: React.FC = () => {
  const { isStaff, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const location = useLocation();
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Fetch new orders count for sidebar badge with batching/debounce
  const fetchNewOrdersCount = useCallback((immediate: boolean = false) => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    if (badgeTimerRef.current) {
      clearTimeout(badgeTimerRef.current);
    }

    const execute = async () => {
      try {
        const { count } = await client
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("order_status", ["NEW", "UNDER_REVIEW"]);
        setNewOrdersCount(count || 0);
      } catch {}
    };

    if (immediate) {
      execute();
    } else {
      badgeTimerRef.current = setTimeout(execute, 200);
    }
  }, []);

  useEffect(() => {
    if (isStaff) {
      fetchNewOrdersCount(true);
    }
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, [isStaff, fetchNewOrdersCount]);

  // Listen to realtime orders for sidebar badge count
  useRealtimeOrders({
    onNewOrder: (order) => {
      if (order.orderStatus === "NEW" || order.orderStatus === "UNDER_REVIEW") {
        setNewOrdersCount((prev) => prev + 1);
      }
      fetchNewOrdersCount(false);
    },
    onOrderUpdated: () => {
      fetchNewOrdersCount(false);
    },
    onOrderDeleted: () => {
      fetchNewOrdersCount(false);
    },
  });

  // Re-sync sidebar badge on realtime reconnect
  useEffect(() => {
    const handleReconnect = () => {
      console.debug("[AdminLayout] Realtime reconnected — syncing badge count...");
      fetchNewOrdersCount();
    };
    window.addEventListener("palak:realtime-reconnected", handleReconnect);
    return () => {
      window.removeEventListener("palak:realtime-reconnected", handleReconnect);
    };
  }, [fetchNewOrdersCount]);

  const handleRefresh = useCallback(async () => {
    setDataLoading(true);
    await fetchNewOrdersCount();
    // Trigger a page-level refresh by dispatching a custom event
    window.dispatchEvent(new CustomEvent("admin-refresh"));
    setTimeout(() => setDataLoading(false), 500);
  }, [fetchNewOrdersCount]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading Admin Panel...</span>
        </div>
      </div>
    );
  }

  // Auth guard: Redirect non-staff users
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 max-w-md text-center space-y-4 shadow-lg">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Staff Login Required</h2>
          <p className="text-xs text-slate-500">
            You must log in with authorized staff credentials to access the Palak Enterprises Admin Control Center.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-[#123B70] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] w-full"
          >
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
        {/* Top Header */}
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onRefresh={handleRefresh}
          loading={dataLoading}
        />

        <div className="flex flex-1 relative w-full min-h-[calc(100vh-2.75rem)]">
          {/* Sidebar: 230px desktop fixed width */}
          <AdminSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            newOrdersCount={newOrdersCount}
          />

          {/* Main Content Area: starts immediately next to sidebar with consistent padding */}
          <div className="flex-1 min-w-0 w-full overflow-x-hidden">
            <main className="w-full px-3 sm:px-5 lg:px-6 py-4 lg:py-5 box-border">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};
