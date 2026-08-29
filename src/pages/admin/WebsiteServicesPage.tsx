import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { PalakDataStore } from '../../lib/storage/store';

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

  // Debounced rapid toggle coordinator (prevents request storms while keeping 0ms optimistic UI)
  const pendingTogglesRef = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; baselineValue: boolean; latestValue: boolean }>>(new Map());

  useEffect(() => {
    return () => {
      pendingTogglesRef.current.forEach((entry) => clearTimeout(entry.timer));
      pendingTogglesRef.current.clear();
    };
  }, []);

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
    // 1. Instantly load local data so everything is visible
    const localProds = PalakDataStore.getProducts().map((p) => ({
      id: p.id,
      slug: p.slug,
      category_id: p.categoryId,
      name_en: p.name.en,
      name_hi: p.name.hi || null,
      short_desc_en: p.shortDesc?.en || null,
      short_desc_hi: p.shortDesc?.hi || null,
      description_en: p.description?.en || null,
      description_hi: p.description?.hi || null,
      is_featured: Boolean(p.isFeatured),
      is_popular: Boolean(p.isPopular),
      is_active: true,
      tags: p.tags || [],
      sort_order: 0,
      starting_price: p.startingPrice,
      base_quantity: p.baseQuantity,
      unit: p.unit,
      image_url: p.imageUrl,
      gallery_urls: p.galleryUrls || [],
      is_new: Boolean(p.isNew),
      turnaround_time_en: p.turnaroundTime?.en || null,
      turnaround_time_hi: p.turnaroundTime?.hi || null,
    }));

    const localServs = PalakDataStore.getDigitalServices().map((s) => ({
      id: s.id,
      slug: s.slug,
      category_id: s.categoryId,
      name_en: s.name.en,
      name_hi: s.name.hi || null,
      short_desc_en: s.shortDesc?.en || null,
      short_desc_hi: s.shortDesc?.hi || null,
      description_en: s.description?.en || null,
      description_hi: s.description?.hi || null,
      is_featured: Boolean(s.isFeatured),
      is_popular: Boolean(s.isPopular),
      is_active: true,
      tags: s.tags || [],
      sort_order: 0,
      estimated_fee: s.estimatedFee,
      processing_time_en: s.processingTime?.en || null,
      processing_time_hi: s.processingTime?.hi || null,
      icon_name: s.iconName || 'FileCheck',
    }));

    const localCats = PalakDataStore.getCategories().map((c) => ({
      id: c.id,
      slug: c.id,
      name_en: c.name.en,
      name_hi: c.name.hi || null,
      category_type: c.categoryType,
      is_active: true,
    }));

    setProducts(localProds);
    setServices(localServs);
    setCategories(localCats);
    setIsLoading(false);

    // 2. Fetch Supabase updates in background if available
    if (isSupabaseConfigured && supabase) {
      try {
        const [productsRes, servicesRes, categoriesRes] = await Promise.all([
          supabase.from('products').select('id, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, starting_price, price_unit_en, price_unit_hi, image_url, gallery_urls, is_active, is_featured, badge_en, badge_hi, turnaround_en, turnaround_hi, min_quantity, slug, sort_order, updated_at').order('sort_order', { ascending: true }),
          supabase.from('services').select('id, category_id, name_en, name_hi, short_desc_en, short_desc_hi, description_en, description_hi, estimated_fee, processing_time_en, processing_time_hi, required_documents_en, required_documents_hi, who_needs_it_en, who_needs_it_hi, is_active, is_popular, icon_name, slug, sort_order, updated_at').order('sort_order', { ascending: true }),
          supabase.from('categories').select('id, name_en, name_hi, description_en, description_hi, icon_name, category_type, badge_en, badge_hi, sort_order, is_active, updated_at').order('name_en', { ascending: true })
        ]);

        if (productsRes.data && productsRes.data.length > 0) {
          const map = new Map<string, Product>();
          localProds.forEach((p) => map.set(p.id, p));
          ((productsRes.data as unknown) as Product[]).forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
          setProducts(Array.from(map.values()));
        }

        if (servicesRes.data && servicesRes.data.length > 0) {
          const map = new Map<string, Service>();
          localServs.forEach((s) => map.set(s.id, s));
          ((servicesRes.data as unknown) as Service[]).forEach((s) => map.set(s.id, { ...map.get(s.id), ...s }));
          setServices(Array.from(map.values()));
        }

        if (categoriesRes.data && categoriesRes.data.length > 0) {
          const map = new Map<string, Category>();
          localCats.forEach((c) => map.set(c.id, c));
          ((categoriesRes.data as unknown) as Category[]).forEach((c) => map.set(c.id, { ...map.get(c.id), ...c }));
          setCategories(Array.from(map.values()));
        }
      } catch (error: any) {
        console.debug('Background data sync notice:', error);
      }
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
    setIsSaving(true);
    const tableName = activeTab === 'products' ? 'products' : 'services';
    const isNew = !editingItem;
    
    try {
      const priceVal = formData.price_fee ? parseFloat(formData.price_fee) : 0;
      
      const payload: any = {
        id: formData.id,
        slug: formData.slug || generateSlug(formData.name_en),
        category_id: formData.category_id || (activeTab === 'products' ? 'general-printing' : 'government-services'),
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
        payload.unit = formData.unit || 'Pcs';
        payload.image_url = formData.image_url || '/images/gallery/visiting-cards-sample.svg';

        // 1. Immediately persist to PalakDataStore
        PalakDataStore.updateProduct(payload.id, {
          id: payload.id,
          slug: payload.slug,
          categoryId: payload.category_id,
          categoryType: 'printing',
          name: { en: payload.name_en, hi: payload.name_hi || payload.name_en },
          shortDesc: { en: payload.short_desc_en || '', hi: payload.short_desc_hi || '' },
          description: { en: payload.description_en || '', hi: payload.description_hi || '' },
          startingPrice: priceVal,
          baseQuantity: 1,
          unit: payload.unit,
          imageUrl: payload.image_url,
          galleryUrls: [],
          turnaroundTime: { en: '24-48 Hours', hi: '24-48 घंटे' },
          tags: [],
          options: [],
          specifications: {},
          isFeatured: payload.is_featured,
          isPopular: payload.is_popular,
        });
      } else {
        payload.estimated_fee = priceVal;

        // 1. Immediately persist to PalakDataStore
        PalakDataStore.updateService(payload.id, {
          id: payload.id,
          slug: payload.slug,
          categoryId: payload.category_id,
          name: { en: payload.name_en, hi: payload.name_hi || payload.name_en },
          shortDesc: { en: payload.short_desc_en || '', hi: payload.short_desc_hi || '' },
          description: { en: payload.description_en || '', hi: payload.description_hi || '' },
          estimatedFee: priceVal,
          processingTime: { en: '1-3 Days', hi: '1-3 दिन' },
          requiredDocuments: [],
          iconName: 'FileCheck',
          isFeatured: payload.is_featured,
          isPopular: payload.is_popular,
          tags: [],
        });
      }

      // 2. Sync to Supabase in background
      if (isSupabaseConfigured && supabase) {
        try {
          if (isNew) {
            payload.created_at = new Date().toISOString();
            await supabase.from(tableName).insert([payload]);
            await logAudit('INSERT', tableName, payload.id);
          } else {
            await supabase.from(tableName).update(payload).eq('id', payload.id);
            await logAudit('UPDATE', tableName, payload.id);
          }
        } catch (cloudErr) {
          console.warn('Supabase cloud save note (saved locally):', cloudErr);
        }
      }

      addToast({ type: 'success', title: `${activeTab === 'products' ? 'Product' : 'Service'} saved & published live!` });
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
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    const tableName = activeTab === 'products' ? 'products' : 'services';
    
    try {
      // 1. Immediately remove from local store
      if (activeTab === 'products') {
        PalakDataStore.deleteProduct(itemToDelete.id);
      } else {
        PalakDataStore.deleteService(itemToDelete.id);
      }

      // 2. Cloud delete
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from(tableName).delete().eq('id', itemToDelete.id);
          await logAudit('DELETE', tableName, itemToDelete.id);
        } catch (cloudErr) {
          console.warn('Supabase cloud delete note:', cloudErr);
        }
      }
      
      addToast({ type: 'success', title: 'Item deleted successfully' });
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      addToast({ type: 'error', title: 'Failed to delete', message: formatAdminErrorMessage(error, 'Unable to delete item.') });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleToggleable = (item: Product | Service, field: keyof ItemBase) => {
    const tableName = activeTab === 'products' ? 'products' : 'services';
    const toggleKey = `${tableName}:${item.id}:${String(field)}`;
    
    const existingPending = pendingTogglesRef.current.get(toggleKey);
    const baselineValue = existingPending ? existingPending.baselineValue : Boolean(item[field]);
    const currentDisplayedValue = Boolean(item[field]);
    const newValue = !currentDisplayedValue;

    // 1. Instant local optimistic update
    if (activeTab === 'products') {
      PalakDataStore.updateProduct(item.id, { [field]: newValue } as any);
      setProducts(prev => prev.map(p => p.id === item.id ? { ...p, [field]: newValue } : p));
    } else {
      PalakDataStore.updateService(item.id, { [field]: newValue } as any);
      setServices(prev => prev.map(s => s.id === item.id ? { ...s, [field]: newValue } : s));
    }

    // 2. Debounce cloud update by 350ms to prevent request storms from rapid clicking
    if (existingPending) {
      clearTimeout(existingPending.timer);
    }

    if (!isSupabaseConfigured || !supabase) {
      addToast({ type: 'success', title: 'Updated locally' });
      return;
    }

    const client = supabase;
    const timer = setTimeout(async () => {
      pendingTogglesRef.current.delete(toggleKey);
      try {
        const { error } = await client
          .from(tableName)
          .update({ [field]: newValue, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) throw error;
        await logAudit('UPDATE', tableName, item.id);
        addToast({ type: 'success', title: 'Updated successfully' });
      } catch (cloudErr) {
        console.warn('Supabase toggle update note:', cloudErr);
        // Rollback to baseline on error
        if (activeTab === 'products') {
          PalakDataStore.updateProduct(item.id, { [field]: baselineValue } as any);
          setProducts(prev => prev.map(p => p.id === item.id ? { ...p, [field]: baselineValue } : p));
        } else {
          PalakDataStore.updateService(item.id, { [field]: baselineValue } as any);
          setServices(prev => prev.map(s => s.id === item.id ? { ...s, [field]: baselineValue } : s));
        }
        addToast({ type: 'error', title: 'Failed to update, changes reverted' });
      }
    }, 350);

    pendingTogglesRef.current.set(toggleKey, {
      timer,
      baselineValue,
      latestValue: newValue,
    });
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name_en : 'Unknown';
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Products & Services" 
        subtitle="Manage website offerings, pricing, and visibility"
        actions={
          <button
            onClick={openAddModal}
            className="bg-[#123B70] hover:bg-[#0c274c] text-white px-3 py-1.5 rounded-lg flex items-center text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add {activeTab === 'products' ? 'Product' : 'Service'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('products')}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-colors border-b-2 cursor-pointer",
            activeTab === 'products' 
              ? "border-[#123B70] text-[#123B70]" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-colors border-b-2 cursor-pointer",
            activeTab === 'services' 
              ? "border-[#123B70] text-[#123B70]" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          Digital Services
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70] text-xs"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex items-center space-x-1.5">
            <Filter className="text-slate-400 w-3.5 h-3.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
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
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap admin-table">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-3.5 py-2">Name (EN)</th>
                <th className="px-3.5 py-2">Category</th>
                <th className="px-3.5 py-2">{activeTab === 'products' ? 'Price' : 'Fee'}</th>
                <th className="px-3.5 py-2">Active</th>
                <th className="px-3.5 py-2">Featured</th>
                <th className="px-3.5 py-2">Popular</th>
                <th className="px-3.5 py-2 text-center">Sort</th>
                <th className="px-3.5 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#123B70]/20 border-t-[#123B70] rounded-full animate-spin mb-2" />
                      Loading data...
                    </div>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-slate-500">
                    No {activeTab} found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2">
                      <div className="font-semibold text-slate-900">{item.name_en}</div>
                      {item.name_hi && <div className="text-[10px] text-slate-500">{item.name_hi}</div>}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800">
                        {getCategoryName(item.category_id)}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-slate-600 font-mono font-bold">
                      {activeTab === 'products' 
                        ? ((item as Product).starting_price ? `₹${(item as Product).starting_price}` : '-')
                        : ((item as Service).estimated_fee ? `₹${(item as Service).estimated_fee}` : '-')}
                    </td>
                    <td className="px-3.5 py-2">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_active')}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                          item.is_active ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform shadow-xs",
                          item.is_active ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-3.5 py-2">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_featured')}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                          item.is_featured ? "bg-amber-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform shadow-xs",
                          item.is_featured ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-3.5 py-2">
                      <button 
                        onClick={() => toggleToggleable(item, 'is_popular')}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                          item.is_popular ? "bg-blue-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform shadow-xs",
                          item.is_popular ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </td>
                    <td className="px-3.5 py-2 text-center font-mono text-slate-600 text-xs">
                      {item.sort_order}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="flex justify-end space-x-1">
                        <a
                          href={`/${activeTab === 'products' ? 'printing' : 'digital-services'}/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Preview"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Name (English) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name_en}
                onChange={handleNameChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Name (Hindi)</label>
              <input
                type="text"
                value={formData.name_hi}
                onChange={(e) => setFormData({...formData, name_hi: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Slug (URL) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Category <span className="text-rose-500">*</span></label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
              >
                <option value="" disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name_en}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Short Description (EN)</label>
              <textarea
                rows={2}
                value={formData.short_desc_en}
                onChange={(e) => setFormData({...formData, short_desc_en: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 resize-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Short Description (HI)</label>
              <textarea
                rows={2}
                value={formData.short_desc_hi}
                onChange={(e) => setFormData({...formData, short_desc_hi: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">{activeTab === 'products' ? 'Starting Price' : 'Estimated Fee'} (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_fee}
                onChange={(e) => setFormData({...formData, price_fee: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
              />
            </div>
            
            {activeTab === 'products' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Unit (e.g. per 100)</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Sort Order</label>
              <input
                type="number"
                required
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
              />
            </div>
          </div>

          {activeTab === 'products' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Visibility & Status</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded text-[#123B70] focus:ring-[#123B70] w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-700 font-medium">Active</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                  className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-700 font-medium">Featured</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({...formData, is_popular: e.target.checked})}
                  className="rounded text-blue-500 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-700 font-medium">Popular</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#123B70] hover:bg-[#0c274c] rounded-lg transition-colors flex items-center cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1.5" />
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
