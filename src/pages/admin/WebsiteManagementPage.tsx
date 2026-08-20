import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { 
  Box, IndianRupee, Image as ImageIcon, Zap, FolderTree, 
  FileEdit, BarChart3, History, ExternalLink, Package,
  AlertCircle, CheckCircle2, LayoutGrid, RefreshCw,
  AlertTriangle, ShieldCheck, ArrowRight, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface HealthStats {
  products: { total: number; active: number; inactive: number; missingImages: number; missingPrices: number };
  services: { total: number; active: number; inactive: number };
  categories: { total: number; active: number };
  content: { total: number };
  lastUpdated: { entity: string; time: string } | null;
}

export function WebsiteManagementPage() {
  const [stats, setStats] = useState<HealthStats>({
    products: { total: 0, active: 0, inactive: 0, missingImages: 0, missingPrices: 0 },
    services: { total: 0, active: 0, inactive: 0 },
    categories: { total: 0, active: 0 },
    content: { total: 0 },
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    
    try {
      const client = supabase;
      const [
        { count: totalProducts },
        { count: activeProducts },
        { count: missingImagesProducts },
        { count: missingPricesProducts },
        { count: totalServices },
        { count: activeServices },
        { count: totalCategories },
        { count: activeCategories },
        { count: totalContent },
        { data: logs },
        { data: lastProductUpdate }
      ] = await Promise.all([
        client.from('products').select('*', { count: 'exact', head: true }),
        client.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        client.from('products').select('*', { count: 'exact', head: true }).or('image_url.is.null,image_url.eq.""'),
        client.from('products').select('*', { count: 'exact', head: true }).or('starting_price.eq.0,starting_price.is.null'),
        client.from('services').select('*', { count: 'exact', head: true }),
        client.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
        client.from('categories').select('*', { count: 'exact', head: true }),
        client.from('categories').select('*', { count: 'exact', head: true }).eq('is_active', true),
        client.from('website_content').select('*', { count: 'exact', head: true }),
        client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6),
        client.from('products').select('name_en, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle()
      ]);

      const totProd = totalProducts || 0;
      const actProd = activeProducts || 0;
      const inactProd = Math.max(0, totProd - actProd);

      const totServ = totalServices || 0;
      const actServ = activeServices || 0;
      const inactServ = Math.max(0, totServ - actServ);

      setStats({
        products: {
          total: totProd,
          active: actProd,
          inactive: inactProd,
          missingImages: missingImagesProducts || 0,
          missingPrices: missingPricesProducts || 0
        },
        services: {
          total: totServ,
          active: actServ,
          inactive: inactServ,
        },
        categories: {
          total: totalCategories || 0,
          active: activeCategories || 0,
        },
        content: {
          total: totalContent || 0
        },
        lastUpdated: lastProductUpdate ? {
          entity: lastProductUpdate.name_en || 'Product Catalog',
          time: lastProductUpdate.updated_at
        } : null
      });
      
      if (logs) {
        setRecentActivity(logs);
      }
    } catch (error) {
      console.error('Error fetching website management health stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // Determine Website Health Level
  const totalItems = stats.products.total + stats.services.total;
  const criticalIssuesCount = stats.products.missingPrices;
  const warningIssuesCount = stats.products.missingImages + stats.products.inactive;

  const healthStatus = (() => {
    if (criticalIssuesCount > 0) {
      return {
        level: 'danger',
        label: 'Action Required',
        icon: AlertCircle,
        color: 'text-rose-600',
        badgeBg: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
        summary: `${criticalIssuesCount} product(s) missing live prices. Update them to ensure smooth checkout.`,
      };
    }
    if (warningIssuesCount > 0) {
      return {
        level: 'warning',
        label: 'Needs Attention',
        icon: AlertTriangle,
        color: 'text-amber-600',
        badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        summary: `${warningIssuesCount} item(s) have missing photos or are hidden from customer catalog.`,
      };
    }
    return {
      level: 'healthy',
      label: 'All Systems Healthy',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      summary: `Catalog, pricing engine, categories, and media are completely synchronized and published.`,
    };
  })();

  const shortcuts = [
    {
      title: 'Manage Products & Services',
      description: 'Create, edit, toggle visibility of offset & digital items',
      icon: Box,
      to: '/admin/website/services',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200/60',
      badge: `${stats.products.total + stats.services.total} items`,
    },
    {
      title: 'Print Pricing Engine',
      description: 'Set live rates, multipliers, and bulk volume discounts',
      icon: IndianRupee,
      to: '/admin/website/pricing',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200/60',
      badge: stats.products.missingPrices > 0 ? `${stats.products.missingPrices} missing` : 'Synced',
      badgeAlert: stats.products.missingPrices > 0,
    },
    {
      title: 'Quick Services Manager',
      description: 'Configure 7 rapid online services and finishing addons',
      icon: Zap,
      to: '/admin/quick-services',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200/60',
      badge: '7 Instant',
    },
    {
      title: 'Photo & Media Assets',
      description: 'Upload artwork, gallery pictures, and banner images',
      icon: ImageIcon,
      to: '/admin/website/photos',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200/60',
      badge: stats.products.missingImages > 0 ? `${stats.products.missingImages} missing` : 'All Set',
      badgeAlert: stats.products.missingImages > 0,
    },
    {
      title: 'Service Categories',
      description: 'Manage taxonomies, display order, and orphan protection',
      icon: FolderTree,
      to: '/admin/website/categories',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 border-teal-200/60',
      badge: `${stats.categories.total} active`,
    },
    {
      title: 'Homepage & Content',
      description: 'Update hero banner, promos, and business contact hours',
      icon: FileEdit,
      to: '/admin/website/content',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200/60',
      badge: 'Customizable',
    },
    {
      title: 'Catalog Analytics',
      description: 'Analyze order popularity, zero-sales items, and health',
      icon: BarChart3,
      to: '/admin/website/analytics',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 border-cyan-200/60',
      badge: 'Live Insights',
    },
    {
      title: 'Activity Audit Log',
      description: 'Complete audit trail with timestamps and actor tracking',
      icon: History,
      to: '/admin/website/activity',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 border-slate-200',
      badge: 'Security',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Control Center Page Header */}
      <AdminPageHeader 
        title="Website Control Center" 
        subtitle="Real-time website health monitor, catalog synchronization, and content controls"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh health statistics"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-[#123B70]")} />
              <span>Refresh Metrics</span>
            </button>

            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123B70] text-white rounded-xl hover:bg-[#0d2a50] transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Customer Site</span>
            </a>
          </div>
        }
      />

      {/* Top Health Status Master Banner */}
      <div className={cn(
        "rounded-2xl border p-5 sm:p-6 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4",
        healthStatus.level === 'healthy' && "bg-emerald-500/5 border-emerald-500/20",
        healthStatus.level === 'warning' && "bg-amber-500/5 border-amber-500/20",
        healthStatus.level === 'danger' && "bg-rose-500/5 border-rose-500/20"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-2xl shrink-0 flex items-center justify-center",
            healthStatus.level === 'healthy' && "bg-emerald-100 text-emerald-700",
            healthStatus.level === 'warning' && "bg-amber-100 text-amber-700",
            healthStatus.level === 'danger' && "bg-rose-100 text-rose-700"
          )}>
            <healthStatus.icon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Website Health Status</span>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-black border", healthStatus.badgeBg)}>
                {healthStatus.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {healthStatus.summary}
            </p>
            {stats.lastUpdated && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last catalog update: <strong>{stats.lastUpdated.entity}</strong> ({new Date(stats.lastUpdated.time).toLocaleDateString()} {new Date(stats.lastUpdated.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {healthStatus.level !== 'healthy' ? (
            <Link
              to={stats.products.missingPrices > 0 ? "/admin/website/pricing" : "/admin/website/services"}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs",
                healthStatus.level === 'danger' ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <span>Resolve Issues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/70 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Published & Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* 8 Interactive Health KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Products & Services */}
        <Link 
          to="/admin/website/services" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#123B70]/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Catalog</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#123B70] group-hover:bg-[#123B70] group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{totalItems}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {stats.products.total} Products • {stats.services.total} Digital
            </div>
          </div>
        </Link>

        {/* Card 2: Active Services */}
        <Link 
          to="/admin/website/services" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active (Published)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700">
              {stats.products.active + stats.services.active}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
              <span>Live on website catalog</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Hidden / Inactive Services */}
        <Link 
          to="/admin/website/services" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Hidden / Draft</span>
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              (stats.products.inactive + stats.services.inactive) > 0 
                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white" 
                : "bg-slate-100 text-slate-500"
            )}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">
              {stats.products.inactive + stats.services.inactive}
            </div>
            <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
              {(stats.products.inactive + stats.services.inactive) > 0 ? "Not visible to visitors" : "No hidden items"}
            </div>
          </div>
        </Link>

        {/* Card 4: Total Categories */}
        <Link 
          to="/admin/website/categories" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Categories</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{stats.categories.total}</div>
            <div className="text-[11px] font-semibold text-teal-700 mt-0.5">
              {stats.categories.active} Active Groups
            </div>
          </div>
        </Link>

        {/* Card 5: Missing Prices (CRITICAL) */}
        <Link 
          to="/admin/website/pricing" 
          className={cn(
            "p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all group flex flex-col justify-between",
            stats.products.missingPrices > 0 
              ? "bg-rose-50/40 border-rose-300 hover:border-rose-500" 
              : "bg-white border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Missing Prices</span>
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              stats.products.missingPrices > 0 
                ? "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white" 
                : "bg-slate-100 text-slate-500"
            )}>
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={cn("text-3xl font-black", stats.products.missingPrices > 0 ? "text-rose-700" : "text-slate-900")}>
              {stats.products.missingPrices}
            </div>
            <div className={cn("text-[11px] font-semibold mt-0.5", stats.products.missingPrices > 0 ? "text-rose-600 font-bold" : "text-emerald-700")}>
              {stats.products.missingPrices > 0 ? "⚠️ Click to assign rates" : "✓ All products priced"}
            </div>
          </div>
        </Link>

        {/* Card 6: Missing Images (WARNING) */}
        <Link 
          to="/admin/website/photos" 
          className={cn(
            "p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all group flex flex-col justify-between",
            stats.products.missingImages > 0 
              ? "bg-amber-50/40 border-amber-300 hover:border-amber-500" 
              : "bg-white border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Missing Images</span>
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              stats.products.missingImages > 0 
                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white" 
                : "bg-slate-100 text-slate-500"
            )}>
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={cn("text-3xl font-black", stats.products.missingImages > 0 ? "text-amber-800" : "text-slate-900")}>
              {stats.products.missingImages}
            </div>
            <div className={cn("text-[11px] font-semibold mt-0.5", stats.products.missingImages > 0 ? "text-amber-700 font-bold" : "text-emerald-700")}>
              {stats.products.missingImages > 0 ? "⚠️ Click to upload images" : "✓ All items have media"}
            </div>
          </div>
        </Link>

        {/* Card 7: Quick Services */}
        <Link 
          to="/admin/quick-services" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Instant Services</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">7</div>
            <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
              Direct Online Order Forms
            </div>
          </div>
        </Link>

        {/* Card 8: Homepage Content Sections */}
        <Link 
          to="/admin/website/content" 
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Content Sections</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{stats.content.total || 3}</div>
            <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
              Hero, Promo & Shop Info
            </div>
          </div>
        </Link>
      </div>

      {/* Control Center Management Shortcuts Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Management Control Areas</span>
          </h2>
          <span className="text-xs text-slate-500">Direct shortcuts to admin sections</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.title}
              to={shortcut.to}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-xl border", shortcut.bgColor)}>
                    <shortcut.icon className={cn("w-5 h-5", shortcut.color)} />
                  </div>
                  {shortcut.badge && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      shortcut.badgeAlert 
                        ? "bg-rose-50 text-rose-700 border-rose-200" 
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {shortcut.badge}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#123B70] transition-colors">
                    {shortcut.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {shortcut.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-[#123B70] pt-2 border-t border-slate-100 group-hover:translate-x-1 transition-transform">
                <span>Configure</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Live Recent Activity Stream */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span>Recent Website Modifications</span>
          </h2>
          <Link to="/admin/website/activity" className="text-xs font-bold text-[#123B70] hover:underline flex items-center gap-1">
            <span>View Full Audit Log</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No modifications logged yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Admin changes will appear here automatically with timestamps</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((log) => {
                const actionType = log.action_type || log.action || 'update';
                const entityType = log.entity_type || 'catalog';
                return (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {actionType.toUpperCase()} <span className="font-normal text-slate-500">on</span> <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">{entityType}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {log.details?.product_name || log.details?.title || log.entity_id || 'Website Setting'}
                          {log.details?.new_price ? ` • Price updated to ₹${log.details.new_price}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className="text-[10px] font-bold text-slate-600">
                        {log.details?.performed_by || 'Admin Staff'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebsiteManagementPage;
