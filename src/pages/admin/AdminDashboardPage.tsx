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
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { AdminContentContainer } from '../../components/admin/AdminContentContainer';
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
        // Query database with authoritative schema columns
        const [
          ordersRes,
          revenueRes,
          todaysOrdersRes,
          serviceReqRes,
          quoteReqRes,
          recentOrdersRes,
        ] = await Promise.all([
          // 1. All orders with their order_status
          supabase.from('orders').select('order_status', { count: 'exact' }),
          // 2. Paid orders (excluding cancelled)
          supabase
            .from('orders')
            .select('total_amount')
            .in('payment_status', ['paid', 'PAID', 'confirmed'])
            .neq('order_status', 'CANCELLED'),
          // 3. Today's orders count
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfTodayIso)
            .lte('created_at', endOfTodayIso),
          // 4. Pending service requests
          supabase
            .from('service_requests')
            .select('id', { count: 'exact', head: true })
            .in('request_status', ['NEW', 'DOCUMENTS_VERIFIED', 'IN_PROCESSING', 'ACTION_REQUIRED', 'SUBMITTED_TO_PORTAL']),
          // 5. Pending quote requests
          supabase
            .from('quote_requests')
            .select('id', { count: 'exact', head: true })
            .in('quote_status', ['NEW', 'ESTIMATE_PREPARED', 'QUOTE_SENT']),
          // 6. Recent orders
          supabase
            .from('orders')
            .select('id, order_code, customer_name, customer_phone, total_amount, order_status, created_at, items')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        // If any primary query failed with an error, evaluate error classification
        const anyError = ordersRes.error || revenueRes.error || todaysOrdersRes.error || serviceReqRes.error || quoteReqRes.error || recentOrdersRes.error;
        if (anyError) {
          const classified = classifyError(anyError);
          
          // Only if it's a genuine network failure, check local fallback
          if (classified.isNetwork) {
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

          // Otherwise, show the clean classified error (auth / db / network without cache)
          setError(classified.message);
          return;
        }

        // ── CASE A & B: Successful query (empty or populated) ────────────────
        // An empty result is valid authoritative data (0 records). Never trigger stale fallback.
        const ordersList = ordersRes.data || [];
        const newOrders = ordersList.filter((o) => o.order_status === 'NEW' || o.order_status === 'UNDER_REVIEW').length;
        const inProduction = ordersList.filter((o) => o.order_status === 'IN_PRODUCTION' || o.order_status === 'DESIGN_REVIEW' || o.order_status === 'APPROVED').length;
        const readyForPickup = ordersList.filter((o) => o.order_status === 'READY_FOR_PICKUP' || o.order_status === 'OUT_FOR_DELIVERY').length;
        
        const revenue = (revenueRes.data || []).reduce((sum, order) => {
          const amt = Number(order.total_amount);
          return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
        }, 0);

        setStats({
          totalOrders: ordersRes.count ?? ordersList.length,
          newOrders,
          inProduction,
          readyForPickup,
          totalRevenue: revenue,
          todaysOrders: todaysOrdersRes.count ?? 0,
          pendingServiceRequests: serviceReqRes.count ?? 0,
          pendingQuoteRequests: quoteReqRes.count ?? 0,
        });

        // Format recent orders safely
        if (recentOrdersRes.data) {
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

  useEffect(() => {
    fetchDashboardData();

    // Listen for admin refresh events from top bar
    const handleAdminRefresh = () => {
      setRefreshing(true);
      fetchDashboardData();
    };
    window.addEventListener('admin-refresh', handleAdminRefresh);
    return () => window.removeEventListener('admin-refresh', handleAdminRefresh);
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-xs border border-slate-200/80"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-xs border border-slate-200/80"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl animate-pulse shadow-xs border border-slate-200/80"></div>
          <div className="h-96 bg-white rounded-2xl animate-pulse shadow-xs border border-slate-200/80"></div>
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-amber-500")} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Offline Notice Banner (only when connection failed and cached data is shown) */}
      {isOfflineFallback && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            className="text-xs font-bold px-3 py-1.5 bg-rose-100 text-rose-800 rounded-lg hover:bg-rose-200 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Responsive 6-Card KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {dashboardMetrics.map((kpi) => (
          <Link
            key={kpi.key}
            to={kpi.href}
            className={cn(
              "bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 transition-all duration-200 flex flex-col justify-between group",
              kpi.borderColor,
              "hover:shadow-sm hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className={cn("p-2 rounded-xl transition-colors", kpi.iconBg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.iconColor)} />
              </div>
              {kpi.badge && (
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", kpi.badgeColor)}>
                  {kpi.badge}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-500 truncate mb-1">{kpi.label}</h3>
              <p className={cn("text-xl sm:text-2xl font-bold tracking-tight", kpi.valueColor)}>
                {kpi.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 5. Quick Action Cards (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className={cn(
              "rounded-2xl p-5 transition-all duration-200 flex items-center justify-between group shadow-xs border",
              action.primary
                ? "bg-[#123B70] text-white border-[#123B70] hover:bg-[#0c274c] hover:border-[#0c274c]"
                : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={cn(
                "p-2.5 rounded-xl transition-colors shrink-0",
                action.primary ? "bg-white/10 text-amber-400" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
              )}>
                <action.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm block truncate">{action.title}</span>
                <span className={cn(
                  "text-[11px] block truncate mt-0.5",
                  action.primary ? "text-blue-200" : "text-slate-400"
                )}>
                  {action.subtitle}
                </span>
              </div>
            </div>
            <ArrowRight className={cn(
              "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1",
              action.primary ? "text-white/60 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
            )} />
          </Link>
        ))}
      </div>

      {/* 6. Lower Content Grid: Recent Orders (2fr) + Requests Summary (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
        {/* Recent Orders Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#123B70] flex items-center justify-center font-bold text-xs">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-[#123B70]">Recent Orders</h2>
            </div>
            <Link 
              to="/admin/orders" 
              className="text-xs font-bold text-[#123B70] hover:text-amber-600 transition-colors inline-flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order Code</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Service</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/orders?selected=${order.order_code}`)}
                    >
                      <td className="px-5 py-3.5 font-bold text-[#123B70]">{order.order_code}</td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">{order.customer_name}</td>
                      <td className="px-5 py-3.5 text-slate-600 truncate max-w-[180px]">{order.service_name}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px] text-right whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No recent orders found</p>
              <p className="text-[11px] text-slate-400 mt-1">New incoming customer orders will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Requests & Inquiries Summary */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#123B70]">Inquiries & Requests</h2>
            <span className="text-[11px] font-semibold text-slate-400">Live Counters</span>
          </div>
          
          <div className="p-5 flex flex-col gap-4">
            {/* Service Requests */}
            <Link 
              to="/admin/services-requests" 
              className="bg-gradient-to-br from-amber-50 to-amber-50/40 rounded-2xl p-5 border border-amber-200/80 hover:border-amber-300 transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-xs"
            >
              <div className="absolute top-2 right-2 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="w-16 h-16 text-amber-600" />
              </div>
              <p className="text-amber-900 text-xs font-bold mb-1">Citizen & Digital Requests</p>
              <p className="text-[11px] text-amber-700/80 mb-3">PAN, CSC, Certificates & Forms</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-700">{stats.pendingServiceRequests}</span>
                <span className="text-amber-800/80 text-xs font-semibold">pending requests</span>
              </div>
            </Link>

            {/* Quote Inquiries */}
            <Link 
              to="/admin/quotes" 
              className="bg-gradient-to-br from-indigo-50 to-indigo-50/40 rounded-2xl p-5 border border-indigo-200/80 hover:border-indigo-300 transition-all duration-200 relative overflow-hidden group shadow-xs hover:shadow-xs"
            >
              <div className="absolute top-2 right-2 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageSquare className="w-16 h-16 text-indigo-600" />
              </div>
              <p className="text-indigo-900 text-xs font-bold mb-1">Custom Quote Inquiries</p>
              <p className="text-[11px] text-indigo-700/80 mb-3">Bulk printing, wedding & custom jobs</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">{stats.pendingQuoteRequests}</span>
                <span className="text-indigo-800/80 text-xs font-semibold">pending quotes</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminContentContainer>
  );
};

export default AdminDashboardPage;
