import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminModal } from '../../components/admin/AdminModal';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { useToast } from '../../components/admin/AdminToast';
import { PalakChargesStore } from '../../lib/charges/chargesStore';
import { calculateOrderCharges, roundCurrency } from '../../lib/charges/pricingEngine';
import type {
  ChargesMasterConfig,
  ChargeConfig,
  TaxConfig,
  ChargeType,
  CalculationType,
  TaxMode,
} from '../../lib/charges/types';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  ShieldCheck,
  Info,
  CheckCircle2,
  Receipt,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const AdminChargesPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [config, setConfig] = useState<ChargesMasterConfig>(() =>
    PalakChargesStore.getChargesConfig()
  );
  const [saving, setSaving] = useState(false);

  // Edit / Add Charge Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ChargeConfig | null>(null);
  const [isNewCharge, setIsNewCharge] = useState(false);

  // Confirm Reset Dialog
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Delete Confirm Dialog
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    description: string;
    chargeType: ChargeType;
    calculationType: CalculationType;
    value: number;
    minAmount: string;
    maxAmount: string;
    minOrderValue: string;
    isTaxable: boolean;
    isActive: boolean;
    applicableFulfillment: 'all' | 'pickup' | 'delivery';
  }>({
    id: '',
    name: '',
    description: '',
    chargeType: 'custom',
    calculationType: 'percentage',
    value: 0,
    minAmount: '',
    maxAmount: '',
    minOrderValue: '',
    isTaxable: true,
    isActive: true,
    applicableFulfillment: 'all',
  });

  // Tax Settings Form State
  const [taxForm, setTaxForm] = useState<TaxConfig>(config.tax);

  // Live Calculator Simulator Inputs
  const [calcSubtotal, setCalcSubtotal] = useState<number>(1000);
  const [calcQuantity, setCalcQuantity] = useState<number>(100);
  const [calcDiscount, setCalcDiscount] = useState<number>(100);
  const [calcFulfillment, setCalcFulfillment] = useState<'pickup' | 'delivery'>('delivery');

  // Load from Cloud on Mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const cloudConfig = await PalakChargesStore.fetchChargesConfigFromCloud();
        if (isMounted) {
          setConfig(cloudConfig);
          setTaxForm(cloudConfig.tax);
        }
      } catch {
        addToast({ title: 'Using local charges cache', type: 'info' });
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  // Live Calculation Output
  const livePreview = useMemo(() => {
    return calculateOrderCharges({
      subtotal: calcSubtotal,
      quantity: calcQuantity,
      discount: calcDiscount,
      fulfillmentType: calcFulfillment,
      config: {
        ...config,
        tax: taxForm,
      },
    });
  }, [calcSubtotal, calcQuantity, calcDiscount, calcFulfillment, config, taxForm]);

  // Toggle active state of a charge directly from table
  const handleToggleCharge = async (chargeId: string, currentActive: boolean) => {
    const updatedCharges = config.charges.map((c) =>
      c.id === chargeId ? { ...c, isActive: !currentActive, updatedAt: new Date().toISOString() } : c
    );
    const updatedConfig = { ...config, charges: updatedCharges };
    setConfig(updatedConfig);
    const res = await PalakChargesStore.saveChargesConfig(updatedConfig, user || undefined);
    if (res.success) {
      addToast({
        title: `Charge ${!currentActive ? 'Enabled' : 'Disabled'}`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Failed to update charge state', type: 'error' });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (charge: ChargeConfig) => {
    setEditingCharge(charge);
    setIsNewCharge(false);
    setFormData({
      id: charge.id,
      name: charge.name,
      description: charge.description || '',
      chargeType: charge.chargeType,
      calculationType: charge.calculationType,
      value: charge.value,
      minAmount: charge.minAmount !== undefined ? String(charge.minAmount) : '',
      maxAmount: charge.maxAmount !== undefined ? String(charge.maxAmount) : '',
      minOrderValue: charge.minOrderValue !== undefined ? String(charge.minOrderValue) : '',
      isTaxable: charge.isTaxable,
      isActive: charge.isActive,
      applicableFulfillment: charge.applicableFulfillment || 'all',
    });
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    const newId = `charge_${Date.now()}`;
    setEditingCharge(null);
    setIsNewCharge(true);
    setFormData({
      id: newId,
      name: '',
      description: '',
      chargeType: 'custom',
      calculationType: 'fixed',
      value: 0,
      minAmount: '',
      maxAmount: '',
      minOrderValue: '',
      isTaxable: true,
      isActive: true,
      applicableFulfillment: 'all',
    });
    setIsModalOpen(true);
  };

  // Save Modal
  const handleSaveChargeModal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast({ title: 'Charge name is required', type: 'error' });
      return;
    }

    if (formData.value < 0) {
      addToast({ title: 'Charge rate/value cannot be negative', type: 'error' });
      return;
    }

    const minVal = formData.minAmount ? Number(formData.minAmount) : undefined;
    const maxVal = formData.maxAmount ? Number(formData.maxAmount) : undefined;
    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      addToast({ title: 'Minimum cap cannot exceed Maximum cap', type: 'error' });
      return;
    }

    const newCharge: ChargeConfig = {
      id: formData.id || `charge_${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      chargeType: formData.chargeType,
      calculationType: formData.calculationType,
      value: Number(formData.value) || 0,
      minAmount: minVal,
      maxAmount: maxVal,
      minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : undefined,
      isTaxable: formData.isTaxable,
      isActive: formData.isActive,
      applicableFulfillment: formData.applicableFulfillment,
      sortOrder: editingCharge?.sortOrder || config.charges.length + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Admin',
    };

    setSaving(true);
    let updatedCharges: ChargeConfig[];
    if (isNewCharge) {
      updatedCharges = [...config.charges, newCharge];
    } else {
      updatedCharges = config.charges.map((c) => (c.id === newCharge.id ? newCharge : c));
    }

    const updatedConfig: ChargesMasterConfig = {
      ...config,
      charges: updatedCharges,
    };

    const res = await PalakChargesStore.saveChargesConfig(updatedConfig, user || undefined);
    setSaving(false);

    if (res.success) {
      setConfig(updatedConfig);
      setIsModalOpen(false);
      addToast({
        title: isNewCharge ? 'Charge added successfully' : 'Charge updated successfully',
        type: 'success',
      });
    } else {
      addToast({
        title: 'Failed to save charge',
        message: res.error,
        type: 'error',
      });
    }
  };

  // Delete Custom Charge
  const handleConfirmDeleteCharge = async () => {
    if (!deletingChargeId) return;
    const updatedCharges = config.charges.filter((c) => c.id !== deletingChargeId);
    const updatedConfig = { ...config, charges: updatedCharges };
    setConfig(updatedConfig);
    setDeletingChargeId(null);
    const res = await PalakChargesStore.saveChargesConfig(updatedConfig, user || undefined);
    if (res.success) {
      addToast({ title: 'Charge deleted successfully', type: 'success' });
    } else {
      addToast({ title: 'Failed to delete charge', type: 'error' });
    }
  };

  // Save Tax Config
  const handleSaveTaxConfig = async () => {
    setSaving(true);
    const updatedTax: TaxConfig = {
      ...taxForm,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Admin',
    };
    const updatedConfig: ChargesMasterConfig = {
      ...config,
      tax: updatedTax,
    };
    const res = await PalakChargesStore.saveChargesConfig(updatedConfig, user || undefined);
    setSaving(false);
    if (res.success) {
      setConfig(updatedConfig);
      addToast({ title: 'Tax & GST configuration saved', type: 'success' });
    } else {
      addToast({ title: 'Failed to save tax configuration', message: res.error, type: 'error' });
    }
  };

  // Reset to Factory Default
  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
    setSaving(true);
    const restored = await PalakChargesStore.resetToDefault(user || undefined);
    setConfig(restored);
    setTaxForm(restored.tax);
    setSaving(false);
    addToast({ title: 'Reset all charges & taxes to factory defaults', type: 'success' });
  };

  const activePlatformFee = config.charges.find((c) => c.chargeType === 'platform_fee');
  const activeDeliveryFee = config.charges.find((c) => c.chargeType === 'delivery_fee');

  return (
    <div className="space-y-4">
      {/* Header */}
      <AdminPageHeader
        title="Charges, Taxes & Platform Fee"
        subtitle="Centralized management for checkout charges, delivery rates, GST / Tax rules, and live calculation preview"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#123B70] text-white rounded-lg hover:bg-[#123B70]/90 transition-colors text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Charge</span>
            </button>
          </div>
        }
      />

      {/* 4-KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Platform Fee</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {activePlatformFee && activePlatformFee.isActive
                ? `${activePlatformFee.value}%`
                : 'Disabled'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Local Delivery Fee</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {activeDeliveryFee && activeDeliveryFee.isActive
                ? `₹${activeDeliveryFee.value}`
                : 'Free'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">GST / Tax Rate</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {taxForm.isActive && taxForm.taxMode !== 'exempt'
                ? `${taxForm.gstRate}% (${taxForm.taxMode.toUpperCase()})`
                : 'Exempt (0%)'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active Rules</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {config.charges.filter((c) => c.isActive).length + (taxForm.isActive ? 1 : 0)} Rules
            </h3>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Charges Table & Tax Settings (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section 1: Configurable Charges Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#123B70]" />
                <h2 className="text-sm font-bold text-slate-900">Configured Charges & Fees</h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Single source of truth for checkout calculations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse admin-table text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="px-3.5 py-2">Charge Name</th>
                    <th className="px-3.5 py-2">Type</th>
                    <th className="px-3.5 py-2">Rate / Amount</th>
                    <th className="px-3.5 py-2">Limits / Scope</th>
                    <th className="px-3.5 py-2 text-center">Taxable</th>
                    <th className="px-3.5 py-2 text-center">Status</th>
                    <th className="px-3.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {config.charges.map((charge) => (
                    <tr key={charge.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-900">{charge.name}</div>
                        {charge.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {charge.description}
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          {charge.calculationType === 'percentage'
                            ? 'Percentage (%)'
                            : charge.calculationType === 'per_item'
                            ? 'Per Item (₹/pc)'
                            : 'Fixed (₹)'}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        {charge.calculationType === 'percentage'
                          ? `${charge.value}%`
                          : `₹${roundCurrency(charge.value).toFixed(2)}`}
                      </td>

                      <td className="px-3.5 py-2.5 text-[11px] text-slate-600">
                        {charge.calculationType === 'percentage' && (charge.minAmount || charge.maxAmount) ? (
                          <span>
                            {charge.minAmount ? `Min ₹${charge.minAmount}` : ''}
                            {charge.minAmount && charge.maxAmount ? ' • ' : ''}
                            {charge.maxAmount ? `Max ₹${charge.maxAmount}` : ''}
                          </span>
                        ) : charge.applicableFulfillment && charge.applicableFulfillment !== 'all' ? (
                          <span className="capitalize">{charge.applicableFulfillment} Only</span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        {charge.isTaxable ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            +GST
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Exempt</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCharge(charge.id, charge.isActive)}
                          className={`relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            charge.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              charge.isActive ? 'translate-x-3.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(charge)}
                            className="p-1 text-slate-500 hover:text-[#123B70] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Charge"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!['platform_fee', 'delivery_fee'].includes(charge.id) && (
                            <button
                              onClick={() => setDeletingChargeId(charge.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: GST & Tax System Settings */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#123B70]" />
                <h2 className="text-sm font-bold text-slate-900">Tax & GST Configuration (India)</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Enable Tax Calculation
                </label>
                <input
                  type="checkbox"
                  checked={taxForm.isActive}
                  onChange={(e) => setTaxForm({ ...taxForm, isActive: e.target.checked })}
                  className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70] cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tax Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    GST Split Mode
                  </label>
                  <select
                    value={taxForm.taxMode}
                    onChange={(e) => setTaxForm({ ...taxForm, taxMode: e.target.value as TaxMode })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20 cursor-pointer"
                  >
                    <option value="gst">Single GST ({taxForm.gstRate}%)</option>
                    <option value="cgst_sgst">
                      CGST ({taxForm.cgstRate}%) + SGST ({taxForm.sgstRate}%)
                    </option>
                    <option value="igst">Interstate IGST ({taxForm.igstRate}%)</option>
                    <option value="exempt">0% / Tax Exempt</option>
                  </select>
                </div>

                {/* Master GST Rate */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Total GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxForm.gstRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTaxForm({
                        ...taxForm,
                        gstRate: val,
                        cgstRate: roundCurrency(val / 2),
                        sgstRate: roundCurrency(val / 2),
                        igstRate: val,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20"
                  />
                </div>

                {/* HSN / SAC Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={taxForm.hsnSacCode || '9989'}
                    onChange={(e) => setTaxForm({ ...taxForm, hsnSacCode: e.target.value })}
                    placeholder="e.g. 9989"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20"
                  />
                </div>
              </div>

              {/* Tax Applicability Matrix */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Tax Applicability Rules (What gets taxed?)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.appliesToProducts}
                      onChange={(e) =>
                        setTaxForm({ ...taxForm, appliesToProducts: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70]"
                    />
                    <span className="text-slate-700 font-medium">
                      Apply GST on Products & Printing
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.appliesToPlatformFee}
                      onChange={(e) =>
                        setTaxForm({ ...taxForm, appliesToPlatformFee: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70]"
                    />
                    <span className="text-slate-700 font-medium">
                      Apply GST on Platform & Convenience Fee
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.appliesToDeliveryFee}
                      onChange={(e) =>
                        setTaxForm({ ...taxForm, appliesToDeliveryFee: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70]"
                    />
                    <span className="text-slate-700 font-medium">
                      Apply GST on Delivery / Shipping Fee
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.appliesToOtherCharges}
                      onChange={(e) =>
                        setTaxForm({ ...taxForm, appliesToOtherCharges: e.target.checked })
                      }
                      className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70]"
                    />
                    <span className="text-slate-700 font-medium">
                      Apply GST on Other Custom Charges
                    </span>
                  </label>
                </div>
              </div>

              {/* Save Tax Config Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveTaxConfig}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#123B70] text-white rounded-lg hover:bg-[#123B70]/90 transition-colors text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Tax Rules'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Calculator (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden sticky top-16">
            <div className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#123B70]" />
                <h3 className="text-xs font-bold text-slate-900">Live Calculation Simulator</h3>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Real-Time
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Test Inputs */}
              <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Subtotal (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcSubtotal}
                      onChange={(e) => setCalcSubtotal(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcDiscount}
                      onChange={(e) => setCalcDiscount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={calcQuantity}
                      onChange={(e) => setCalcQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Fulfillment
                    </label>
                    <select
                      value={calcFulfillment}
                      onChange={(e) => setCalcFulfillment(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-semibold cursor-pointer"
                    >
                      <option value="pickup">Store Pickup</option>
                      <option value="delivery">Home Delivery</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Bill Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Item Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{livePreview.subtotal.toFixed(2)}
                  </span>
                </div>

                {livePreview.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{livePreview.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 my-1"></div>

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Taxable Base:</span>
                  <span className="font-semibold text-slate-700">
                    ₹{livePreview.taxableAmount.toFixed(2)}
                  </span>
                </div>

                {/* Itemized Charges */}
                {livePreview.itemizedCharges.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>{item.name}</span>
                      {item.isTaxable && (
                        <span className="text-[9px] text-amber-600 font-bold">*</span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ₹{item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Tax Breakdown */}
                {livePreview.taxAmount > 0 ? (
                  <>
                    <div className="border-t border-slate-100 my-1"></div>
                    {livePreview.cgstAmount !== undefined && livePreview.sgstAmount !== undefined ? (
                      <>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>CGST ({taxForm.cgstRate}%):</span>
                          <span className="font-semibold text-slate-800">
                            ₹{livePreview.cgstAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>SGST ({taxForm.sgstRate}%):</span>
                          <span className="font-semibold text-slate-800">
                            ₹{livePreview.sgstAmount.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({livePreview.taxRate}%):</span>
                        <span className="font-semibold text-slate-800">
                          ₹{livePreview.taxAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>GST / Taxes:</span>
                    <span>₹0.00 (Exempt)</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="border-t-2 border-slate-900/10 pt-2 flex justify-between items-center text-sm font-black text-[#123B70]">
                  <span>Customer Payable:</span>
                  <span className="text-base text-emerald-700">
                    ₹{livePreview.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-lg flex items-start gap-1.5 text-[10px] text-blue-800">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Customer checkouts and official invoices use this exact calculation engine.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / Add Charge Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isNewCharge ? 'Add New Custom Charge' : `Edit Charge: ${editingCharge?.name}`}
        size="md"
      >
        <form onSubmit={handleSaveChargeModal} className="space-y-3 text-xs">
          {/* Charge Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Charge Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Convenience Fee, Rush Order Fee"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief explanation shown in order details"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20"
            />
          </div>

          {/* Type & Calculation Mode */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
              <select
                value={formData.chargeType}
                onChange={(e) => setFormData({ ...formData, chargeType: e.target.value as ChargeType })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="platform_fee">Platform Fee</option>
                <option value="delivery_fee">Delivery Fee</option>
                <option value="convenience_fee">Convenience Fee</option>
                <option value="service_charge">Service Charge</option>
                <option value="handling_fee">Handling Fee</option>
                <option value="custom">Custom Surcharge</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Calculation Method</label>
              <select
                value={formData.calculationType}
                onChange={(e) => setFormData({ ...formData, calculationType: e.target.value as CalculationType })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="percentage">Percentage (%) of Net Subtotal</option>
                <option value="fixed">Fixed Flat Amount (₹)</option>
                <option value="per_item">Per Item Quantity (₹/pc)</option>
              </select>
            </div>
          </div>

          {/* Rate / Value */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {formData.calculationType === 'percentage' ? 'Percentage Rate (%)' : 'Amount (₹)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#123B70]/20"
            />
          </div>

          {/* Min / Max Caps (for percentage) */}
          {formData.calculationType === 'percentage' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Minimum Fee (Floor ₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Maximum Fee (Cap ₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  placeholder="e.g. 100"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Scope & Conditions */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Applicable Fulfillment</label>
              <select
                value={formData.applicableFulfillment}
                onChange={(e) => setFormData({ ...formData, applicableFulfillment: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <option value="all">All Orders</option>
                <option value="pickup">Store Pickup Only</option>
                <option value="delivery">Home Delivery Only</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Order Threshold (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                placeholder="Optional"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:bg-white"
              />
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formData.isTaxable}
                onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                className="w-3.5 h-3.5 text-[#123B70] rounded border-slate-300 focus:ring-[#123B70]"
              />
              <span>Subject to GST (Taxable Fee)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Active</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-[#123B70] text-white hover:bg-[#123B70]/90 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isNewCharge ? 'Add Charge' : 'Save Changes'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Charges to Defaults?"
        message="This will restore all default platform fees, delivery rates, and standard 18% GST rules. Existing historical orders will not be affected."
        confirmText="Yes, Reset"
        variant="warning"
      />

      {/* Delete Charge Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingChargeId)}
        onCancel={() => setDeletingChargeId(null)}
        onConfirm={handleConfirmDeleteCharge}
        title="Delete Custom Charge?"
        message="Are you sure you want to remove this charge rule? Future customer checkouts will no longer include it."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default AdminChargesPage;
