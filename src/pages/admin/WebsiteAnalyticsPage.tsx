import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { TrendingUp, Package, AlertTriangle, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface AnalyticsData {
  topServices: { name: string; count: number }[];
  activeProducts: number;
  inactiveProducts: number;
  recentlyUpdated: any[];
  missingImages: any[];
  missingPrices: any[];
  servicesNoOrders: any[];
}

export const WebsiteAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        // Fetch order items and products in parallel
        const [orderItemsRes, productsRes] = await Promise.all([
          supabase.from('order_items').select('product_name'),
          supabase.from('products').select('id, name_en, name_hi, is_active, starting_price, image_url, updated_at'),
        ]);

        const orderItems = orderItemsRes.data;
        const products = productsRes.data;

        const counts: Record<string, number> = {};
        if (orderItems) {
          orderItems.forEach(item => {
            if (item.product_name) {
              counts[item.product_name] = (counts[item.product_name] || 0) + 1;
            }
          });
        }
        
        const topServices = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        let activeProducts = 0;
        let inactiveProducts = 0;
        let recentlyUpdated: any[] = [];
        let missingImages: any[] = [];
        let missingPrices: any[] = [];
        let servicesNoOrders: any[] = [];

        if (products) {
          activeProducts = products.filter(p => p.is_active).length;
          inactiveProducts = products.filter(p => !p.is_active).length;
          
          recentlyUpdated = [...products]
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 10);
            
          missingImages = products.filter(p => !p.image_url);
          missingPrices = products.filter(p => !p.starting_price || p.starting_price === 0);
          
          const orderedProductNames = new Set(Object.keys(counts));
          servicesNoOrders = products.filter(p => p.name_en && !orderedProductNames.has(p.name_en));
        }

        setData({
          topServices,
          activeProducts,
          inactiveProducts,
          recentlyUpdated,
          missingImages,
          missingPrices,
          servicesNoOrders
        });

      } catch (err) {
        console.error('Error fetching analytics:', err);
        addToast({ title: 'Error loading analytics', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#123B70]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Website Analytics" 
        subtitle="Insights and health metrics for your website content and catalog"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active Products</p>
            <h3 className="text-xl font-bold text-slate-900">{data?.activeProducts || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Inactive Products</p>
            <h3 className="text-xl font-bold text-slate-900">{data?.inactiveProducts || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Missing Images</p>
            <h3 className="text-xl font-bold text-slate-900">{data?.missingImages.length || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Missing Prices</p>
            <h3 className="text-xl font-bold text-slate-900">{data?.missingPrices.length || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Services */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Most Ordered Services
            </h3>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse admin-table text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-3.5 py-2 font-medium">Service Name</th>
                  <th className="px-3.5 py-2 font-medium text-right">Orders Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.topServices.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3.5 py-6 text-center text-slate-500 text-xs">
                      No order data available yet.
                    </td>
                  </tr>
                ) : (
                  data?.topServices.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2 text-xs font-semibold text-slate-900">{item.name}</td>
                      <td className="px-3.5 py-2 text-xs font-mono font-bold text-slate-600 text-right">{item.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Updated */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#123B70]" />
              Recently Updated Products
            </h3>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse admin-table text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-3.5 py-2 font-medium">Product Name</th>
                  <th className="px-3.5 py-2 font-medium">Status</th>
                  <th className="px-3.5 py-2 font-medium text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentlyUpdated.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2 text-xs font-semibold text-slate-900">{product.name_en || product.name_hi}</td>
                    <td className="px-3.5 py-2">
                      <StatusBadge status={product.is_active ? 'active' : 'inactive'} size="sm" />
                    </td>
                    <td className="px-3.5 py-2 text-xs text-slate-500 text-right">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Attention Needed */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="p-3.5 sm:p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Action Needed
            </h3>
          </div>
          <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Missing Images ({data?.missingImages.length || 0})
              </h4>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                {data?.missingImages.slice(0, 20).map(p => (
                  <li key={p.id} className="text-xs bg-slate-50 p-1.5 rounded-md text-slate-700 border border-slate-100">
                    {p.name_en || p.name_hi}
                  </li>
                ))}
                {data?.missingImages && data.missingImages.length > 20 && (
                  <li className="text-[10px] text-center text-slate-500 pt-1">...and {data.missingImages.length - 20} more</li>
                )}
                {data?.missingImages.length === 0 && <li className="text-xs text-slate-500">All products have images!</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Missing Prices ({data?.missingPrices.length || 0})
              </h4>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                {data?.missingPrices.slice(0, 20).map(p => (
                  <li key={p.id} className="text-xs bg-slate-50 p-1.5 rounded-md text-slate-700 border border-slate-100">
                    {p.name_en || p.name_hi}
                  </li>
                ))}
                {data?.missingPrices && data.missingPrices.length > 20 && (
                  <li className="text-[10px] text-center text-slate-500 pt-1">...and {data.missingPrices.length - 20} more</li>
                )}
                {data?.missingPrices.length === 0 && <li className="text-xs text-slate-500">All products have valid prices!</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
