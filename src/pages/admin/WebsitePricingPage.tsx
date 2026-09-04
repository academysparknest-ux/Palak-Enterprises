import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/AdminToast';
import { cn, formatAdminErrorMessage, formatPrice, roundPrice } from '../../lib/utils';
import { Save, Edit3, Check, X, RefreshCw, Clock, Filter, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type PrintPricingConfig } from '../../config/printPricing';
import { logAdminAudit, getPrintPricingConfig, updatePrintPricingConfig, subscribeToPrintPricing } from '../../lib/supabase/database';
import { PalakDataStore } from '../../lib/storage/store';

interface Product {
  id: string;
  name_en: string;
  name_hi: string | null;
  starting_price: number | null;
  unit: string | null;
  updated_at: string | null;
  is_active: boolean;
  category_id: string;
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const WebsitePricingPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'catalog' | 'quick-service'>('catalog');

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Inline editing state for Catalog
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [savingProductPrice, setSavingProductPrice] = useState(false);

  // Quick Service State
  const [quickConfig, setQuickConfig] = useState<PrintPricingConfig | null>(null);
  const [savingQuickConfig, setSavingQuickConfig] = useState(false);
  
  // Inline editing state for Quick Service
  const [editingQuickKey, setEditingQuickKey] = useState<string | null>(null);
  const [editQuickVal, setEditQuickVal] = useState<string>('');

  useEffect(() => {
    loadInitialData();

    // Subscribe to live realtime print pricing changes across multiple staff sessions & tabs
    const unsubscribePricing = subscribeToPrintPricing((freshConfig) => {
      setQuickConfig(freshConfig);
    });

    return () => {
      unsubscribePricing();
    };
  }, []);

  const loadInitialData = async () => {
    // 1. Instantly populate from local storage / store
    const localProds = PalakDataStore.getProducts();
    const mapped: Product[] = localProds.map((p) => ({
      id: p.id,
      name_en: p.name.en,
      name_hi: p.name.hi || null,
      starting_price: p.startingPrice,
      unit: p.unit || null,
      updated_at: new Date().toISOString(),
      is_active: true,
      category_id: p.categoryId,
    }));
    setProducts(mapped);
    const uniqueCats = Array.from(new Set(localProds.map((p) => p.categoryId).filter(Boolean) as string[]));
    setCategories(uniqueCats);
    setLoadingProducts(false);

    // 2. Fetch quick config
    const liveQuickConfig = await getPrintPricingConfig();
    setQuickConfig(liveQuickConfig);

    // 3. If Supabase is configured, fetch in background and merge
    if (isSupabaseConfigured && supabase) {
      fetchProductsFromCloud();
    }
  };

  const fetchProductsFromCloud = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_en, name_hi, starting_price, unit, updated_at, is_active, category_id')
        .order('category_id', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Overlay Supabase data on top of full products catalog
        setProducts((prev) => {
          const map = new Map<string, Product>();
          prev.forEach((p) => map.set(p.id, p));
          data.forEach((p: any) => map.set(p.id, { ...map.get(p.id), ...p }));
          const merged = Array.from(map.values());
          const uniqueCats = Array.from(new Set(merged.map((p) => p.category_id).filter(Boolean) as string[]));
          setCategories(uniqueCats);
          return merged;
        });
      }
    } catch (error: any) {
      console.debug('Background cloud products fetch notice:', error);
    }
  };

  const handleSaveProductPrice = async (productId: string, oldPrice: number | null, productName: string) => {
    if (!editPrice.trim() || isNaN(Number(editPrice)) || Number(editPrice) < 0) {
      addToast({ title: 'Invalid price. Please enter a positive number', type: 'error' });
      return;
    }

    const newPrice = Number(editPrice);
    if (newPrice === oldPrice) {
      setEditingProductId(null);
      return;
    }

    try {
      setSavingProductPrice(true);
      
      // 1. Immediately persist to PalakDataStore & localStorage
      PalakDataStore.updateProductPrice(productId, newPrice);

      // 2. Update local state
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, starting_price: newPrice, updated_at: new Date().toISOString() } : p))
      );

      // 3. Sync to Supabase in background
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('products')
            .update({ starting_price: newPrice, updated_at: new Date().toISOString() })
            .eq('id', productId);
        } catch (cloudErr) {
          console.warn('Supabase product price update note (saved locally):', cloudErr);
        }

        // Log audit
        try {
          await logAdminAudit({
            actorId: user?.id,
            actorName: user?.name,
            actorRole: user?.role,
            actionType: 'price_change',
            entityType: 'product',
            entityId: productId,
            details: { old_price: oldPrice, new_price: newPrice, product_name: productName },
            previousValue: oldPrice,
            newValue: newPrice,
          });
        } catch {}
      }

      addToast({ title: `Price updated to ₹${newPrice}`, message: `${productName} price is now active`, type: 'success' });
      setEditingProductId(null);
    } catch (error: any) {
      console.error('Error saving product price:', error);
      addToast({ title: 'Price update error', message: formatAdminErrorMessage(error, 'Unable to update pricing.'), type: 'error' });
    } finally {
      setSavingProductPrice(false);
    }
  };

  const saveQuickConfig = async () => {
    if (!quickConfig) return;
    
    try {
      setSavingQuickConfig(true);
      await updatePrintPricingConfig(quickConfig);

      if (isSupabaseConfigured && supabase) {
        try {
          await logAdminAudit({
            actorId: user?.id,
            actorName: user?.name,
            actorRole: user?.role,
            actionType: 'update_pricing',
            entityType: 'pricing',
            entityId: 'print_pricing_config',
            details: { description: 'Updated quick service pricing tiers' },
          });
        } catch {}
      }

      addToast({ title: 'Quick Service Pricing saved live!', type: 'success' });
    } catch (error: any) {
      console.error('Error saving quick config:', error);
      addToast({ title: 'Failed to save pricing', message: formatAdminErrorMessage(error, 'Unable to save pricing. Please try again.'), type: 'error' });
    } finally {
      setSavingQuickConfig(false);
    }
  };

  const updateQuickVal = async (path: string[], value: number) => {
    if (!quickConfig) return;
    
    const newConfig = JSON.parse(JSON.stringify(quickConfig));
    let current: any = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    const isMultiplier = path.includes("multiplier");
    const sanitizedVal = isMultiplier
      ? Math.max(0.1, roundPrice(value))
      : Math.max(0, roundPrice(value));
    current[path[path.length - 1]] = sanitizedVal;
    
    setQuickConfig(newConfig);
    setEditingQuickKey(null);

    // Auto-persist immediately to canonical source so all other screens and tabs update live
    try {
      await updatePrintPricingConfig(newConfig);
      addToast({ title: 'Rate updated & synchronized live across all tabs', type: 'success' });
    } catch (e) {
      console.error('Error auto-saving quick rate:', e);
      addToast({ title: 'Failed to update rate', type: 'error' });
    }
  };

  const handleQuickEditSave = (path: string[]) => {
    if (!editQuickVal.trim() || isNaN(Number(editQuickVal))) {
      addToast({ title: 'Invalid number. Please enter a valid rate', type: 'error' });
      return;
    }
    const val = Number(editQuickVal);
    const isMultiplier = path.includes("multiplier");
    if (!isMultiplier && val < 0) {
      addToast({ title: 'Price cannot be negative', type: 'error' });
      return;
    }
    if (isMultiplier && val <= 0) {
      addToast({ title: 'Multiplier must be greater than 0', type: 'error' });
      return;
    }
    updateQuickVal(path, val);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category_id === selectedCategory);

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Pricing Management" 
        subtitle="Manage catalog product prices and quick service print rates"
      />

      <div className="flex border-b border-slate-200">
        <button
          className={cn(
            "px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === 'catalog'
              ? "border-[#123B70] text-[#123B70]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
          onClick={() => setActiveTab('catalog')}
        >
          Catalog Product Pricing
        </button>
        <button
          className={cn(
            "px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === 'quick-service'
              ? "border-[#123B70] text-[#123B70]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
          onClick={() => setActiveTab('quick-service')}
        >
          Quick Service Print Pricing
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-xs border border-slate-200">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-[#123B70] focus:border-[#123B70] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={loadInitialData}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loadingProducts && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 admin-table">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2">Product Name</th>
                    <th className="px-3.5 py-2">Category</th>
                    <th className="px-3.5 py-2">Status</th>
                    <th className="px-3.5 py-2">Last Updated</th>
                    <th className="px-3.5 py-2">Current Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-6 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-[#123B70]" />
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-6 text-center text-slate-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-3.5 py-2 font-semibold text-slate-900">
                          {product.name_en}
                          {product.name_hi && <span className="ml-1.5 text-[10px] text-slate-500">({product.name_hi})</span>}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-[11px] text-slate-600">{product.category_id || '-'}</td>
                        <td className="px-3.5 py-2">
                          <StatusBadge 
                            status={product.is_active ? 'Active' : 'Inactive'} 
                            variant={product.is_active ? 'success' : 'danger'}
                            size="sm"
                          />
                        </td>
                        <td className="px-3.5 py-2">
                          <div className="flex items-center text-slate-500 text-[11px]">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatRelativeTime(product.updated_at)}
                          </div>
                        </td>
                        <td className="px-3.5 py-2">
                          {editingProductId === product.id ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-500 font-medium text-xs">₹</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 px-2 py-0.5 text-xs border-slate-300 rounded-lg focus:ring-[#123B70] focus:border-[#123B70]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveProductPrice(product.id, product.starting_price, product.name_en);
                                  if (e.key === 'Escape') setEditingProductId(null);
                                }}
                              />
                              <span className="text-[10px] text-slate-400">/ {product.unit || 'unit'}</span>
                              <button 
                                onClick={() => handleSaveProductPrice(product.id, product.starting_price, product.name_en)}
                                disabled={savingProductPrice}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingProductId(null)}
                                disabled={savingProductPrice}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#123B70]">
                                {product.starting_price !== null ? `₹${product.starting_price}` : 'Not Set'}
                                {product.unit && <span className="text-[10px] text-slate-500 font-normal ml-1">/ {product.unit}</span>}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingProductId(product.id);
                                  setEditPrice(product.starting_price?.toString() || '');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#123B70] hover:bg-slate-100 rounded transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quick-service' && quickConfig && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl shadow-xs border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-800">Authoritative Quick Service Rates</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Live Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every rate edited here updates immediately across the entire site, customer order forms, and backend calculators.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/admin/quick-services"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <span>Full Quick Services Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={saveQuickConfig}
                disabled={savingQuickConfig}
                className="flex items-center px-3.5 py-1.5 bg-[#123B70] text-white rounded-lg hover:bg-[#0a2955] transition-colors disabled:opacity-50 text-xs font-bold shadow-xs cursor-pointer"
              >
                {savingQuickConfig ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save All Changes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Printing */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-4 space-y-3.5">
              <h4 className="text-sm font-bold text-[#123B70] pb-1.5 border-b border-slate-100">Document Printing</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Base Rate (Per Page)</h5>
                  <div className="space-y-1">
                    <QuickRateRow label="B&W Single Side" path={['documentPrinting', 'baseRatePerPage', 'bwSingle']} value={quickConfig.documentPrinting.baseRatePerPage.bwSingle} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="B&W Double Side (per side)" path={['documentPrinting', 'baseRatePerPage', 'bwDouble']} value={quickConfig.documentPrinting.baseRatePerPage.bwDouble} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Color Single Side" path={['documentPrinting', 'baseRatePerPage', 'colorSingle']} value={quickConfig.documentPrinting.baseRatePerPage.colorSingle} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Color Double Side (per side)" path={['documentPrinting', 'baseRatePerPage', 'colorDouble']} value={quickConfig.documentPrinting.baseRatePerPage.colorDouble} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Paper Size Multipliers</h5>
                  <div className="space-y-1">
                    <QuickRateRow label="A4 Multiplier (Standard)" path={['documentPrinting', 'paperSizes', 'a4', 'multiplier']} value={quickConfig.documentPrinting.paperSizes.a4.multiplier} isMultiplier editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="A3 Multiplier (Large)" path={['documentPrinting', 'paperSizes', 'a3', 'multiplier']} value={quickConfig.documentPrinting.paperSizes.a3.multiplier} isMultiplier editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="A5 Multiplier (Booklet)" path={['documentPrinting', 'paperSizes', 'a5', 'multiplier']} value={quickConfig.documentPrinting.paperSizes.a5.multiplier} isMultiplier editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Finishing & Binding</h5>
                  <div className="space-y-1">
                    <QuickRateRow label="Spiral Binding (per book)" path={['documentPrinting', 'finishing', 'spiralBinding', 'price']} value={quickConfig.documentPrinting.finishing.spiralBinding.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Comb Binding (per book)" path={['documentPrinting', 'finishing', 'combBinding', 'price']} value={quickConfig.documentPrinting.finishing.combBinding.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Lamination (per leaf)" path={['documentPrinting', 'finishing', 'lamination', 'pricePerPage']} value={quickConfig.documentPrinting.finishing.lamination.pricePerPage} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Stapling (per set)" path={['documentPrinting', 'finishing', 'stapling', 'price']} value={quickConfig.documentPrinting.finishing.stapling.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
              </div>
            </div>

            {/* Passport Photo & Posters */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-4">
                <h4 className="text-sm font-bold text-[#123B70] mb-3 pb-1.5 border-b border-slate-100">Passport Photos</h4>
                <div className="space-y-1">
                  <QuickRateRow label="Single 4×6 Print" path={['passportPhoto', 'singlePrint']} value={quickConfig.passportPhoto.singlePrint} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="8 Photos Sheet" path={['passportPhoto', 'sheet8']} value={quickConfig.passportPhoto.sheet8} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="16 Photos Sheet" path={['passportPhoto', 'sheet16']} value={quickConfig.passportPhoto.sheet16} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="32 Photos Sheet" path={['passportPhoto', 'sheet32']} value={quickConfig.passportPhoto.sheet32} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-4">
                <h4 className="text-sm font-bold text-[#123B70] mb-3 pb-1.5 border-b border-slate-100">Posters & Large Format</h4>
                <div className="space-y-1">
                  <QuickRateRow label="A4 Photo Sheet" path={['posters', 'a4Photo']} value={quickConfig.posters.a4Photo} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="A3 Glossy Paper" path={['posters', 'a3Glossy']} value={quickConfig.posters.a3Glossy} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="A2 Photo Sheet" path={['posters', 'a2Photo']} value={quickConfig.posters.a2Photo} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="Vinyl Flex (per sq.ft)" path={['posters', 'vinylPerSqFt']} value={quickConfig.posters.vinylPerSqFt} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="Regular Flex (per sq.ft)" path={['posters', 'flexPerSqFt']} value={quickConfig.posters.flexPerSqFt} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                </div>
              </div>
            </div>

            {/* Cards (ID & Visiting) */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 sm:p-4 md:col-span-2">
              <h4 className="text-sm font-bold text-[#123B70] mb-3 pb-1.5 border-b border-slate-100">Cards</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Visiting Cards</h5>
                  <div className="space-y-1">
                    <QuickRateRow label="100 Cards (Single Side)" path={['visitingCards', 'base100Single']} value={quickConfig.visitingCards.base100Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="100 Cards (Double Side)" path={['visitingCards', 'base100Double']} value={quickConfig.visitingCards.base100Double} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="500 Cards (Single Side)" path={['visitingCards', 'base500Single']} value={quickConfig.visitingCards.base500Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="500 Cards (Double Side)" path={['visitingCards', 'base500Double']} value={quickConfig.visitingCards.base500Double} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="1000 Cards (Single Side)" path={['visitingCards', 'base1000Single']} value={quickConfig.visitingCards.base1000Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="1000 Cards (Double Side)" path={['visitingCards', 'base1000Double']} value={quickConfig.visitingCards.base1000Double} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Matte Finish Extra" path={['visitingCards', 'matteFinishExtra']} value={quickConfig.visitingCards.matteFinishExtra} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Gloss Finish Extra" path={['visitingCards', 'glossFinishExtra']} value={quickConfig.visitingCards.glossFinishExtra} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Velvet Finish Extra" path={['visitingCards', 'velvetFinishExtra']} value={quickConfig.visitingCards.velvetFinishExtra} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ID Cards</h5>
                  <div className="space-y-1">
                    <QuickRateRow label="PVC Single Side" path={['idCards', 'pvcSingle']} value={quickConfig.idCards.pvcSingle} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="PVC Double Side" path={['idCards', 'pvcDouble']} value={quickConfig.idCards.pvcDouble} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="With Lanyard & Holder" path={['idCards', 'withLanyardHolder']} value={quickConfig.idCards.withLanyardHolder} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for quick service rows
function QuickRateRow({ 
  label, 
  path, 
  value, 
  isMultiplier = false,
  editingKey, 
  setEditingKey, 
  editVal, 
  setEditVal, 
  onSave 
}: { 
  label: string; 
  path: string[]; 
  value: number; 
  isMultiplier?: boolean;
  editingKey: string | null; 
  setEditingKey: (k: string | null) => void;
  editVal: string;
  setEditVal: (v: string) => void;
  onSave: (p: string[]) => void;
}) {
  const keyStr = path.join('.');
  const isEditing = editingKey === keyStr;

  return (
    <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg group transition-colors">
      <span className="text-xs text-slate-700">{label}</span>
      
      {isEditing ? (
        <div className="flex items-center space-x-1">
          {!isMultiplier && <span className="text-slate-500 font-medium text-xs">₹</span>}
          <input
            type="number"
            step={isMultiplier ? "0.1" : "0.5"}
            min={isMultiplier ? "0.1" : "0"}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="w-16 px-1.5 py-0.5 text-xs border-slate-300 rounded focus:ring-[#123B70] focus:border-[#123B70]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(path);
              if (e.key === 'Escape') setEditingKey(null);
            }}
          />
          {isMultiplier && <span className="text-slate-400 font-bold text-xs">x</span>}
          <button onClick={() => onSave(path)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => setEditingKey(null)} className="p-0.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="font-bold text-[#123B70] min-w-[3rem] text-right text-xs">
            {isMultiplier ? `${value}x` : formatPrice(value)}
          </span>
          <button
            onClick={() => {
              setEditingKey(keyStr);
              setEditVal(value.toString());
            }}
            className="ml-1.5 opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-[#123B70] hover:bg-slate-100 rounded transition-all cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
