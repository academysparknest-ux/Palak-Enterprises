import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/AdminToast';
import { cn, formatAdminErrorMessage } from '../../lib/utils';
import { Save, Edit3, Check, X, RefreshCw, Clock, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from '../../config/printPricing';
import { logAdminAudit } from '../../lib/supabase/database';

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
    if (isSupabaseConfigured && supabase) {
      fetchProducts();
      fetchQuickConfig();
    } else {
      setLoadingProducts(false);
      addToast({ title: 'Supabase Not Configured', type: 'error' });
    }
  }, []);

  const fetchProducts = async () => {
    if (!supabase) return;
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name_en, name_hi, starting_price, unit, updated_at, is_active, category_id')
        .order('category_id', { ascending: true })
        .order('name_en', { ascending: true });

      if (error) throw error;

      setProducts(data || []);
      const uniqueCats = Array.from(new Set(data?.map(p => p.category_id).filter(Boolean) as string[]));
      setCategories(uniqueCats);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      addToast({ title: 'Failed to fetch products', message: error.message, type: 'error' });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchQuickConfig = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('value')
        .eq('key', 'print_pricing_config')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setQuickConfig({ ...DEFAULT_PRINT_PRICING, ...(data.value as any) });
      } else {
        setQuickConfig(DEFAULT_PRINT_PRICING);
      }
    } catch (error: any) {
      console.error('Error fetching quick config:', error);
      addToast({ title: 'Failed to fetch quick service pricing', message: error.message, type: 'error' });
      setQuickConfig(DEFAULT_PRINT_PRICING);
    }
  };

  const handleSaveProductPrice = async (productId: string, oldPrice: number | null, productName: string) => {
    if (!supabase) return;
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
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ starting_price: newPrice, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Log to audit
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

      setProducts(products.map(p => p.id === productId ? { ...p, starting_price: newPrice, updated_at: new Date().toISOString() } : p));
      addToast({ title: 'Price updated successfully', type: 'success' });
      setEditingProductId(null);
    } catch (error: any) {
      console.error('Error saving product price:', error);
      addToast({ title: 'Price update failed', message: formatAdminErrorMessage(error, 'Unable to update pricing. Please try again.'), type: 'error' });
    } finally {
      setSavingProductPrice(false);
    }
  };

  const saveQuickConfig = async () => {
    if (!quickConfig || !supabase) return;
    
    try {
      setSavingQuickConfig(true);
      const { error } = await supabase
        .from('business_settings')
        .upsert({ 
          key: 'print_pricing_config', 
          value: quickConfig as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: 'update_pricing',
        entityType: 'pricing',
        entityId: 'print_pricing_config',
        details: { description: 'Updated quick service pricing tiers' },
      });

      addToast({ title: 'Quick Service Pricing saved', type: 'success' });
    } catch (error: any) {
      console.error('Error saving quick config:', error);
      addToast({ title: 'Failed to save pricing', message: formatAdminErrorMessage(error, 'Unable to save pricing. Please try again.'), type: 'error' });
    } finally {
      setSavingQuickConfig(false);
    }
  };

  const updateQuickVal = (path: string[], value: number) => {
    if (!quickConfig) return;
    
    const newConfig = JSON.parse(JSON.stringify(quickConfig));
    let current: any = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    setQuickConfig(newConfig);
    setEditingQuickKey(null);
  };

  const handleQuickEditSave = (path: string[]) => {
    const val = Number(editQuickVal);
    if (isNaN(val)) {
      addToast({ title: 'Invalid price', type: 'error' });
      return;
    }
    updateQuickVal(path, val);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category_id === selectedCategory);

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Pricing Management" 
        subtitle="Manage catalog product prices and quick service print rates"
      />

      <div className="flex border-b border-slate-200">
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
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
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
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
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border-slate-200 rounded-lg focus:ring-[#123B70] focus:border-[#123B70]"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={fetchProducts}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loadingProducts && "animate-spin")} />
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4">Current Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#123B70]" />
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {product.name_en}
                          {product.name_hi && <span className="ml-2 text-xs text-slate-500">({product.name_hi})</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{product.category_id || '-'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge 
                            status={product.is_active ? 'Active' : 'Inactive'} 
                            variant={product.is_active ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-slate-500">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            {formatRelativeTime(product.updated_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingProductId === product.id ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 font-medium">₹</span>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24 px-2 py-1 text-sm border-slate-300 rounded focus:ring-[#123B70] focus:border-[#123B70]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveProductPrice(product.id, product.starting_price, product.name_en);
                                  if (e.key === 'Escape') setEditingProductId(null);
                                }}
                              />
                              <span className="text-xs text-slate-400">/ {product.unit || 'unit'}</span>
                              <button 
                                onClick={() => handleSaveProductPrice(product.id, product.starting_price, product.name_en)}
                                disabled={savingProductPrice}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setEditingProductId(null)}
                                disabled={savingProductPrice}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[#123B70]">
                                {product.starting_price !== null ? `₹${product.starting_price}` : 'Not Set'}
                                {product.unit && <span className="text-xs text-slate-500 font-normal ml-1">/ {product.unit}</span>}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingProductId(product.id);
                                  setEditPrice(product.starting_price?.toString() || '');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-[#123B70] hover:bg-slate-100 rounded transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
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
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-800">Quick Service Rates</h3>
              <p className="text-sm text-slate-500">Manage pricing for instant print jobs</p>
            </div>
            <button
              onClick={saveQuickConfig}
              disabled={savingQuickConfig}
              className="flex items-center px-4 py-2 bg-[#123B70] text-white rounded-xl hover:bg-[#0a2955] transition-colors disabled:opacity-50 font-medium"
            >
              {savingQuickConfig ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Printing */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h4 className="text-lg font-semibold text-[#123B70] mb-4 pb-2 border-b border-slate-100">Document Printing</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Base Rate (Per Page)</h5>
                  <div className="space-y-2">
                    <QuickRateRow label="B&W Single Side" path={['documentPrinting', 'baseRatePerPage', 'bwSingle']} value={quickConfig.documentPrinting.baseRatePerPage.bwSingle} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="B&W Double Side" path={['documentPrinting', 'baseRatePerPage', 'bwDouble']} value={quickConfig.documentPrinting.baseRatePerPage.bwDouble} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Color Single Side" path={['documentPrinting', 'baseRatePerPage', 'colorSingle']} value={quickConfig.documentPrinting.baseRatePerPage.colorSingle} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Color Double Side" path={['documentPrinting', 'baseRatePerPage', 'colorDouble']} value={quickConfig.documentPrinting.baseRatePerPage.colorDouble} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Finishing</h5>
                  <div className="space-y-2">
                    <QuickRateRow label="Spiral Binding" path={['documentPrinting', 'finishing', 'spiralBinding', 'price']} value={quickConfig.documentPrinting.finishing.spiralBinding.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Comb Binding" path={['documentPrinting', 'finishing', 'combBinding', 'price']} value={quickConfig.documentPrinting.finishing.combBinding.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Lamination (per page)" path={['documentPrinting', 'finishing', 'lamination', 'pricePerPage']} value={quickConfig.documentPrinting.finishing.lamination.pricePerPage} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="Stapling" path={['documentPrinting', 'finishing', 'stapling', 'price']} value={quickConfig.documentPrinting.finishing.stapling.price} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
              </div>
            </div>

            {/* Passport Photo & Posters */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h4 className="text-lg font-semibold text-[#123B70] mb-4 pb-2 border-b border-slate-100">Passport Photos</h4>
                <div className="space-y-2">
                  <QuickRateRow label="8 Photos Sheet" path={['passportPhoto', 'sheet8']} value={quickConfig.passportPhoto.sheet8} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="16 Photos Sheet" path={['passportPhoto', 'sheet16']} value={quickConfig.passportPhoto.sheet16} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="32 Photos Sheet" path={['passportPhoto', 'sheet32']} value={quickConfig.passportPhoto.sheet32} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="Single Print" path={['passportPhoto', 'singlePrint']} value={quickConfig.passportPhoto.singlePrint} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h4 className="text-lg font-semibold text-[#123B70] mb-4 pb-2 border-b border-slate-100">Posters & Large Format</h4>
                <div className="space-y-2">
                  <QuickRateRow label="A4 Photo" path={['posters', 'a4Photo']} value={quickConfig.posters.a4Photo} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="A3 Glossy" path={['posters', 'a3Glossy']} value={quickConfig.posters.a3Glossy} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="A2 Photo" path={['posters', 'a2Photo']} value={quickConfig.posters.a2Photo} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="Vinyl (per sq ft)" path={['posters', 'vinylPerSqFt']} value={quickConfig.posters.vinylPerSqFt} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  <QuickRateRow label="Flex (per sq ft)" path={['posters', 'flexPerSqFt']} value={quickConfig.posters.flexPerSqFt} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                </div>
              </div>
            </div>

            {/* Cards (ID & Visiting) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:col-span-2">
              <h4 className="text-lg font-semibold text-[#123B70] mb-4 pb-2 border-b border-slate-100">Cards</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Visiting Cards</h5>
                  <div className="space-y-2">
                    <QuickRateRow label="100 Cards (Single Side)" path={['visitingCards', 'base100Single']} value={quickConfig.visitingCards.base100Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="100 Cards (Double Side)" path={['visitingCards', 'base100Double']} value={quickConfig.visitingCards.base100Double} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="500 Cards (Single Side)" path={['visitingCards', 'base500Single']} value={quickConfig.visitingCards.base500Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                    <QuickRateRow label="1000 Cards (Single Side)" path={['visitingCards', 'base1000Single']} value={quickConfig.visitingCards.base1000Single} editingKey={editingQuickKey} setEditingKey={setEditingQuickKey} editVal={editQuickVal} setEditVal={setEditQuickVal} onSave={handleQuickEditSave} />
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">ID Cards</h5>
                  <div className="space-y-2">
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
  editingKey, 
  setEditingKey, 
  editVal, 
  setEditVal, 
  onSave 
}: { 
  label: string; 
  path: string[]; 
  value: number; 
  editingKey: string | null; 
  setEditingKey: (k: string | null) => void;
  editVal: string;
  setEditVal: (v: string) => void;
  onSave: (p: string[]) => void;
}) {
  const keyStr = path.join('.');
  const isEditing = editingKey === keyStr;

  return (
    <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group transition-colors">
      <span className="text-sm text-slate-700">{label}</span>
      
      {isEditing ? (
        <div className="flex items-center space-x-1">
          <span className="text-slate-500 font-medium text-sm">₹</span>
          <input
            type="number"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="w-20 px-2 py-0.5 text-sm border-slate-300 rounded focus:ring-[#123B70] focus:border-[#123B70]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(path);
              if (e.key === 'Escape') setEditingKey(null);
            }}
          />
          <button onClick={() => onSave(path)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditingKey(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="font-medium text-[#123B70] min-w-[3rem] text-right">₹{value}</span>
          <button
            onClick={() => {
              setEditingKey(keyStr);
              setEditVal(value.toString());
            }}
            className="ml-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#123B70] hover:bg-slate-100 rounded transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
