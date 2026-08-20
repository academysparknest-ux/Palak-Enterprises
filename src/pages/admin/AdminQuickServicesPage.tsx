import React, { useState, useEffect } from 'react';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useToast } from '../../components/admin/AdminToast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { cn, formatAdminErrorMessage } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_PRINT_PRICING, type PrintPricingConfig } from '../../config/printPricing';
import { getPrintPricingConfig, updatePrintPricingConfig, logAdminAudit } from '../../lib/supabase/database';
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
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

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

export const AdminQuickServicesPage: React.FC = () => {
  const [config, setConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [initialConfig, setInitialConfig] = useState<PrintPricingConfig>(DEFAULT_PRINT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>('document-printing');
  const { addToast } = useToast();
  const { user } = useAuth();

  const loadConfig = async () => {
    setLoading(true);
    try {
      const liveConfig = await getPrintPricingConfig();
      setConfig(liveConfig);
      setInitialConfig(liveConfig);
    } catch (err: any) {
      console.error('Error loading quick services pricing config:', err);
      addToast({ type: 'error', title: 'Failed to load pricing configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

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
            const val = parseFloat(e.target.value);
            updateConfigValue(path, isNaN(val) ? 0 : Math.max(min, val));
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

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Quick Services & Pricing Manager"
        subtitle="Manage rates, paper multipliers, and finishing options for the 7 Instant Online Services"
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadConfig}
              disabled={loading || saving}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              title="Reload pricing from database"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin text-[#123B70]")} />
              <span>Reload</span>
            </button>

            <button
              onClick={saveConfig}
              disabled={saving || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save & Publish Live</span>
            </button>
          </div>
        }
      />

      {/* Overview Info Banner */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-[#123B70] flex items-start gap-2.5 shadow-xs">
        <AlertCircle className="w-3.5 h-3.5 text-[#123B70] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-xs">Live Synchronized Online Service Engine</p>
          <p className="text-slate-600 text-[10px]">
            Every change made here updates customer-facing forms in real-time. Decimal values and finishing toggles are strictly validated.
          </p>
        </div>
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
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[#123B70] hover:underline px-2 py-0.5 rounded hover:bg-slate-100"
                    >
                      <span>Preview Form</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <div className="p-0.5 rounded text-slate-400 bg-slate-50 border border-slate-200">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Settings Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-4.5 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {/* Document Printing Configuration */}
                    {service.id === 'document-printing' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                            1. Base Page Rates (₹ per leaf / page)
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                            {renderNumberInput('B&W Single Side', ['documentPrinting', 'baseRatePerPage', 'bwSingle'], config.documentPrinting?.baseRatePerPage?.bwSingle || 2.0, "0.25", 0.5, "per leaf")}
                            {renderNumberInput('B&W Double Side', ['documentPrinting', 'baseRatePerPage', 'bwDouble'], config.documentPrinting?.baseRatePerPage?.bwDouble || 1.5, "0.25", 0.5, "per side")}
                            {renderNumberInput('Color Single Side', ['documentPrinting', 'baseRatePerPage', 'colorSingle'], config.documentPrinting?.baseRatePerPage?.colorSingle || 10.0, "0.5", 1.0, "per leaf")}
                            {renderNumberInput('Color Double Side', ['documentPrinting', 'baseRatePerPage', 'colorDouble'], config.documentPrinting?.baseRatePerPage?.colorDouble || 9.0, "0.5", 1.0, "per side")}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                            2. Paper Size Multipliers & Availability
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Enable A4 (Standard)', ['documentPrinting', 'paperSizes', 'a4', 'enabled'], config.documentPrinting?.paperSizes?.a4?.enabled ?? true)}
                              {renderNumberInput('A4 Price Multiplier', ['documentPrinting', 'paperSizes', 'a4', 'multiplier'], config.documentPrinting?.paperSizes?.a4?.multiplier || 1.0, "0.1", 0.1, "x rate")}
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Enable A3 (Large 297x420)', ['documentPrinting', 'paperSizes', 'a3', 'enabled'], config.documentPrinting?.paperSizes?.a3?.enabled ?? true)}
                              {renderNumberInput('A3 Price Multiplier', ['documentPrinting', 'paperSizes', 'a3', 'multiplier'], config.documentPrinting?.paperSizes?.a3?.multiplier || 2.0, "0.1", 0.1, "x rate")}
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Enable A5 (Booklet)', ['documentPrinting', 'paperSizes', 'a5', 'enabled'], config.documentPrinting?.paperSizes?.a5?.enabled ?? true)}
                              {renderNumberInput('A5 Price Multiplier', ['documentPrinting', 'paperSizes', 'a5', 'multiplier'], config.documentPrinting?.paperSizes?.a5?.multiplier || 0.75, "0.05", 0.1, "x rate")}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                            3. Document Finishing & Binding Addons
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Spiral Binding', ['documentPrinting', 'finishing', 'spiralBinding', 'enabled'], config.documentPrinting?.finishing?.spiralBinding?.enabled ?? true)}
                              {renderNumberInput('Spiral Fee (₹)', ['documentPrinting', 'finishing', 'spiralBinding', 'price'], config.documentPrinting?.finishing?.spiralBinding?.price || 30, "1", 0, "flat")}
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Comb Binding', ['documentPrinting', 'finishing', 'combBinding', 'enabled'], config.documentPrinting?.finishing?.combBinding?.enabled ?? true)}
                              {renderNumberInput('Comb Fee (₹)', ['documentPrinting', 'finishing', 'combBinding', 'price'], config.documentPrinting?.finishing?.combBinding?.price || 25, "1", 0, "flat")}
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Thermal Lamination', ['documentPrinting', 'finishing', 'lamination', 'enabled'], config.documentPrinting?.finishing?.lamination?.enabled ?? true)}
                              {renderNumberInput('Lamination Fee (₹/page)', ['documentPrinting', 'finishing', 'lamination', 'pricePerPage'], config.documentPrinting?.finishing?.lamination?.pricePerPage || 15, "1", 0, "/page")}
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              {renderToggle('Stapling', ['documentPrinting', 'finishing', 'stapling', 'enabled'], config.documentPrinting?.finishing?.stapling?.enabled ?? true)}
                              {renderNumberInput('Stapling Fee (₹)', ['documentPrinting', 'finishing', 'stapling', 'price'], config.documentPrinting?.finishing?.stapling?.price || 5, "1", 0, "flat")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Passport Photo Configuration */}
                    {service.id === 'passport-photo' && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                          Passport Photo Layout Packages (₹)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                          {renderNumberInput('8 Photos Sheet', ['passportPhoto', 'sheet8'], config.passportPhoto?.sheet8 || 50, "5", 0)}
                          {renderNumberInput('16 Photos (2 Sheets)', ['passportPhoto', 'sheet16'], config.passportPhoto?.sheet16 || 90, "5", 0)}
                          {renderNumberInput('32 Photos (Bulk)', ['passportPhoto', 'sheet32'], config.passportPhoto?.sheet32 || 160, "10", 0)}
                          {renderNumberInput('4x6 Single Print', ['passportPhoto', 'singlePrint'], config.passportPhoto?.singlePrint || 20, "5", 0)}
                        </div>
                      </div>
                    )}

                    {/* Visiting Cards Configuration */}
                    {service.id === 'visiting-cards' && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                            Volume Tier Pricing (350 GSM Cardstock)
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                            {renderNumberInput('100 Pcs (Single)', ['visitingCards', 'base100Single'], config.visitingCards?.base100Single || 250, "10", 0)}
                            {renderNumberInput('100 Pcs (Double)', ['visitingCards', 'base100Double'], config.visitingCards?.base100Double || 400, "10", 0)}
                            {renderNumberInput('500 Pcs (Single)', ['visitingCards', 'base500Single'], config.visitingCards?.base500Single || 850, "20", 0)}
                            {renderNumberInput('500 Pcs (Double)', ['visitingCards', 'base500Double'], config.visitingCards?.base500Double || 1200, "20", 0)}
                            {renderNumberInput('1000 Pcs (Single)', ['visitingCards', 'base1000Single'], config.visitingCards?.base1000Single || 1500, "50", 0)}
                            {renderNumberInput('1000 Pcs (Double)', ['visitingCards', 'base1000Double'], config.visitingCards?.base1000Double || 2000, "50", 0)}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                            Special Finish Surcharges (₹ per set)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                            {renderNumberInput('Matte Lamination Extra', ['visitingCards', 'matteFinishExtra'], config.visitingCards?.matteFinishExtra || 50, "10", 0)}
                            {renderNumberInput('Gloss Lamination Extra', ['visitingCards', 'glossFinishExtra'], config.visitingCards?.glossFinishExtra || 50, "10", 0)}
                            {renderNumberInput('Velvet Soft-Touch Extra', ['visitingCards', 'velvetFinishExtra'], config.visitingCards?.velvetFinishExtra || 150, "20", 0)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ID Cards Configuration */}
                    {service.id === 'id-cards' && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                          PVC ID Card Pricing (₹)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                          {renderNumberInput('PVC Single Side', ['idCards', 'pvcSingle'], config.idCards?.pvcSingle || 60, "5", 0)}
                          {renderNumberInput('PVC Double Side', ['idCards', 'pvcDouble'], config.idCards?.pvcDouble || 80, "5", 0)}
                          {renderNumberInput('Lanyard + Holder Addon', ['idCards', 'withLanyardHolder'], config.idCards?.withLanyardHolder || 25, "5", 0)}
                        </div>
                      </div>
                    )}

                    {/* Poster & Flex Banner Configuration */}
                    {service.id === 'poster-banner' && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-2">
                          Poster & Flex Printing Rates
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                          {renderNumberInput('A4 Photo (₹/pc)', ['posters', 'a4Photo'], config.posters?.a4Photo || 20, "5", 0)}
                          {renderNumberInput('A3 Glossy (₹/pc)', ['posters', 'a3Glossy'], config.posters?.a3Glossy || 40, "5", 0)}
                          {renderNumberInput('A2 Photo (₹/pc)', ['posters', 'a2Photo'], config.posters?.a2Photo || 120, "10", 0)}
                          {renderNumberInput('Vinyl (₹/sq.ft)', ['posters', 'vinylPerSqFt'], config.posters?.vinylPerSqFt || 45, "5", 0)}
                          {renderNumberInput('Flex (₹/sq.ft)', ['posters', 'flexPerSqFt'], config.posters?.flexPerSqFt || 18, "2", 0)}
                        </div>
                      </div>
                    )}

                    {/* Invitation Cards & Custom Print Info */}
                    {['invitation-cards', 'custom-print'].includes(service.id) && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800">
                          {service.id === 'invitation-cards' ? 'Custom Wedding & Invitation Cards' : 'Custom Digital & Press Print Jobs'}
                        </p>
                        <p className="text-[11px]">
                          This service uses custom parameters submitted by the customer through the interactive order form. Quotes and pricing are calculated per order requirements or via staff review.
                        </p>
                      </div>
                    )}

                    {/* Action Bar inside Accordion */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                      <a
                        href={service.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#123B70] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open & Test Customer Form</span>
                      </a>

                      <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#123B70] text-white rounded-lg hover:bg-[#0c274c] transition-colors text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save Pricing Tiers</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminQuickServicesPage;
