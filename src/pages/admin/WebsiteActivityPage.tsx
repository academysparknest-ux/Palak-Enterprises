import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { cn } from '../../lib/utils';
import { 
  Activity, Clock, Tag, Edit3, IndianRupee, Box, 
  FileText, Image as ImageIcon, RefreshCw, User, 
  Search 
} from 'lucide-react';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  actor_name?: string;
  actor_role?: string;
}

export const WebsiteActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('audit_logs')
        .select('id, actor_id, action_type, entity_type, entity_id, user_email, user_id, details, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      if (dateRange !== 'all') {
        const now = new Date();
        let fromDate = new Date();
        if (dateRange === 'today') {
          fromDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          fromDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'month') {
          fromDate.setMonth(now.getMonth() - 1);
        }
        query = query.gte('created_at', fromDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedLogs: AuditLog[] = (data || []).map((log) => ({
        ...log,
        actor_name: log.details?.performed_by || (log.actor_id ? `Staff (${log.actor_id.substring(0, 6)})` : 'Admin User'),
        actor_role: log.details?.role || 'STAFF',
      }));

      setLogs(mappedLogs);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      addToast({ title: 'Error loading activity logs', message: err?.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, dateRange, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'price_change':
      case 'update_pricing':
      case 'update_quick_service_pricing':
        return <IndianRupee className="w-4 h-4 text-emerald-600" />;
      case 'create_product':
      case 'update_product':
      case 'delete_product':
      case 'create_service':
      case 'update_service':
      case 'delete_service':
        return <Box className="w-4 h-4 text-[#123B70]" />;
      case 'create_category':
      case 'update_category':
      case 'delete_category':
        return <Tag className="w-4 h-4 text-teal-600" />;
      case 'update_content':
      case 'update_website_content':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'upload_image':
      case 'replace_image':
      case 'remove_image_reference':
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      default:
        return <Edit3 className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatActionDescription = (log: AuditLog) => {
    const d = log.details || {};
    if (log.action_type === 'price_change' && (d.old_price !== undefined || d.previous_value !== undefined)) {
      const oldP = d.old_price ?? d.previous_value;
      const newP = d.new_price ?? d.new_value;
      return (
        <span>
          Price updated for <strong>{d.product_name || log.entity_id}</strong>:{' '}
          <span className="line-through text-slate-400">₹{oldP}</span> → <strong className="text-emerald-700">₹{newP}</strong>
        </span>
      );
    }
    if (log.action_type === 'replace_image') {
      return (
        <span>
          Replaced image on <strong>{d.source || log.entity_id}</strong>
        </span>
      );
    }
    if (log.action_type === 'remove_image_reference') {
      return (
        <span>
          Removed image reference from <strong>{d.source || log.entity_id}</strong>
        </span>
      );
    }
    if (d.description) {
      return <span>{d.description}</span>;
    }
    if (d.message) {
      return <span>{d.message}</span>;
    }
    return (
      <span>
        Performed <strong>{log.action_type.replace(/_/g, ' ')}</strong> on <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{log.entity_type}</code> ({log.entity_id || 'Global'})
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actorMatch = (log.actor_name || '').toLowerCase().includes(q);
    const entityMatch = (log.entity_id || '').toLowerCase().includes(q);
    const descMatch = JSON.stringify(log.details || {}).toLowerCase().includes(q);
    const actionMatch = log.action_type.toLowerCase().includes(q);
    return actorMatch || entityMatch || descMatch || actionMatch;
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader 
        title="Website Activity & Audit Trail" 
        subtitle="Immutable log of all administrative modifications, pricing changes, media uploads, and catalog updates"
        actions={
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin text-[#123B70]")} />
            <span>Refresh Logs</span>
          </button>
        }
      />

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Action Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="price_change">Price Changes</option>
              <option value="update_quick_service_pricing">Quick Service Rates</option>
              <option value="create_product">Product Created</option>
              <option value="update_product">Product Updated</option>
              <option value="delete_product">Product Deleted</option>
              <option value="upload_image">Image Uploaded</option>
              <option value="replace_image">Image Replaced</option>
              <option value="remove_image_reference">Image Removed</option>
              <option value="update_content">Content Updated</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Entity Target</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="product">Products</option>
              <option value="service">Digital Services</option>
              <option value="category">Categories</option>
              <option value="pricing">Pricing Engine</option>
              <option value="quick_service">Quick Services</option>
              <option value="photo">Photos & Media</option>
              <option value="content">Website Content</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Search Logs</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Product name, actor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#123B70]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Stream List */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100" />
                  <div className="space-y-1">
                    <div className="w-40 h-3 bg-slate-100 rounded" />
                    <div className="w-24 h-2 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="w-16 h-3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {formatActionDescription(log)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-2.5 h-2.5 text-slate-400" />
                        {log.actor_name}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[9px] text-slate-400">ID: {log.entity_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 flex items-center sm:flex-col gap-1.5 sm:gap-0.5 pl-9 sm:pl-0">
                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Logged
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14 text-slate-500 space-y-1.5">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-700">No activity records match your criteria</p>
            <p className="text-[10px] text-slate-400">Try changing your search keywords or adjusting the filter dates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteActivityPage;
