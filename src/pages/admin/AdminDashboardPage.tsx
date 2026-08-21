import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Clock, 
  Package, 
  PackageCheck, 
  IndianRupee, 
  Calendar,
  Settings,
  Tags,
  Globe,
  FileText,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { PalakDataStore } from '../../lib/storage/store';
import { PalakInvoiceStore } from '../../lib/invoice/invoiceStore';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminContentContainer } from '../../components/admin/AdminContentContainer';
import { useRealtimeOrders } from '../../hooks/useRealtimeOrders';
import { cn } from '../../lib/utils';

// ─── Data Types ─────────────────────────────────────────────────────────────

interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  inProduction: number;
  readyForPickup: number;
  totalRevenue: number;
  todaysOrders: number;
  pendingServiceRequests: number;
  pendingQuoteRequests: number;
}

interface RecentOrder {
  id: string;
  order_code: string;
  customer_name: string;
  service_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// ─── Error Classifier ───────────────────────────────────────────────────────

function classifyError(error: any): { isAuth: boolean; isNetwork: boolean; message: string } {
  if (!error) return { isAuth: false, isNetwork: false, message: 'Unknown error occurred.' };
  
  const rawMsg = (error.message || error.details || error.hint || String(error)).toLowerCase();
  const code = String(error.code || '');

  // 1. Auth / RLS / Token Expiration Error
  if (
    code === '42501' ||
    rawMsg.includes('permission denied') ||
    rawMsg.includes('row-level security') ||
    rawMsg.includes('jwt') ||
    rawMsg.includes('token')
  ) {
    return {
      isAuth: true,
      isNetwork: false,
      message: 'Access Restricted: Your staff session may have expired or lacks database permissions.',
    };
  }

  // 2. Network / Offline Error
  if (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    error instanceof TypeError ||
    rawMsg.includes('failed to fetch') ||
    rawMsg.includes('networkerror') ||
    rawMsg.includes('network request failed') ||
    rawMsg.includes('fetch')
  ) {
    return {
      isAuth: false,
      isNetwork: true,
      message: 'Network connectivity issue. Unable to communicate with the cloud database.',
    };
  }

  // 3. Database / Schema Error
  return {
    isAuth: false,
    isNetwork: false,
    message: 'Unable to retrieve live dashboard metrics. Please refresh and try again.',
  };
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    newOrders: 0,
    inProduction: 0,
    readyForPickup: 0,
    totalRevenue: 0,
    todaysOrders: 0,
    pendingServiceRequests: 0,
    pendingQuoteRequests: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      setIsOfflineFallback(false);

      // Start & End of day in local timezone (IST / user's local day boundaries)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayIso = startOfToday.toISOString();

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayIso = endOfToday.toISOString();

      if (isSupabaseConfigured && supabase) {
        // Query database with high-performance HEAD count requests in parallel
        const [
          allOrdersCountRes,
          newOrdersCountRes,
          inProdCountRes,
          readyCountRes,
          revenueRes,
          todaysOrdersRes,
          serviceReqRes,
          quoteReqRes,
          recentOrdersRes,
        ] = await Promise.all([
          // 1. Total orders count (HEAD only - zero body transfer)
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          // 2. New & Under Review orders count (HEAD only)
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('order_status', ['NEW', 'UNDER_REVIEW']),
          // 3. In Production orders count (HEAD only)
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('order_status', ['IN_PRODUCTION', 'DESIGN_REVIEW', 'APPROVED', 'PROCESSING']),
          // 4. Ready for pickup orders count (HEAD only)
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('order_status', ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']),
          // 5. Paid orders for revenue calculation
          supabase
            .from('orders')
            .select('total_amount')
            .in('payment_status', ['paid', 'PAID', 'confirmed'])
            .neq('order_status', 'CANCELLED'),
          // 6. Today's orders count (HEAD only)
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfTodayIso)
            .lte('created_at', endOfTodayIso),
          // 7. Pending service requests (HEAD only)
          supabase
            .from('service_requests')
            .select('id', { count: 'exact', head: true })
            .in('request_status', ['NEW', 'DOCUMENTS_VERIFIED', 'IN_PROCESSING', 'ACTION_REQUIRED', 'SUBMITTED_TO_PORTAL']),
          // 8. Pending quote requests (HEAD only)
          supabase
            .from('quote_requests')
            .select('id', { count: 'exact', head: true })
            .in('quote_status', ['NEW', 'ESTIMATE_PREPARED', 'QUOTE_SENT']),
          // 9. Recent orders (6 rows max)
          supabase
            .from('orders')
            .select('id, order_code, customer_name, customer_phone, total_amount, order_status, created_at, items')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        // Evaluate error
        if (allOrdersCountRes.error) {
          const classified = classifyError(allOrdersCountRes.error);
          if (classified.isNetwork && typeof navigator !== 'undefined' && !navigator.onLine) {
            const localOrders = PalakDataStore.getOrders();
            if (localOrders.length > 0) {
              const localServiceRequests = PalakDataStore.getServiceRequests();
              const localQuoteRequests = PalakDataStore.getQuoteRequests();
              const todayTimestamp = startOfToday.getTime();
              const endTimestamp = endOfToday.getTime();

              const todaysOrdersCount = localOrders.filter((o) => {
                const time = new Date(o.createdAt).getTime();
                return time >= todayTimestamp && time <= endTimestamp;
              }).length;

              const totalRevenue = localOrders
                .filter((o) => (o.paymentStatus === 'paid' || o.paymentStatus === 'confirmed') && o.orderStatus !== 'CANCELLED')
                .reduce((sum, o) => sum + Math.max(0, Number(o.totalAmount) || 0), 0);

              setStats({
                totalOrders: localOrders.length,
                newOrders: localOrders.filter((o) => o.orderStatus === 'NEW' || o.orderStatus === 'UNDER_REVIEW').length,
                inProduction: localOrders.filter((o) => o.orderStatus === 'IN_PRODUCTION' || o.orderStatus === 'DESIGN_REVIEW' || o.orderStatus === 'PROCESSING').length,
                readyForPickup: localOrders.filter((o) => o.orderStatus === 'READY_FOR_PICKUP' || o.orderStatus === 'OUT_FOR_DELIVERY').length,
                totalRevenue,
                todaysOrders: todaysOrdersCount,
                pendingServiceRequests: localServiceRequests.filter((s) => s.requestStatus !== 'COMPLETED' && s.requestStatus !== 'REJECTED').length,
                pendingQuoteRequests: localQuoteRequests.filter((q) => q.quoteStatus === 'NEW' || q.quoteStatus === 'ESTIMATE_PREPARED' || q.quoteStatus === 'QUOTE_SENT').length,
              });

              const formattedLocalOrders: RecentOrder[] = localOrders.slice(0, 6).map((order) => {
                const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                let serviceName = firstItem ? firstItem.productName : "Print Order";
                if (order.items && order.items.length > 1) {
                  serviceName += ` + ${order.items.length - 1} more`;
                }

                return {
                  id: order.id,
                  order_code: order.orderCode,
                  customer_name: order.customerName || 'Guest Customer',
                  service_name: serviceName,
                  total_amount: Math.max(0, Number(order.totalAmount) || 0),
                  status: order.orderStatus,
                  created_at: order.createdAt,
                };
              });

              setRecentOrders(formattedLocalOrders);
              setIsOfflineFallback(true);
              return;
            }
          }

          setError(classified.message);
          return;
        }

        // ── Authoritative successful orders result ──────────────────────────
        const totalOrdersCount = allOrdersCountRes.count ?? 0;
        const newOrdersCount = newOrdersCountRes.count ?? 0;
        const inProductionCount = inProdCountRes.count ?? 0;
        const readyForPickupCount = readyCountRes.count ?? 0;

        // If database contains 0 orders, sync local caches and zero out order-derived stats
        if (totalOrdersCount === 0) {
          PalakDataStore.syncOrdersFromCloud([]);
          PalakInvoiceStore.pruneOrphanedInvoices(new Set());
        }

        const revenue = totalOrdersCount === 0
          ? 0
          : (revenueRes.data || []).reduce((sum, order) => {
              const amt = Number(order.total_amount);
              return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
            }, 0);

        const todaysCount = totalOrdersCount === 0 ? 0 : (todaysOrdersRes.count ?? 0);

        setStats({
          totalOrders: totalOrdersCount,
          newOrders: newOrdersCount,
          inProduction: inProductionCount,
          readyForPickup: readyForPickupCount,
          totalRevenue: revenue,
          todaysOrders: todaysCount,
          pendingServiceRequests: (!serviceReqRes.error && serviceReqRes.count !== null && serviceReqRes.count !== undefined) ? serviceReqRes.count : 0,
          pendingQuoteRequests: (!quoteReqRes.error && quoteReqRes.count !== null && quoteReqRes.count !== undefined) ? quoteReqRes.count : 0,
        });

        // Format recent orders safely
        if (totalOrdersCount > 0 && recentOrdersRes.data && !recentOrdersRes.error) {
          const formattedOrders: RecentOrder[] = recentOrdersRes.data.map((order: any) => {
            let serviceName = "Print Order";
            try {
              let itemsArr: any[] = [];
              if (Array.isArray(order.items)) {
                itemsArr = order.items;
              } else if (typeof order.items === 'string') {
                itemsArr = JSON.parse(order.items);
              }
              if (Array.isArray(itemsArr) && itemsArr.length > 0) {
                serviceName = itemsArr[0]?.productName || itemsArr[0]?.product_name || "Print Service";
                if (itemsArr.length > 1) {
                  serviceName += ` + ${itemsArr.length - 1} more`;
                }
              }
            } catch {}

            return {
              id: String(order.id || Math.random()),
              order_code: order.order_code || 'ORD-NEW',
              customer_name: order.customer_name || (order.customer_phone ? `Customer (${order.customer_phone})` : 'Guest Customer'),
              service_name: serviceName,
              total_amount: Math.max(0, Number(order.total_amount) || 0),
              status: order.order_status || 'NEW',
              created_at: order.created_at || new Date().toISOString(),
            };
          });
          setRecentOrders(formattedOrders);
        } else {
          setRecentOrders([]);
        }
      } else {
        // Unconfigured Supabase environment (e.g. initial demo/local dev)
        const localOrders = PalakDataStore.getOrders();
        const localServiceRequests = PalakDataStore.getServiceRequests();
        const localQuoteRequests = PalakDataStore.getQuoteRequests();

        const todayTimestamp = startOfToday.getTime();
        const endTimestamp = endOfToday.getTime();
        const todaysOrdersCount = localOrders.filter((o) => {
          const time = new Date(o.createdAt).getTime();
          return time >= todayTimestamp && time <= endTimestamp;
        }).length;

        const totalRevenue = localOrders
          .filter((o) => (o.paymentStatus === 'paid' || o.paymentStatus === 'confirmed') && o.orderStatus !== 'CANCELLED')
          .reduce((sum, o) => sum + Math.max(0, Number(o.totalAmount) || 0), 0);

        setStats({
          totalOrders: localOrders.length,
          newOrders: localOrders.filter((o) => o.orderStatus === 'NEW' || o.orderStatus === 'UNDER_REVIEW').length,
          inProduction: localOrders.filter((o) => o.orderStatus === 'IN_PRODUCTION' || o.orderStatus === 'DESIGN_REVIEW' || o.orderStatus === 'PROCESSING').length,
          readyForPickup: localOrders.filter((o) => o.orderStatus === 'READY_FOR_PICKUP' || o.orderStatus === 'OUT_FOR_DELIVERY').length,
          totalRevenue,
          todaysOrders: todaysOrdersCount,
          pendingServiceRequests: localServiceRequests.filter((s) => s.requestStatus !== 'COMPLETED' && s.requestStatus !== 'REJECTED').length,
          pendingQuoteRequests: localQuoteRequests.filter((q) => q.quoteStatus === 'NEW' || q.quoteStatus === 'ESTIMATE_PREPARED' || q.quoteStatus === 'QUOTE_SENT').length,
        });

        const formattedLocalOrders: RecentOrder[] = localOrders.slice(0, 6).map((order) => {
          const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
          let serviceName = firstItem ? firstItem.productName : "Print Order";
          if (order.items && order.items.length > 1) {
            serviceName += ` + ${order.items.length - 1} more`;
          }

          return {
            id: order.id,
            order_code: order.orderCode,
            customer_name: order.customerName || 'Guest Customer',
            service_name: serviceName,
            total_amount: Math.max(0, Number(order.totalAmount) || 0),
            status: order.orderStatus,
            created_at: order.createdAt,
          };
        });

        setRecentOrders(formattedLocalOrders);
      }
    } catch (err: any) {
      console.error('Error in dashboard data fetcher:', err);
      const classified = classifyError(err);
      setError(classified.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Optimistically and reliably handle real-time orders on dashboard
  useRealtimeOrders({
    onNewOrder: (newOrder) => {
      // Immediate optimistic update for fast visual response
      setStats((prev) => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
        newOrders: (newOrder.orderStatus === 'NEW' || newOrder.orderStatus === 'UNDER_REVIEW') ? prev.newOrders + 1 : prev.newOrders,
        todaysOrders: prev.todaysOrders + 1,
        totalRevenue: (newOrder.paymentStatus === 'paid' || newOrder.paymentStatus === 'confirmed')
          ? prev.totalRevenue + (Number(newOrder.totalAmount) || 0)
          : prev.totalRevenue,
      }));

      // Update recent orders list
      setRecentOrders((prev) => {
        const firstItem = newOrder.items && newOrder.items.length > 0 ? newOrder.items[0] : null;
        let serviceName = firstItem ? firstItem.productName : "Print Order";
        if (newOrder.items && newOrder.items.length > 1) {
          serviceName += ` + ${newOrder.items.length - 1} more`;
        }

        const newRecent: RecentOrder = {
          id: newOrder.id,
          order_code: newOrder.orderCode,
          customer_name: newOrder.customerName || "Customer",
          service_name: serviceName,
          total_amount: Math.max(0, Number(newOrder.totalAmount) || 0),
          status: newOrder.orderStatus,
          created_at: newOrder.createdAt,
        };

        const filtered = prev.filter((o) => o.order_code !== newOrder.orderCode && o.id !== newOrder.id);
        return [newRecent, ...filtered].slice(0, 6);
      });

      // Background reconciliation
      fetchDashboardData();
    },
    onOrderUpdated: () => {
      fetchDashboardData();
    },
    onOrderDeleted: (payload) => {
      const code = payload.orderCode;
      const id = payload.id;
      setRecentOrders((prev) => prev.filter((o) => {
        if (id && o.id === id) return false;
        if (code && o.order_code === code) return false;
        return true;
      }));
      fetchDashboardData();
    },
  });

  useEffect(() => {
    fetchDashboardData();

    // 1. Listen for admin refresh events from top bar + realtime reconnect
    const handleAdminRefresh = () => {
      setRefreshing(true);
      fetchDashboardData();
    };
    const handleRealtimeReconnect = () => {
      console.debug("[Dashboard] Realtime reconnected — syncing dashboard...");
      fetchDashboardData();
    };
    window.addEventListener('admin-refresh', handleAdminRefresh);
    window.addEventListener('palak:realtime-reconnected', handleRealtimeReconnect);

    // 2. Supabase Realtime stream for service requests & quote requests
    let channel: any = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const setupRealtime = () => {
        if (!isActive) return;

        channel = client
          .channel('admin-dashboard-requests-stream')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'service_requests' },
            () => {
              fetchDashboardData();
            }
          )
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'quote_requests' },
            () => {
              fetchDashboardData();
            }
          )
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (reconnectTimer) clearTimeout(reconnectTimer);
              reconnectTimer = setTimeout(() => {
                if (channel) client.removeChannel(channel);
                setupRealtime();
              }, 4000);
            }
          });
      };

      setupRealtime();
    }

    return () => {
      isActive = false;
      window.removeEventListener('admin-refresh', handleAdminRefresh);
      window.removeEventListener('palak:realtime-reconnected', handleRealtimeReconnect);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number) => {
    const safeAmount = Math.max(0, isNaN(amount) ? 0 : amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: safeAmount % 1 === 0 ? 0 : 2,
    }).format(safeAmount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  // Structured KPI card definitions
  const dashboardMetrics = [
    {
      key: 'totalOrders',
      label: 'Total Orders',
      value: stats.totalOrders.toLocaleString('en-IN'),
      icon: ShoppingBag,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      borderColor: 'hover:border-blue-300',
      valueColor: 'text-slate-900',
      href: '/admin/orders',
    },
    {
      key: 'newOrders',
      label: 'New Orders',
      value: stats.newOrders.toLocaleString('en-IN'),
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      borderColor: 'hover:border-amber-300',
      valueColor: 'text-amber-600',
      badge: stats.newOrders > 0 ? 'Needs Action' : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
      href: '/admin/orders?status=NEW',
    },
    {
      key: 'production',
      label: 'In Production',
      value: stats.inProduction.toLocaleString('en-IN'),
      icon: Package,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      borderColor: 'hover:border-indigo-300',
      valueColor: 'text-indigo-600',
      href: '/admin/orders?status=IN_PRODUCTION',
    },
    {
      key: 'ready',
      label: 'Ready for Pickup',
      value: stats.readyForPickup.toLocaleString('en-IN'),
      icon: PackageCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      borderColor: 'hover:border-emerald-300',
      valueColor: 'text-emerald-600',
      href: '/admin/orders?status=READY_FOR_PICKUP',
    },
    {
      key: 'revenue',
      label: 'Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: IndianRupee,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      borderColor: 'hover:border-emerald-300',
      valueColor: 'text-emerald-700',
      href: '/admin/payments',
    },
    {
      key: 'todayOrders',
      label: "Today's Orders",
      value: stats.todaysOrders.toLocaleString('en-IN'),
      icon: Calendar,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      borderColor: 'hover:border-blue-300',
      valueColor: 'text-blue-600',
      href: '/admin/orders',
    },
  ];

  // Structured Quick Action shortcuts
  const quickActions = [
    {
      title: 'View Orders',
      subtitle: 'Manage production & dispatch',
      icon: ShoppingBag,
      href: '/admin/orders',
      primary: true,
    },
    {
      title: 'Manage Services',
      subtitle: 'Catalog products & active items',
      icon: Settings,
      href: '/admin/website/services',
      primary: false,
    },
    {
      title: 'Update Pricing',
      subtitle: 'Print rates & tier multipliers',
      icon: Tags,
      href: '/admin/website/pricing',
      primary: false,
    },
    {
      title: 'Website Config',
      subtitle: 'Content, media & banners',
      icon: Globe,
      href: '/admin/website',
      primary: false,
    },
  ];

  if (loading) {
    return (
      <AdminContentContainer>
        <AdminPageHeader 
          title="Dashboard" 
          subtitle="Overview of your business operations" 
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse shadow-xs border border-slate-200/80"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-18 bg-white rounded-xl animate-pulse shadow-xs border border-slate-200/80"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          <div className="lg:col-span-2 h-72 bg-white rounded-xl animate-pulse shadow-xs border border-slate-200/80"></div>
          <div className="h-72 bg-white rounded-xl animate-pulse shadow-xs border border-slate-200/80"></div>
        </div>
      </AdminContentContainer>
    );
  }

  return (
    <AdminContentContainer>
      {/* 1. Dashboard Header */}
      <AdminPageHeader 
        title="Dashboard" 
        subtitle="Overview of your business operations"
        actions={
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin text-amber-500")} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Offline Notice Banner (only when connection failed and cached data is shown) */}
      {isOfflineFallback && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs font-medium">Viewing cached local data due to temporary network unavailability.</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            className="text-xs font-bold underline hover:no-underline text-amber-900 cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* 3. Error Notice (Auth, RLS, Database or unrecoverable network failure) */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg hover:bg-rose-200 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Responsive 6-Card KPI Grid (25% more compact) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
        {dashboardMetrics.map((kpi) => (
          <Link
            key={kpi.key}
            to={kpi.href}
            className={cn(
              "bg-white rounded-xl p-3 shadow-xs border border-slate-200/80 transition-all duration-200 flex flex-col justify-between group",
              kpi.borderColor,
              "hover:shadow-sm hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className={cn("p-1.5 rounded-lg transition-colors", kpi.iconBg)}>
                <kpi.icon className={cn("w-3.5 h-3.5", kpi.iconColor)} />
              </div>
              {kpi.badge && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-full", kpi.badgeColor)}>
                  {kpi.badge}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[11px] font-medium text-slate-500 truncate mb-0.5">{kpi.label}</h3>
              <p className={cn("text-lg sm:text-xl font-bold tracking-tight", kpi.valueColor)}>
                {kpi.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 5. Quick Action Cards (4 Columns - 25% more compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className={cn(
              "rounded-xl p-3.5 transition-all duration-200 flex items-center justify-between group shadow-xs border",
              action.primary
                ? "bg-[#123B70] text-white border-[#123B70] hover:bg-[#0c274c] hover:border-[#0c274c]"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "p-2 rounded-lg transition-colors shrink-0",
                action.primary ? "bg-white/10 text-amber-400" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
              )}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs block truncate">{action.title}</span>
                <span className={cn(
                  "text-[10px] block truncate mt-0.2",
                  action.primary ? "text-blue-200" : "text-slate-400"
                )}>
                  {action.subtitle}
                </span>
              </div>
            </div>
            <ArrowRight className={cn(
              "w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
              action.primary ? "text-white/60 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
            )} />
          </Link>
        ))}
      </div>

      {/* 6. Lower Content Grid: Recent Orders (2fr) + Requests Summary (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full items-start">
        {/* Recent Orders Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-blue-50 text-[#123B70] flex items-center justify-center font-bold text-xs">
                <Package className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-bold text-[#123B70]">Recent Orders</h2>
            </div>
            <Link 
              to="/admin/orders" 
              className="text-[11px] font-bold text-[#123B70] hover:text-amber-600 transition-colors inline-flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs admin-table">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2 text-[11px] font-semibold">Order Code</th>
                    <th className="px-3.5 py-2 text-[11px] font-semibold">Customer</th>
                    <th className="px-3.5 py-2 text-[11px] font-semibold">Service</th>
                    <th className="px-3.5 py-2 text-[11px] font-semibold">Amount</th>
                    <th className="px-3.5 py-2 text-[11px] font-semibold">Status</th>
                    <th className="px-3.5 py-2 text-[11px] font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/orders?selected=${order.order_code}`)}
                    >
                      <td className="px-3.5 py-2 font-bold text-[#123B70]">{order.order_code}</td>
                      <td className="px-3.5 py-2 text-slate-700 font-medium">{order.customer_name}</td>
                      <td className="px-3.5 py-2 text-slate-600 truncate max-w-[160px]">{order.service_name}</td>
                      <td className="px-3.5 py-2 font-bold text-slate-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-3.5 py-2">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-3.5 py-2 text-slate-400 text-[10px] text-right whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">No recent orders found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">New incoming customer orders will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Requests & Inquiries Summary */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 flex flex-col">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#123B70]">Inquiries & Requests</h2>
            <span className="text-[10px] font-semibold text-slate-400">Live Counters</span>
          </div>
          
          <div className="p-3.5 flex flex-col gap-3">
            {/* Service Requests */}
            <Link 
              to="/admin/services-requests" 
              className="bg-gradient-to-br from-amber-50 to-amber-50/40 rounded-xl p-3.5 border border-amber-200/80 hover:border-amber-300 transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-xs"
            >
              <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="w-12 h-12 text-amber-600" />
              </div>
              <p className="text-amber-900 text-[11px] font-bold mb-0.5">Citizen & Digital Requests</p>
              <p className="text-[10px] text-amber-700/80 mb-2">PAN, CSC, Certificates & Forms</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700">{stats.pendingServiceRequests}</span>
                <span className="text-amber-800/80 text-[11px] font-semibold">pending requests</span>
              </div>
            </Link>

            {/* Quote Inquiries */}
            <Link 
              to="/admin/quotes" 
              className="bg-gradient-to-br from-indigo-50 to-indigo-50/40 rounded-xl p-3.5 border border-indigo-200/80 hover:border-indigo-300 transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-xs"
            >
              <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageSquare className="w-12 h-12 text-indigo-600" />
              </div>
              <p className="text-indigo-900 text-[11px] font-bold mb-0.5">Custom Quote Inquiries</p>
              <p className="text-[10px] text-indigo-700/80 mb-2">Bulk printing, wedding & custom jobs</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-700">{stats.pendingQuoteRequests}</span>
                <span className="text-indigo-800/80 text-[11px] font-semibold">pending quotes</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminContentContainer>
  );
};

export default AdminDashboardPage;
