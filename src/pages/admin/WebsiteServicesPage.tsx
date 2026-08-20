import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink,
  Filter
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminModal } from '../../components/admin/AdminModal';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/AdminToast';
import { logAdminAudit } from '../../lib/supabase/database';
import { cn, formatAdminErrorMessage } from '../../lib/utils';

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  category_type: string;
  is_active: boolean;
};

type ItemBase = {
  id: string;
  slug: string;
  category_id: string;
  name_en: string;
  name_hi: string | null;
  short_desc_en: string | null;
  short_desc_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  is_featured: boolean;
  is_popular: boolean;
  is_active: boolean;
  tags: string[] | null;
  sort_order: number;
};

type Product = ItemBase & {
  starting_price: number | null;
  base_quantity: number | null;
  unit: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_new: boolean;
  turnaround_time_en: string | null;
  turnaround_time_hi: string | null;
};

type Service = ItemBase & {
  estimated_fee: number | null;
  processing_time_en: string | null;
  processing_time_hi: string | null;
  icon_name: string | null;
};

type TabType = 'products' | 'services';

export const WebsiteServicesPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete confirm
  const [itemToDelete, setItemToDelete] = useState<Product | Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    slug: '',
    category_id: '',
    name_en: '',
    name_hi: '',
    short_desc_en: '',
    short_desc_hi: '',
    description_en: '',
    description_hi: '',
    price_fee: '', // maps to starting_price or estimated_fee
    unit: '',
    image_url: '',
    sort_order: 0,
    is_active: true,
    is_featured: false,
    is_popular: false,
  });

  // Fetch Data
  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      addToast({ type: 'error', title: 'Supabase is not configured' });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const [productsRes, servicesRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('sort_order', { ascending: true }),
        supabase.from('services').select('*').order('sort_order', { ascending: true }),
        supabase.from('categories').select('*').order('name_en', { ascending: true })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data as Product[]);
      setServices(servicesRes.data as Service[]);
      setCategories(categoriesRes.data as Category[]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      addToast({ type: 'error', title: 'Failed to load data', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const logAudit = async (action: string, tableName: string, recordId: string) => {
    try {
      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: action.toLowerCase(),
        entityType: tableName === 'products' ? 'product' : 'service',
        entityId: recordId,
        details: { action, table: tableName, recordId },
      });
    } catch (err) {
      console.warn('Failed to log audit:', err);
    }
  };

  // Filtered Data
  const displayedItems = useMemo(() => {
    const items = activeTab === 'products' ? products : services;
    
    return items.filter(item => {
      const matchesSearch = item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (item.name_hi && item.name_hi.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && item.is_active) || 
                           (statusFilter === 'hidden' && !item.is_active);
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeTab, products, services, searchQuery, selectedCategory, statusFilter]);

  // Generate slug
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name_en: name,
      ...(prev.id ? {} : { slug: generateSlug(name) })
    }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      id: crypto.randomUUID(),
      slug: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      name_en: '',
      name_hi: '',
      short_desc_en: '',
      short_desc_hi: '',
      description_en: '',
      description_hi: '',
      price_fee: '',
      unit: '',
      image_url: '',
      sort_order: displayedItems.length * 10,
      is_active: true,
      is_featured: false,
      is_popular: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Product | Service) => {
    setEditingItem(item);
    
    const isProduct = activeTab === 'products';
    const prod = item as Product;
    const serv = item as Service;

    setFormData({
      id: item.id,
      slug: item.slug || '',
      category_id: item.category_id || '',
      name_en: item.name_en || '',
      name_hi: item.name_hi || '',
      short_desc_en: item.short_desc_en || '',
      short_desc_hi: item.short_desc_hi || '',
      description_en: item.description_en || '',
      description_hi: item.description_hi || '',
      price_fee: isProduct ? (prod.starting_price?.toString() || '') : (serv.estimated_fee?.toString() || ''),
      unit: isProduct ? (prod.unit || '') : '',
      image_url: isProduct ? (prod.image_url || '') : '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
      is_featured: item.is_featured,
      is_popular: item.is_popular,
    });
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    
    setIsSaving(true);
    const tableName = activeTab === 'products' ? 'products' : 'services';
    const isNew = !editingItem;
    
    try {
      const priceVal = formData.price_fee ? parseFloat(formData.price_fee) : null;
      
      const payload: any = {
        id: formData.id,
        slug: formData.slug || generateSlug(formData.name_en),
        category_id: formData.category_id || null,
        name_en: formData.name_en,
        name_hi: formData.name_hi || null,
        short_desc_en: formData.short_desc_en || null,
        short_desc_hi: formData.short_desc_hi || null,
        description_en: formData.description_en || null,
        description_hi: formData.description_hi || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_popular: formData.is_popular,
        updated_at: new Date().toISOString()
      };

      if (activeTab === 'products') {
        payload.starting_price = priceVal;
        payload.unit = formData.unit || null;
        payload.image_url = formData.image_url || null;
      } else {
        payload.estimated_fee = priceVal;
      }

      if (isNew) {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from(tableName).insert([payload]);
        if (error) throw error;
        addToast({ type: 'success', title: `${activeTab === 'products' ? 'Product' : 'Service'} created successfully` });
        await logAudit('INSERT', tableName, payload.id);
      } else {
        const { error } = await supabase.from(tableName).update(payload).eq('id', payload.id);
        if (error) throw error;
        addToast({ type: 'success', title: `${activeTab === 'products' ? 'Product' : 'Service'} updated successfully` });
        await logAudit('UPDATE', tableName, payload.id);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving item:', error);
      addToast({ type: 'error', title: 'Failed to save', message: formatAdminErrorMessage(error, 'Unable to save item. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !isSupabaseConfigured || !supabase) return;
    
    setIsDeleting(true);
    const tableName = activeTab === 'products' ? 'products' : 'services';
    
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', itemToDelete.id);
      if (error) throw error;
      
      addToast({ type: 'success', title: 'Item deleted successfully' });
      await logAudit('DELETE', tableName, itemToDelete.id);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      addToast({ type: 'error', title: 'Failed to delete', message: formatAdminErrorMessage(error, 'Unable to delete item. Please check permissions.') });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleToggleable = async (item: Product | Service, field: keyof ItemBase) => {
    if (!isSupabaseConfigured || !supabase) return;
    
    const tableName = activeTab === 'products' ? 'products' : 'services';
    const newValue = !item[field];
    
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Optimistic update
      if (activeTab === 'products') {
        setProducts(prev => prev.map(p => p.id === item.id ? { ...p, [field]: newValue } : p));
      } else {
        setServices(prev => prev.map(s => s.id === item.id ? { ...s, [field]: newValue } : s));
      }
      
      await logAudit('UPDATE', tableName, item.id);
      addToast({ type: 'success', title: `Updated successfully` });
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      addToast({ type: 'error', title: 'Failed to update' });
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name_en : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Products & Services" 
        subtitle="Manage website offerings, pricing, and visibility"
        actions={
          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'products' ? 'Product' : 'Service'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('products')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'products' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'services' 
              ? "border-primary text-primary" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          Digital Services
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="text-slate-400 w-4 h-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name_en}</option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">Name (EN)</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">{activeTab === 'products' ? 'Price' : 'Fee'}</th>
                <th className="px-6 py-4 font-medium">Active</th>
                <th className="px-6 py-4 font-medium">Featured</th>
                <th className="px-6 py-4 font-medium">Popular</th>
                <th className="px-6 py-4 font-medium text-center">Sort</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                      Loading data...
                    </div>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No {activeTab} found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.name_en}</div>
                      {item.name_hi && <div className="text-xs text-slate-500 mt-1">{item.name_hi}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {getCategoryName(item.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {activeTab === 'products' 
                        ? ((item as Product).starting_price ? `₹${(item as Product).starting_price}` : '-')
                        : ((item as Service).estimated_fee ? `₹${(item as Service).estimated_fee}` : '-')}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_active')}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          item.is_active ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                          item.is_active ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_featured')}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          item.is_featured ? "bg-amber-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                          item.is_featured ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_popular')}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          item.is_popular ? "bg-blue-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                          item.is_popular ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-slate-600">
                      {item.sort_order}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <a
                          href={`/${activeTab === 'products' ? 'printing' : 'digital-services'}/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit ${activeTab === 'products' ? 'Product' : 'Service'}` : `Add New ${activeTab === 'products' ? 'Product' : 'Service'}`}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Name (English) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name_en}
                onChange={handleNameChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Name (Hindi)</label>
              <input
                type="text"
                value={formData.name_hi}
                onChange={(e) => setFormData({...formData, name_hi: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Slug (URL) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Category <span className="text-rose-500">*</span></label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name_en}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Short Description (EN)</label>
              <textarea
                rows={2}
                value={formData.short_desc_en}
                onChange={(e) => setFormData({...formData, short_desc_en: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Short Description (HI)</label>
              <textarea
                rows={2}
                value={formData.short_desc_hi}
                onChange={(e) => setFormData({...formData, short_desc_hi: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">{activeTab === 'products' ? 'Starting Price' : 'Estimated Fee'} (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_fee}
                onChange={(e) => setFormData({...formData, price_fee: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            {activeTab === 'products' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Unit (e.g. per 100)</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Sort Order</label>
              <input
                type="number"
                required
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {activeTab === 'products' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-medium text-slate-900 mb-3">Visibility & Status</h4>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-sm text-slate-700">Featured</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({...formData, is_popular: e.target.checked})}
                  className="rounded text-blue-500 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-sm text-slate-700">Popular</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.name_en}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
