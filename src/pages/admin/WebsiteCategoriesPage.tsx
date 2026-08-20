import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminModal } from '../../components/admin/AdminModal';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/AdminToast';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { logAdminAudit } from '../../lib/supabase/database';
import { cn, formatAdminErrorMessage } from '../../lib/utils';
import { Plus, Edit2, Trash2, ArrowUpDown } from 'lucide-react';

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  icon_name: string;
  category_type: string;
  badge_en: string | null;
  badge_hi: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
  service_count?: number;
}

export const WebsiteCategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name_en: '',
    name_hi: '',
    slug: '',
    category_type: 'printing',
    icon_name: 'Printer',
    sort_order: 0,
    is_active: true
  });

  const fetchCategories = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const client = supabase;
      if (!client) {
        setLoading(false);
        return;
      }

      const { data: catData, error: catError } = await client
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;

      // In a real app we'd fetch counts from products/services table
      const enrichedCategories = await Promise.all((catData || []).map(async (cat) => {
        const { count: pCount } = await client
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
          
        const { count: sCount } = await client
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
          
        return {
          ...cat,
          product_count: pCount || 0,
          service_count: sCount || 0
        };
      }));

      setCategories(enrichedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      addToast({ type: 'error', title: 'Failed to load categories' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name_en: category.name_en,
        name_hi: category.name_hi || '',
        slug: category.slug,
        category_type: category.category_type,
        icon_name: category.icon_name,
        sort_order: category.sort_order,
        is_active: category.is_active
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name_en: '',
        name_hi: '',
        slug: '',
        category_type: 'printing',
        icon_name: 'Printer',
        sort_order: categories.length,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;

    try {
      let savedCategory;
      if (editingCategory) {
        const { data, error } = await supabase
          .from('categories')
          .update({
            name_en: formData.name_en,
            name_hi: formData.name_hi,
            slug: formData.slug,
            category_type: formData.category_type,
            icon_name: formData.icon_name,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)
          .select()
          .single();
          
        if (error) throw error;
        savedCategory = data;
        
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'update_category',
          details: { category_id: editingCategory.id, name: formData.name_en }
        });
        
        addToast({ type: 'success', title: 'Category updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            id: formData.slug || formData.name_en.toLowerCase().replace(/\s+/g, '-'),
            name_en: formData.name_en,
            name_hi: formData.name_hi,
            slug: formData.slug || formData.name_en.toLowerCase().replace(/\s+/g, '-'),
            category_type: formData.category_type,
            icon_name: formData.icon_name,
            sort_order: formData.sort_order,
            is_active: formData.is_active
          })
          .select()
          .single();
          
        if (error) throw error;
        savedCategory = data;
        
        await logAdminAudit({
          actorId: user?.id,
          actorName: user?.name,
          actorRole: user?.role,
          actionType: 'create_category',
          entityType: 'category',
          entityId: savedCategory.id,
          details: { name: formData.name_en, slug: formData.slug },
          newValue: formData,
        });
        
        addToast({ type: 'success', title: 'Category created successfully' });
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      addToast({ type: 'error', title: 'Failed to save category', message: formatAdminErrorMessage(error, 'Unable to save category. Please try again.') });
    }
  };

  const handleDeleteRequest = (category: Category) => {
    if ((category.product_count || 0) > 0 || (category.service_count || 0) > 0) {
      addToast({ 
        type: 'error', 
        title: 'Category in Use', 
        message: 'This category cannot be deleted because active products or services are assigned to it. Please reassign them first.' 
      });
      return;
    }
    setCategoryToDelete(category);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !isSupabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      await logAdminAudit({
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        actionType: 'delete_category',
        entityType: 'category',
        entityId: categoryToDelete.id,
        details: { name: categoryToDelete.name_en },
        previousValue: categoryToDelete,
      });

      addToast({ type: 'success', title: 'Category deleted successfully' });
      setIsConfirmDeleteOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      addToast({ type: 'error', title: 'Failed to delete category', message: formatAdminErrorMessage(error, 'Unable to delete category. Only Administrators can delete unused categories.') });
    }
  };

  const handleToggleActive = async (category: Category) => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'toggle_category_status',
        details: { category_id: category.id, is_active: !category.is_active }
      });

      addToast({ type: 'success', title: 'Category status updated' });
      fetchCategories();
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to update category status' });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Category Management" 
        subtitle="Manage product and service categories"
      />

      <div className="flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#123B70] text-white px-4 py-2 rounded-xl hover:bg-[#123B70]/90 transition-colors"
        >
          <Plus size={18} />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="p-4 font-medium">Category Name (EN/HI)</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium text-center">Products</th>
                <th className="p-4 font-medium text-center">Services</th>
                <th className="p-4 font-medium text-center">Sort Order</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No categories found.</td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{cat.name_en}</div>
                      {cat.name_hi && <div className="text-xs text-slate-500">{cat.name_hi}</div>}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-600 capitalize">{cat.category_type}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">
                        {cat.product_count}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">
                        {cat.service_count}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center text-slate-600 text-sm">
                        <ArrowUpDown size={14} className="mr-1" />
                        {cat.sort_order}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleActive(cat)}>
                        <StatusBadge 
                          status={cat.is_active ? 'Active' : 'Inactive'} 
                          variant={cat.is_active ? 'success' : 'danger'}
                        />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(cat)}
                          className="p-1.5 text-slate-400 hover:text-[#123B70] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(cat)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            (cat.product_count || 0) > 0 || (cat.service_count || 0) > 0
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                          )}
                          title="Delete"
                          disabled={(cat.product_count || 0) > 0 || (cat.service_count || 0) > 0}
                        >
                          <Trash2 size={18} />
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

      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name (English) *</label>
              <input
                type="text"
                required
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name (Hindi)</label>
              <input
                type="text"
                value={formData.name_hi}
                onChange={(e) => setFormData({ ...formData, name_hi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Slug (URL identifier)</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Auto-generated if left empty"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Category Type *</label>
              <select
                required
                value={formData.category_type}
                onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
              >
                <option value="printing">Printing</option>
                <option value="digital">Digital</option>
                <option value="business">Business</option>
                <option value="wedding">Wedding</option>
                <option value="design">Design</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Icon Name</label>
              <input
                type="text"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 focus:border-[#123B70]"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#123B70] border-slate-300 rounded focus:ring-[#123B70]"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Active Category
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#123B70] text-white rounded-xl hover:bg-[#123B70]/90 transition-colors font-medium"
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name_en}"? This action cannot be undone.`}
        confirmText="Delete Category"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};
