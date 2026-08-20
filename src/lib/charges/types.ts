export type ChargeType =
  | 'platform_fee'
  | 'delivery_fee'
  | 'gst'
  | 'cgst'
  | 'sgst'
  | 'igst'
  | 'service_charge'
  | 'convenience_fee'
  | 'handling_fee'
  | 'processing_fee'
  | 'custom';

export type CalculationType = 'percentage' | 'fixed' | 'per_item';

export interface ChargeConfig {
  id: string;
  name: string;
  description?: string;
  chargeType: ChargeType;
  calculationType: CalculationType;
  value: number; // e.g., 2 for 2%, 50 for ₹50, 5 for ₹5/item
  minAmount?: number; // Optional floor cap, e.g. min ₹5
  maxAmount?: number; // Optional ceiling cap, e.g. max ₹100
  isTaxable: boolean; // Whether this fee is subject to GST
  isActive: boolean; // Enable/Disable toggle
  minOrderValue?: number; // Optional minimum subtotal threshold to apply charge
  applicableFulfillment?: 'all' | 'pickup' | 'delivery';
  sortOrder: number;
  updatedAt: string;
  updatedBy?: string;
}

export type TaxMode = 'gst' | 'cgst_sgst' | 'igst' | 'exempt';

export interface TaxConfig {
  taxMode: TaxMode;
  gstRate: number; // e.g. 18 for 18%
  cgstRate: number; // e.g. 9 for 9%
  sgstRate: number; // e.g. 9 for 9%
  igstRate: number; // e.g. 18 for 18%
  isActive: boolean;
  appliesToProducts: boolean;
  appliesToServices: boolean;
  appliesToPlatformFee: boolean;
  appliesToDeliveryFee: boolean;
  appliesToOtherCharges: boolean;
  hsnSacCode?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ChargesMasterConfig {
  version: string;
  charges: ChargeConfig[];
  tax: TaxConfig;
  lastUpdated: string;
  updatedBy?: string;
}

export interface ItemizedChargeDetail {
  id: string;
  name: string;
  chargeType: ChargeType;
  calculationType: CalculationType;
  rateValue: number;
  amount: number;
  isTaxable: boolean;
}

export interface OrderChargesBreakdown {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  platformFee: number;
  deliveryFee: number;
  serviceCharge: number;
  otherCharges: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxRate: number;
  taxMode: TaxMode;
  itemizedCharges: ItemizedChargeDetail[];
  grandTotal: number;
  configSnapshotVersion: string;
}
