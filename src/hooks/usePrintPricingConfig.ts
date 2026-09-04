import { useState, useEffect, useCallback } from "react";
import { type PrintPricingConfig } from "../config/printPricing";
import {
  getPrintPricingConfig,
  updatePrintPricingConfig,
  subscribeToPrintPricing,
  getLocalPrintPricingConfig,
} from "../lib/supabase/database";

export interface UsePrintPricingResult {
  pricing: PrintPricingConfig;
  pricingConfig: PrintPricingConfig;
  loading: boolean;
  error: string | null;
  updatePricing: (newConfig: PrintPricingConfig) => Promise<boolean>;
  reloadPricing: () => Promise<void>;
}

/**
 * Authoritative React hook to monitor and mutate live Quick Service print pricing.
 * Automatically synchronizes in real time across tabs, windows, and admin/customer components.
 */
export function usePrintPricingConfig(): UsePrintPricingResult {
  const [pricing, setPricing] = useState<PrintPricingConfig>(() => getLocalPrintPricingConfig());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fresh = await getPrintPricingConfig(true);
      setPricing(fresh);
    } catch (err: any) {
      console.warn("Failed to fetch authoritative print pricing:", err);
      setError("Unable to load latest pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchPricing();

    const unsubscribe = subscribeToPrintPricing((freshConfig) => {
      if (mounted) {
        setPricing(freshConfig);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchPricing]);

  const updatePricing = useCallback(async (newConfig: PrintPricingConfig): Promise<boolean> => {
    try {
      const ok = await updatePrintPricingConfig(newConfig);
      if (ok) {
        setPricing(newConfig);
      }
      return ok;
    } catch (err: any) {
      console.error("Error updating print pricing:", err);
      setError(err?.message || "Failed to save pricing");
      return false;
    }
  }, []);

  return {
    pricing,
    pricingConfig: pricing,
    loading,
    error,
    updatePricing,
    reloadPricing: fetchPricing,
  };
}
