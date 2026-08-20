import type {
  ChargesMasterConfig,
  ChargeConfig,
  TaxConfig,
  OrderChargesBreakdown,
  ItemizedChargeDetail,
} from './types';

/**
 * Standard rounding to 2 decimal places to avoid floating point inaccuracies (e.g. ₹1142.24)
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  taxMode: 'gst',
  gstRate: 18,
  cgstRate: 9,
  sgstRate: 9,
  igstRate: 18,
  isActive: true,
  appliesToProducts: true,
  appliesToServices: true,
  appliesToPlatformFee: true,
  appliesToDeliveryFee: false,
  appliesToOtherCharges: true,
  hsnSacCode: '9989', // Printing and publishing services SAC code
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

export const DEFAULT_CHARGES: ChargeConfig[] = [
  {
    id: 'platform_fee',
    name: 'Platform & Processing Fee',
    description: 'Cloud infrastructure, order management & automated tracking fee',
    chargeType: 'platform_fee',
    calculationType: 'percentage',
    value: 2.0, // 2%
    minAmount: 5.0, // Min ₹5
    maxAmount: 50.0, // Max ₹50 cap
    isTaxable: true,
    isActive: true,
    minOrderValue: 0,
    applicableFulfillment: 'all',
    sortOrder: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default',
  },
  {
    id: 'delivery_fee',
    name: 'Standard Local Delivery',
    description: 'Safe packaging and local delivery to Chakia and surrounding areas',
    chargeType: 'delivery_fee',
    calculationType: 'fixed',
    value: 50.0, // ₹50 flat
    isTaxable: false,
    isActive: true,
    applicableFulfillment: 'delivery',
    sortOrder: 2,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default',
  },
  {
    id: 'handling_fee',
    name: 'Order Handling & Packing',
    description: 'Quality inspection and protective moisture-proof packing',
    chargeType: 'handling_fee',
    calculationType: 'fixed',
    value: 0.0, // ₹0 default (configurable)
    isTaxable: true,
    isActive: false,
    applicableFulfillment: 'all',
    sortOrder: 3,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default',
  },
];

export const DEFAULT_CHARGES_CONFIG: ChargesMasterConfig = {
  version: '2026.1',
  charges: DEFAULT_CHARGES,
  tax: DEFAULT_TAX_CONFIG,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System Default',
};

export interface CalculateOrderChargesParams {
  subtotal: number;
  quantity?: number;
  discount?: number;
  fulfillmentType?: 'pickup' | 'delivery';
  customDeliveryFee?: number;
  config?: ChargesMasterConfig;
  customerState?: string; // If 'Bihar' or blank -> CGST+SGST, if other state -> IGST (when configured)
}

/**
 * Single authoritative pricing calculation engine across Palak Enterprises.
 * Used identically for: Cart, Checkout, Print Order creation, Invoices, Payments, and Admin previews.
 */
export function calculateOrderCharges(params: CalculateOrderChargesParams): OrderChargesBreakdown {
  const masterConfig = params.config || DEFAULT_CHARGES_CONFIG;
  const fulfillment = params.fulfillmentType || 'pickup';
  const subtotal = Math.max(0, roundCurrency(params.subtotal || 0));
  const quantity = Math.max(1, Math.floor(params.quantity || 1));
  const discount = Math.min(subtotal, Math.max(0, roundCurrency(params.discount || 0)));
  const netItemSubtotal = roundCurrency(subtotal - discount);

  let platformFee = 0;
  let deliveryFee = 0;
  let serviceCharge = 0;
  let otherCharges = 0;
  const itemizedCharges: ItemizedChargeDetail[] = [];

  // 1. Calculate non-tax individual charges
  for (const charge of masterConfig.charges) {
    if (!charge.isActive) continue;

    // Check minimum order value condition
    if (charge.minOrderValue && subtotal < charge.minOrderValue) {
      continue;
    }

    // Check fulfillment applicability
    if (
      charge.applicableFulfillment &&
      charge.applicableFulfillment !== 'all' &&
      charge.applicableFulfillment !== fulfillment
    ) {
      continue;
    }

    let calculatedAmount = 0;

    // Handle custom delivery fee override if specified
    if (charge.chargeType === 'delivery_fee' && params.customDeliveryFee !== undefined) {
      calculatedAmount = params.customDeliveryFee;
    } else if (charge.calculationType === 'percentage') {
      const rawPct = (netItemSubtotal * charge.value) / 100;
      calculatedAmount = rawPct;

      if (charge.minAmount !== undefined && charge.minAmount > 0) {
        calculatedAmount = Math.max(calculatedAmount, charge.minAmount);
      }
      if (charge.maxAmount !== undefined && charge.maxAmount > 0) {
        calculatedAmount = Math.min(calculatedAmount, charge.maxAmount);
      }
    } else if (charge.calculationType === 'fixed') {
      calculatedAmount = charge.value;
    } else if (charge.calculationType === 'per_item') {
      calculatedAmount = charge.value * quantity;
    }

    calculatedAmount = Math.max(0, roundCurrency(calculatedAmount));

    if (calculatedAmount > 0) {
      itemizedCharges.push({
        id: charge.id,
        name: charge.name,
        chargeType: charge.chargeType,
        calculationType: charge.calculationType,
        rateValue: charge.value,
        amount: calculatedAmount,
        isTaxable: Boolean(charge.isTaxable),
      });

      if (charge.chargeType === 'platform_fee') {
        platformFee = roundCurrency(platformFee + calculatedAmount);
      } else if (charge.chargeType === 'delivery_fee') {
        deliveryFee = roundCurrency(deliveryFee + calculatedAmount);
      } else if (charge.chargeType === 'service_charge') {
        serviceCharge = roundCurrency(serviceCharge + calculatedAmount);
      } else {
        otherCharges = roundCurrency(otherCharges + calculatedAmount);
      }
    }
  }

  // 2. Calculate Taxable Base
  let taxableAmount = 0;
  const tax = masterConfig.tax;

  if (tax && tax.isActive && tax.taxMode !== 'exempt') {
    // Tax on products / services
    if (tax.appliesToProducts || tax.appliesToServices) {
      taxableAmount += netItemSubtotal;
    }
    // Tax on Platform Fee
    if (tax.appliesToPlatformFee) {
      taxableAmount += platformFee;
    }
    // Tax on Delivery Fee
    if (tax.appliesToDeliveryFee) {
      taxableAmount += deliveryFee;
    }
    // Tax on other taxable charges
    for (const item of itemizedCharges) {
      if (
        item.isTaxable &&
        item.chargeType !== 'platform_fee' &&
        item.chargeType !== 'delivery_fee' &&
        tax.appliesToOtherCharges
      ) {
        taxableAmount += item.amount;
      }
    }
  }

  taxableAmount = Math.max(0, roundCurrency(taxableAmount));

  // 3. Calculate GST / Taxes
  let taxAmount = 0;
  let cgstAmount: number | undefined = undefined;
  let sgstAmount: number | undefined = undefined;
  let igstAmount: number | undefined = undefined;
  let effectiveTaxRate = 0;

  if (tax && tax.isActive && tax.taxMode !== 'exempt' && taxableAmount > 0) {
    const isInterState =
      params.customerState &&
      params.customerState.trim().toLowerCase() !== 'bihar' &&
      params.customerState.trim().toLowerCase() !== 'br';

    if (tax.taxMode === 'cgst_sgst' || (tax.taxMode === 'gst' && !isInterState)) {
      const cRate = tax.cgstRate || (tax.gstRate / 2) || 9;
      const sRate = tax.sgstRate || (tax.gstRate / 2) || 9;
      cgstAmount = roundCurrency((taxableAmount * cRate) / 100);
      sgstAmount = roundCurrency((taxableAmount * sRate) / 100);
      taxAmount = roundCurrency(cgstAmount + sgstAmount);
      effectiveTaxRate = roundCurrency(cRate + sRate);
    } else if (tax.taxMode === 'igst' || isInterState) {
      const iRate = tax.igstRate || tax.gstRate || 18;
      igstAmount = roundCurrency((taxableAmount * iRate) / 100);
      taxAmount = igstAmount;
      effectiveTaxRate = iRate;
    } else {
      effectiveTaxRate = tax.gstRate || 18;
      taxAmount = roundCurrency((taxableAmount * effectiveTaxRate) / 100);
    }
  }

  // 4. Compute Final Payable Grand Total
  const totalFeesAndCharges = roundCurrency(platformFee + deliveryFee + serviceCharge + otherCharges);
  const grandTotal = Math.max(
    0,
    roundCurrency(netItemSubtotal + totalFeesAndCharges + taxAmount)
  );

  return {
    subtotal,
    discount,
    taxableAmount,
    platformFee,
    deliveryFee,
    serviceCharge,
    otherCharges,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxRate: effectiveTaxRate,
    taxMode: tax?.taxMode || 'gst',
    itemizedCharges,
    grandTotal,
    configSnapshotVersion: masterConfig.version || '2026.1',
  };
}
