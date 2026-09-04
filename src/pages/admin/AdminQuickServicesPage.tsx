import React, { useState, useEffect } from 'react';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { cn, formatAdminErrorMessage } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from '../../config/printPricing';
import {
  getPrintPricingConfig,
  updatePrintPricingConfig,
  subscribeToPrintPricing,
  logAdminAudit,
  getQuickServices,
  toggleQuickServiceAvailability,
  toggleAllQuickServicesAvailability,
  subscribeToQuickServices,
  broadcastQuickServicesUpdate,
  type QuickServiceItem,
  DEFAULT_QUICK_SERVICES,
} from '../../lib/supabase/database';
import {
  FileText,
  Image as ImageIcon,
  CreditCard,
  Mail,
  BadgeCheck,
  Layout,
  Printer,
  ChevronDown,
  ChevronUp,
  Save,
  ExternalLink,
  IndianRupee,
  RefreshCw,
  Power,
  Play,
  Square,
  ShieldAlert,
  Clock,
  Info,
  Camera,
  Contact,
  Sparkles,
  Shield,
  BookOpen,
} from 'lucide-react';
import { AdminModal } from '../../components/admin/AdminModal';

interface ServiceDefinition {
  id: string;
  name: string;
  subtitle: string;
  path: string;
  icon: React.ElementType;
  configKey?: keyof PrintPricingConfig;
  status: 'active' | 'coming_soon' | 'custom';
}

const SERVICES: ServiceDefinition[] = [
  { id: 'document-printing', name: 'Document Printing', subtitle: 'Notes, assignments, reports & certificates', path: '/online-services/document-printing', icon: FileText, configKey: 'documentPrinting', status: 'active' },
  { id: 'passport-photo', name: 'Passport Photo', subtitle: '8, 16, 32 photo sheets & 4x6 single prints', path: '/online-services/passport-photo', icon: ImageIcon, configKey: 'passportPhoto', status: 'active' },
  { id: 'visiting-cards', name: 'Visiting Cards', subtitle: '100, 500, 1000 cards (Matte, Gloss, Velvet)', path: '/online-services/visiting-cards', icon: CreditCard, configKey: 'visitingCards', status: 'active' },
  { id: 'invitation-cards', name: 'Invitation Cards', subtitle: 'Weddings & ceremony invitations (Coming Soon)', path: '/online-services/invitation-cards', icon: Mail, status: 'coming_soon' },
  { id: 'id-cards', name: 'ID Cards', subtitle: 'PVC single/double sided with lanyard options', path: '/online-services/id-cards', icon: BadgeCheck, configKey: 'idCards', status: 'active' },
  { id: 'poster-banner', name: 'Poster & Flex Banner', subtitle: 'A4, A3, A2 glossy photo & vinyl flex per sq.ft', path: '/online-services/poster-banner', icon: Layout, configKey: 'posters', status: 'active' },
  { id: 'custom-print', name: 'Custom Print & Digital Service', subtitle: 'Custom print requests with instant inquiry quotes', path: '/online-services/custom-print', icon: Printer, status: 'custom' },
];

const PRESET_STOP_REASONS = [
  'Printer maintenance',
  'Out of paper / media stock',
  'Staff temporarily unavailable',
  'Machine calibration in progress',
  'High queue overload',
  'Service closed today',
];

const PRESET_BULK_STOP_REASONS = [
  'Store closed for today',
  'Emergency maintenance / repairs',
  'Staff meeting / training session',
  'Power or internet outage',
  'Heavy queue backlog clearance',
  'Holiday / Sunday closure',
];

export const AdminQuickServicesPage: React.FC = () => {
  const [config, setConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [initialConfig, setInitialConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>('document-printing');
  const { addToast } = useToast();
  const { user } = useAuth();

  // Quick Services Start / Stop Availability State
  const [quickServices, setQuickServices] = useState<QuickServiceItem[]>(DEFAULT_QUICK_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Dialog Modals State
  const [stopModalService, setStopModalService] = useState<QuickServiceItem | null>(null);
  const [startModalService, setStartModalService] = useState<QuickServiceItem | null>(null);
  const [selectedStopReason, setSelectedStopReason] = useState<string>('Printer maintenance');
  const [customStopReason, setCustomStopReason] = useState<string>('');

  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    setServicesLoading(true);
    try {
      const [liveConfig, liveServices] = await Promise.all([
        getPrintPricingConfig(),
        getQuickServices(true),
      ]);
      setConfig(liveConfig);
      setInitialConfig(liveConfig);
      setQuickServices(liveServices);
      broadcastQuickServicesUpdate(liveServices);
    } catch (err: any) {
      console.error('Error loading quick services data:', err);
      addToast({ type: 'error', title: 'Failed to load configuration' });
    } finally {
      setLoading(false);
      setServicesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAllData();
    // Subscribe to live realtime status changes across multiple staff sessions
    const unsubscribeServices = subscribeToQuickServices((fresh) => {
      setQuickServices(fresh);
    });
    // Subscribe to live realtime print pricing changes across multiple staff sessions & tabs
    const unsubscribePricing = subscribeToPrintPricing((freshPricing) => {
      setConfig(freshPricing);
      setInitialConfig(freshPricing);
    });

    return () => {
      unsubscribeServices();
      unsubscribePricing();
    };
  }, [loadAllData]);

  const handleOpenStopDialog = (service: QuickServiceItem) => {
    setStopModalService(service);
    setSelectedStopReason('Printer maintenance');
    setCustomStopReason('');
  };

  const handleConfirmStop = async () => {
    if (!stopModalService) return;
    const service = stopModalService;
    const finalReason = customStopReason.trim() || selectedStopReason;
    const actorName = user?.name || 'Admin';

    setActionInProgressId(service.id);
    setStopModalService(null);

    try {
      const result = await toggleQuickServiceAvailability(service.id, false, finalReason, actorName);
      if (result.success) {
        addToast({
          type: 'success',
          title: `Service Stopped`,
          message: `${service.name_en} is now STOPPED. New orders will be blocked.`,
        });
      } else {
        await getQuickServices().then(setQuickServices).catch(() => {});
        addToast({
          type: 'error',
          title: 'Unable to update service status',
          message: result.error || 'Please try again.',
        });
      }
    } catch (err: any) {
      await getQuickServices().then(setQuickServices).catch(() => {});
      addToast({
        type: 'error',
        title: 'Operation failed',
        message: err?.message || 'Failed to stop service',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleConfirmStart = async () => {
    if (!startModalService) return;
    const service = startModalService;
    const actorName = user?.name || 'Admin';

    setActionInProgressId(service.id);
    setStartModalService(null);

    try {
      const result = await toggleQuickServiceAvailability(service.id, true, undefined, actorName);
      if (result.success) {
        addToast({
          type: 'success',
          title: `Service Started`,
          message: `${service.name_en} is now ACTIVE and accepting orders.`,
        });
      } else {
        await getQuickServices().then(setQuickServices).catch(() => {});
        addToast({
          type: 'error',
          title: 'Unable to update service status',
          message: result.error || 'Please try again.',
        });
      }
    } catch (err: any) {
      await getQuickServices().then(setQuickServices).catch(() => {});
      addToast({
        type: 'error',
        title: 'Operation failed',
        message: err?.message || 'Failed to start service',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Bulk Start / Stop Dialog State
  const [bulkStopModalOpen, setBulkStopModalOpen] = useState<boolean>(false);
  const [bulkStartModalOpen, setBulkStartModalOpen] = useState<boolean>(false);
  const [bulkInProgress, setBulkInProgress] = useState<boolean>(false);
  const [bulkStopReason, setBulkStopReason] = useState<string>('Store closed for today');
  const [bulkCustomStopReason, setBulkCustomStopReason] = useState<string>('');

  const handleOpenBulkStopDialog = () => {
    setBulkStopReason('Store closed for today');
    setBulkCustomStopReason('');
    setBulkStopModalOpen(true);
  };

  const handleConfirmBulkStop = async () => {
    const finalReason = bulkCustomStopReason.trim() || bulkStopReason;
    const actorName = user?.name || 'Admin';

    setBulkInProgress(true);
    setBulkStopModalOpen(false);

    try {
      const result = await toggleAllQuickServicesAvailability(false, finalReason, actorName);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'All Quick Services Stopped',
          message: `All ${quickServices.length} quick services are now STOPPED. New orders are temporarily paused.`,
        });
      } else {
        await getQuickServices().then(setQuickServices).catch(() => {});
        addToast({
          type: 'error',
          title: 'Unable to stop all services',
          message: result.error || 'Please try again.',
        });
      }
    } catch (err: any) {
      await getQuickServices().then(setQuickServices).catch(() => {});
      addToast({
        type: 'error',
        title: 'Bulk operation failed',
        message: err?.message || 'Failed to stop all services',
      });
    } finally {
      setBulkInProgress(false);
    }
  };

  const handleConfirmBulkStart = async () => {
    const actorName = user?.name || 'Admin';

    setBulkInProgress(true);
    setBulkStartModalOpen(false);

    try {
      const result = await toggleAllQuickServicesAvailability(true, undefined, actorName);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'All Quick Services Started',
          message: `All ${quickServices.length} quick services are now ACTIVE and accepting online customer orders.`,
        });
      } else {
        await getQuickServices().then(setQuickServices).catch(() => {});
        addToast({
          type: 'error',
          title: 'Unable to start all services',
          message: result.error || 'Please try again.',
        });
      }
    } catch (err: any) {
      await getQuickServices().then(setQuickServices).catch(() => {});
      addToast({
        type: 'error',
        title: 'Bulk operation failed',
        message: err?.message || 'Failed to start all services',
      });
    } finally {
      setBulkInProgress(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await updatePrintPricingConfig(config);

      if (isSupabaseConfigured && supabase) {
        try {
          await logAdminAudit({
            actorId: user?.id,
            actorName: user?.name,
            actorRole: user?.role,
            actionType: 'update_quick_service_pricing',
            entityType: 'quick_service',
            entityId: 'print_pricing_config',
            details: {
              description: 'Updated authoritative quick services pricing tiers',
            },
            previousValue: initialConfig,
            newValue: config,
          });
        } catch (auditErr) {
          console.debug('Audit log notice:', auditErr);
        }
      }

      setInitialConfig(config);
      addToast({ type: 'success', title: 'Pricing configuration saved & published live!' });
    } catch (err: any) {
      console.error('Error saving quick services pricing config:', err);
      addToast({ type: 'error', title: 'Failed to save configuration', message: formatAdminErrorMessage(err, 'Unable to update quick services pricing.') });
    } finally {
      setSaving(false);
    }
  };

  const updateConfigValue = (path: string[], value: any) => {
    setConfig((prev) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current: any = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  const renderNumberInput = (label: string, path: string[], value: number, step = "0.5", min = 0, suffix = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <IndianRupee className="h-3 w-3 text-slate-400" />
        </div>
        <input
          type="number"
          min={min}
          step={step}
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            const rawVal = e.target.value;
            if (rawVal === '') {
              updateConfigValue(path, min);
              return;
            }
            const val = parseFloat(rawVal);
            if (isNaN(val)) {
              updateConfigValue(path, min);
            } else {
              const clamped = Math.max(min, Math.round((val + Number.EPSILON) * 100) / 100);
              updateConfigValue(path, clamped);
            }
          }}
          className="pl-7 pr-2.5 block w-full rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#123B70] focus:border-[#123B70] transition-colors"
        />
        {suffix && (
          <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[9px] text-slate-400 font-semibold pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  const renderToggle = (label: string, path: string[], value: boolean) => (
    <div className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-slate-50">
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => updateConfigValue(path, !value)}
        className={cn(
          "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
          value ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
            value ? "translate-x-3.5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );

  const getServiceIconComponent = (iconName?: string) => {
    switch (iconName) {
      case 'Camera': return Camera;
      case 'FileText': return FileText;
      case 'Printer': return Printer;
      case 'Shield': return Shield;
      case 'BookOpen': return BookOpen;
      case 'CreditCard': return CreditCard;
      case 'Contact': return Contact;
      case 'ImageIcon': return ImageIcon;
      case 'Sparkles': return Sparkles;
      default: return Printer;
    }
  };

  const primaryServices = quickServices.filter((s) => s.category === 'quick_service');
  const subServices = quickServices.filter((s) => s.category === 'sub_service');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quick Services & Pricing Manager"
        subtitle="Start/Stop services live and configure rates, paper sizes, and finishing options"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading || servicesLoading || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              title="Reload live status and pricing from database"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", (loading || servicesLoading) && "animate-spin text-[#123B70]")} />
              <span>Reload Live</span>
            </button>

            <button
              onClick={saveConfig}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save & Publish Pricing</span>
            </button>
          </div>
        }
      />

      {/* ===================================================================== */}
      {/* 1. QUICK SERVICES AVAILABILITY (START / STOP CONTROLS) */}
      {/* ===================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Power className="h-4 w-4 text-[#123B70]" />
              <span>Quick Services Availability (Start / Stop System)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which services are accepting new customer orders. Stopped services block new orders while preserving all existing orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Count Indicators */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{quickServices.filter((s) => s.is_active).length} Active</span>
              </span>
              {quickServices.filter((s) => !s.is_active).length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>{quickServices.filter((s) => !s.is_active).length} Stopped</span>
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Bulk Master Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkStartModalOpen(true)}
                disabled={bulkInProgress || quickServices.every((s) => s.is_active)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Start all quick services at once"
              >
                {bulkInProgress ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Start All</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBulkStopDialog}
                disabled={bulkInProgress || quickServices.every((s) => !s.is_active)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Stop all quick services at once"
              >
                {bulkInProgress ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Stop All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Quick Services Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Primary Quick Services
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {primaryServices.map((service) => {
              const ServiceIcon = getServiceIconComponent(service.icon_name);
              const isWorking = actionInProgressId === service.id;
              const isActive = service.is_active;

              return (
                <div
                  key={service.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3",
                    isActive
                      ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                      : "bg-rose-50/40 border-rose-200/80 shadow-xs"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl border shrink-0 mt-0.5",
                          isActive
                            ? "bg-blue-50 text-[#123B70] border-blue-200/60"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        )}
                      >
                        <ServiceIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {service.name_en}
                          </h4>
                          <span
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-rose-100 text-rose-900 border-rose-300 animate-pulse"
                            )}
                          >
                            {isActive ? "🟢 ACTIVE" : "🔴 STOPPED"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {service.description_en || service.name_hi}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stop Reason & Audit Info if Stopped */}
                  {!isActive && (
                    <div className="rounded-lg bg-white/80 border border-rose-200 p-2.5 text-xs text-rose-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Stop Reason: {service.stop_reason || "Temporarily unavailable"}</span>
                      </div>
                      {service.updated_by && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            Changed by {service.updated_by}{" "}
                            {service.updated_at ? `(${new Date(service.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Button Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: {service.id}
                    </span>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleOpenStopDialog(service)}
                        disabled={isWorking || bulkInProgress || actionInProgressId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      >
                        {isWorking ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Stopping...</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3 h-3 text-rose-600 fill-rose-600" />
                            <span>Stop Service</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStartModalService(service)}
                        disabled={isWorking || bulkInProgress || actionInProgressId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      >
                        {isWorking ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Starting...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-white" />
                            <span>Start Service</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Granular Sub-Services & Print Features */}
        {subServices.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Granular Print Features (Color, B&W, Lamination, Binding)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {subServices.map((service) => {
                const ServiceIcon = getServiceIconComponent(service.icon_name);
                const isWorking = actionInProgressId === service.id;
                const isActive = service.is_active;

                return (
                  <div
                    key={service.id}
                    className={cn(
                      "rounded-xl border p-3.5 transition-all duration-200 flex flex-col justify-between space-y-2.5",
                      isActive
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-rose-50/50 border-rose-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ServiceIcon className={cn("w-4 h-4", isActive ? "text-[#123B70]" : "text-rose-600")} />
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {service.name_en}
                        </h4>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md",
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        )}
                      >
                        {isActive ? "ACTIVE" : "STOPPED"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {service.description_en}
                    </p>

                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-end">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handleOpenStopDialog(service)}
                          disabled={isWorking || bulkInProgress || actionInProgressId !== null}
                          className="text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isWorking ? "Stopping..." : "Stop"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStartModalService(service)}
                          disabled={isWorking || bulkInProgress || actionInProgressId !== null}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isWorking ? "Starting..." : "Start"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. PRICING CONFIGURATION ACCORDIONS (PRESERVED) */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-[#123B70]" />
            <span>Authoritative Pricing Tiers & Finishing Rates</span>
          </h2>
          <span className="text-xs text-slate-500">Click any service to adjust rates</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SERVICES.map((service) => {
              const isExpanded = expandedService === service.id;
              const ServiceIcon = service.icon;

              return (
                <div
                  key={service.id}
                  className={cn(
                    "bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-xs",
                    isExpanded ? "border-[#123B70]/40 ring-2 ring-[#123B70]/5" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {/* Accordion Card Header */}
                  <div
                    onClick={() => setExpandedService(isExpanded ? null : service.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg border shrink-0",
                        service.status === 'coming_soon' ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-blue-50 text-[#123B70] border-blue-200/60"
                      )}>
                        <ServiceIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900">{service.name}</h3>
                          {service.status === 'active' && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Live
                            </span>
                          )}
                          {service.status === 'coming_soon' && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Coming Soon
                            </span>
                          )}
                          {service.status === 'custom' && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{service.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={service.path}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#123B70] hover:underline font-semibold px-2 py-1 rounded-md hover:bg-blue-50/50"
                      >
                        <span>Customer Form</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body Editor */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">
                      {service.id === 'document-printing' && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-2">Base Rates per Page (A4 Base)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                              {renderNumberInput("B&W Single Side", ["documentPrinting", "baseRatePerPage", "bwSingle"], config.documentPrinting.baseRatePerPage.bwSingle)}
                              {renderNumberInput("B&W Double Side (per side)", ["documentPrinting", "baseRatePerPage", "bwDouble"], config.documentPrinting.baseRatePerPage.bwDouble)}
                              {renderNumberInput("Color Single Side", ["documentPrinting", "baseRatePerPage", "colorSingle"], config.documentPrinting.baseRatePerPage.colorSingle)}
                              {renderNumberInput("Color Double Side (per side)", ["documentPrinting", "baseRatePerPage", "colorDouble"], config.documentPrinting.baseRatePerPage.colorDouble)}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-2">Paper Size Price Multipliers</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                              {renderNumberInput("A4 Multiplier (Standard)", ["documentPrinting", "paperSizes", "a4", "multiplier"], config.documentPrinting.paperSizes.a4.multiplier, "0.1", 0.1, "x")}
                              {renderNumberInput("A3 Multiplier (Large)", ["documentPrinting", "paperSizes", "a3", "multiplier"], config.documentPrinting.paperSizes.a3.multiplier, "0.1", 0.1, "x")}
                              {renderNumberInput("A5 Multiplier (Booklet)", ["documentPrinting", "paperSizes", "a5", "multiplier"], config.documentPrinting.paperSizes.a5.multiplier, "0.1", 0.1, "x")}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-2">Finishing & Binding Add-ons</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                              <div className="space-y-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                                {renderToggle("Spiral Binding", ["documentPrinting", "finishing", "spiralBinding", "enabled"], config.documentPrinting.finishing.spiralBinding.enabled)}
                                {renderNumberInput("Rate (per book)", ["documentPrinting", "finishing", "spiralBinding", "price"], config.documentPrinting.finishing.spiralBinding.price, "1", 0)}
                              </div>

                              <div className="space-y-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                                {renderToggle("Comb Binding", ["documentPrinting", "finishing", "combBinding", "enabled"], config.documentPrinting.finishing.combBinding.enabled)}
                                {renderNumberInput("Rate (per book)", ["documentPrinting", "finishing", "combBinding", "price"], config.documentPrinting.finishing.combBinding.price, "1", 0)}
                              </div>

                              <div className="space-y-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                                {renderToggle("Lamination", ["documentPrinting", "finishing", "lamination", "enabled"], config.documentPrinting.finishing.lamination.enabled)}
                                {renderNumberInput("Rate (per leaf)", ["documentPrinting", "finishing", "lamination", "pricePerPage"], config.documentPrinting.finishing.lamination.pricePerPage, "1", 0)}
                              </div>

                              <div className="space-y-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                                {renderToggle("Stapling", ["documentPrinting", "finishing", "stapling", "enabled"], config.documentPrinting.finishing.stapling.enabled)}
                                {renderNumberInput("Rate (per set)", ["documentPrinting", "finishing", "stapling", "price"], config.documentPrinting.finishing.stapling.price, "1", 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {service.id === 'passport-photo' && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 mb-2">Passport Photo Sheets & Prints Pricing</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                            {renderNumberInput("Single 4×6 Print", ["passportPhoto", "singlePrint"], config.passportPhoto.singlePrint, "1", 1)}
                            {renderNumberInput("8 Photo Sheet", ["passportPhoto", "sheet8"], config.passportPhoto.sheet8, "1", 1)}
                            {renderNumberInput("16 Photo Sheet", ["passportPhoto", "sheet16"], config.passportPhoto.sheet16, "1", 1)}
                            {renderNumberInput("32 Photo Sheet", ["passportPhoto", "sheet32"], config.passportPhoto.sheet32, "1", 1)}
                          </div>
                        </div>
                      )}

                      {service.id === 'visiting-cards' && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-2">Base Quantities (Single vs Double Sided)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                              {renderNumberInput("100 Cards (Single)", ["visitingCards", "base100Single"], config.visitingCards.base100Single, "10", 1)}
                              {renderNumberInput("100 Cards (Double)", ["visitingCards", "base100Double"], config.visitingCards.base100Double, "10", 1)}
                              {renderNumberInput("500 Cards (Single)", ["visitingCards", "base500Single"], config.visitingCards.base500Single, "10", 1)}
                              {renderNumberInput("500 Cards (Double)", ["visitingCards", "base500Double"], config.visitingCards.base500Double, "10", 1)}
                              {renderNumberInput("1000 Cards (Single)", ["visitingCards", "base1000Single"], config.visitingCards.base1000Single, "10", 1)}
                              {renderNumberInput("1000 Cards (Double)", ["visitingCards", "base1000Double"], config.visitingCards.base1000Double, "10", 1)}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-2">Paper Finishing Surcharges</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                              {renderNumberInput("Matte Finish Add-on", ["visitingCards", "matteFinishExtra"], config.visitingCards.matteFinishExtra, "5", 0)}
                              {renderNumberInput("Gloss Finish Add-on", ["visitingCards", "glossFinishExtra"], config.visitingCards.glossFinishExtra, "5", 0)}
                              {renderNumberInput("Velvet Finish Add-on", ["visitingCards", "velvetFinishExtra"], config.visitingCards.velvetFinishExtra, "5", 0)}
                            </div>
                          </div>
                        </div>
                      )}

                      {service.id === 'id-cards' && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 mb-2">PVC Smart ID Card Rates</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                            {renderNumberInput("PVC Single Sided", ["idCards", "pvcSingle"], config.idCards.pvcSingle, "5", 1)}
                            {renderNumberInput("PVC Double Sided", ["idCards", "pvcDouble"], config.idCards.pvcDouble, "5", 1)}
                            {renderNumberInput("Lanyard + Holder Extra", ["idCards", "withLanyardHolder"], config.idCards.withLanyardHolder, "5", 0)}
                          </div>
                        </div>
                      )}

                      {service.id === 'poster-banner' && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 mb-2">Posters & Vinyl Flex Rates</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                            {renderNumberInput("A4 Photo Sheet", ["posters", "a4Photo"], config.posters.a4Photo, "1", 1)}
                            {renderNumberInput("A3 Glossy Paper", ["posters", "a3Glossy"], config.posters.a3Glossy, "1", 1)}
                            {renderNumberInput("A2 Photo Sheet", ["posters", "a2Photo"], config.posters.a2Photo, "1", 1)}
                            {renderNumberInput("Vinyl Flex (per sq.ft)", ["posters", "vinylPerSqFt"], config.posters.vinylPerSqFt, "1", 1)}
                            {renderNumberInput("Regular Flex (per sq.ft)", ["posters", "flexPerSqFt"], config.posters.flexPerSqFt, "1", 1)}
                          </div>
                        </div>
                      )}

                      {service.id === 'invitation-cards' && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                          <p className="font-bold text-slate-900">Custom Invitation Catalog</p>
                          <p>
                            Weddings and ceremony invitations are priced dynamically based on card quantity, paper stock, and foil stamping requirements.
                          </p>
                        </div>
                      )}

                      {service.id === 'custom-print' && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                          <p className="font-bold text-slate-900">Custom Quote Engine</p>
                          <p>
                            Customers submit custom specifications (booklets, bill books, pamphlets, stickers) and receive immediate review from the Palak ERP counter.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. CONFIRM STOP SERVICE MODAL */}
      {/* ===================================================================== */}
      {stopModalService && (
        <AdminModal
          isOpen={Boolean(stopModalService)}
          onClose={() => setStopModalService(null)}
          title=""
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Stop {stopModalService.name_en}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Customers will no longer be able to place new orders for this service.
                </p>
              </div>
            </div>

            {/* Existing Orders Safe Badge */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <strong className="block font-bold">Existing Orders Unaffected</strong>
                All existing confirmed and completed orders remain active and safe in the ERP. Only future submissions are blocked.
              </div>
            </div>

            {/* Select Stop Reason */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                Select Reason for Stopping (Optional):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_STOP_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedStopReason(r);
                      setCustomStopReason('');
                    }}
                    className={cn(
                      "text-left px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                      selectedStopReason === r && !customStopReason
                        ? "bg-[#123B70] text-white border-[#123B70]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Or enter custom stop reason..."
                  value={customStopReason}
                  onChange={(e) => setCustomStopReason(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#123B70] focus:border-[#123B70]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStopModalService(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStop}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Confirm & Stop Service</span>
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ===================================================================== */}
      {/* 4. CONFIRM START SERVICE MODAL */}
      {/* ===================================================================== */}
      {startModalService && (
        <AdminModal
          isOpen={Boolean(startModalService)}
          onClose={() => setStartModalService(null)}
          title=""
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 fill-emerald-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Start {startModalService.name_en}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Customers will immediately be able to place new orders for this service across the website.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStartModalService(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStart}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Confirm & Start Service</span>
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ===================================================================== */}
      {/* 5. CONFIRM STOP ALL QUICK SERVICES MODAL */}
      {/* ===================================================================== */}
      {bulkStopModalOpen && (
        <AdminModal
          isOpen={bulkStopModalOpen}
          onClose={() => setBulkStopModalOpen(false)}
          title=""
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Square className="h-5 w-5 fill-rose-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Stop All Quick Services ({quickServices.length} Services)?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Customers will no longer be able to place new online orders for any quick service.
                </p>
              </div>
            </div>

            {/* Existing Orders Safe Badge */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <strong className="block font-bold">Existing Orders Safe & Unaffected</strong>
                All existing confirmed and completed orders remain completely intact. Only new submissions are stopped.
              </div>
            </div>

            {/* Select Bulk Stop Reason */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                Select Reason for Stopping All Services:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_BULK_STOP_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setBulkStopReason(r);
                      setBulkCustomStopReason('');
                    }}
                    className={cn(
                      "text-left px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                      bulkStopReason === r && !bulkCustomStopReason
                        ? "bg-[#123B70] text-white border-[#123B70]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Or enter custom reason for stopping all services..."
                  value={bulkCustomStopReason}
                  onChange={(e) => setBulkCustomStopReason(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#123B70] focus:border-[#123B70]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkStopModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkStop}
                disabled={bulkInProgress}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                {bulkInProgress ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Confirm & Stop All Services</span>
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* ===================================================================== */}
      {/* 6. CONFIRM START ALL QUICK SERVICES MODAL */}
      {/* ===================================================================== */}
      {bulkStartModalOpen && (
        <AdminModal
          isOpen={bulkStartModalOpen}
          onClose={() => setBulkStartModalOpen(false)}
          title=""
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 fill-emerald-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Start All Quick Services ({quickServices.length} Services)?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  All quick services will be activated immediately and customers will be able to place new print orders across the website.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkStartModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkStart}
                disabled={bulkInProgress}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                {bulkInProgress ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Confirm & Start All Services</span>
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminQuickServicesPage;
