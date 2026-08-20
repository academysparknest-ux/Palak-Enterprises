import { supabase, isSupabaseConfigured } from '../supabase/client';
import { logAdminAudit } from '../supabase/database';
import type { ChargesMasterConfig, ChargeConfig, TaxConfig } from './types';
import { DEFAULT_CHARGES_CONFIG } from './pricingEngine';

const CHARGES_STORAGE_KEY = 'palak_charges_config_v1';
const CHARGES_BROADCAST_CHANNEL = 'palak_charges_channel';

// In-memory runtime cache for instant synchronous access
let inMemoryConfig: ChargesMasterConfig | null = null;
let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel if available in browser environment
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHARGES_BROADCAST_CHANNEL);
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'CHARGES_UPDATED' && event.data.config) {
        inMemoryConfig = event.data.config;
        try {
          localStorage.setItem(CHARGES_STORAGE_KEY, JSON.stringify(event.data.config));
        } catch {}
      }
    };
  } catch (e) {
    console.debug('[ChargesStore] BroadcastChannel notice:', e);
  }
}

function getLocalConfig(): ChargesMasterConfig {
  if (typeof window === 'undefined') return DEFAULT_CHARGES_CONFIG;
  try {
    const raw = localStorage.getItem(CHARGES_STORAGE_KEY);
    if (!raw) return DEFAULT_CHARGES_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.charges) && parsed.tax) {
      return parsed;
    }
    return DEFAULT_CHARGES_CONFIG;
  } catch {
    return DEFAULT_CHARGES_CONFIG;
  }
}

function setLocalConfig(config: ChargesMasterConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHARGES_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to cache charges config in localStorage:', e);
  }
}

export class PalakChargesStore {
  /**
   * Synchronous getter for pricing calculations (reads memory / local cache)
   */
  static getChargesConfig(): ChargesMasterConfig {
    if (inMemoryConfig) {
      return inMemoryConfig;
    }
    inMemoryConfig = getLocalConfig();
    return inMemoryConfig;
  }

  /**
   * Asynchronous cloud fetch from Supabase `business_settings` (key: 'charges_config')
   */
  static async fetchChargesConfigFromCloud(): Promise<ChargesMasterConfig> {
    if (!isSupabaseConfigured || !supabase) {
      return this.getChargesConfig();
    }

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('value, updated_at')
        .eq('key', 'charges_config')
        .maybeSingle();

      if (error) {
        console.warn('[ChargesStore] Cloud fetch notice:', error.message);
        return this.getChargesConfig();
      }

      if (data && data.value && Array.isArray(data.value.charges) && data.value.tax) {
        const cloudConfig: ChargesMasterConfig = {
          ...data.value,
          lastUpdated: data.updated_at || data.value.lastUpdated || new Date().toISOString(),
        };
        inMemoryConfig = cloudConfig;
        setLocalConfig(cloudConfig);
        return cloudConfig;
      }

      // If no cloud config exists yet, persist default configuration to cloud
      await this.saveChargesConfig(DEFAULT_CHARGES_CONFIG, { name: 'System Initializer' });
      return DEFAULT_CHARGES_CONFIG;
    } catch (err) {
      console.warn('[ChargesStore] Cloud query exception:', err);
      return this.getChargesConfig();
    }
  }

  /**
   * Authoritative save method: updates Supabase, local cache, memory, and broadcasts update event
   */
  static async saveChargesConfig(
    config: ChargesMasterConfig,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const updatedTimestamp = new Date().toISOString();
    const cleanConfig: ChargesMasterConfig = {
      ...config,
      version: config.version || '2026.1',
      lastUpdated: updatedTimestamp,
      updatedBy: user?.name || 'Palak Admin',
    };

    // Update in-memory & local storage
    inMemoryConfig = cleanConfig;
    setLocalConfig(cleanConfig);

    // Notify other open tabs/windows via BroadcastChannel
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'CHARGES_UPDATED',
          config: cleanConfig,
        });
      } catch {}
    }

    // Persist to Supabase business_settings
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('business_settings').upsert({
          key: 'charges_config',
          value: cleanConfig as any,
          description: 'Authoritative configuration for platform fees, delivery charges, taxes & surcharges',
          updated_at: updatedTimestamp,
        });

        if (error) {
          console.error('[ChargesStore] Supabase save error:', error.message);
          return { success: false, error: error.message };
        }

        // Log audit event
        await logAdminAudit({
          actorId: user?.id,
          actorName: user?.name || 'Palak Admin',
          actorRole: user?.role || 'ADMIN',
          actionType: 'update_pricing',
          entityType: 'pricing',
          entityId: 'charges_config',
          details: {
            description: 'Updated centralized charges, platform fees and tax configurations',
            chargesCount: cleanConfig.charges.length,
            taxRate: cleanConfig.tax.gstRate,
            taxMode: cleanConfig.tax.taxMode,
          },
        });
      } catch (err: any) {
        console.error('[ChargesStore] Save exception:', err);
        return { success: false, error: err?.message || 'Database connection error' };
      }
    }

    return { success: true };
  }

  /**
   * Helper to update a single charge item
   */
  static async updateChargeItem(
    updatedCharge: ChargeConfig,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<boolean> {
    const current = this.getChargesConfig();
    const idx = current.charges.findIndex((c) => c.id === updatedCharge.id);
    let newCharges = [...current.charges];

    if (idx >= 0) {
      newCharges[idx] = { ...updatedCharge, updatedAt: new Date().toISOString() };
    } else {
      newCharges.push({ ...updatedCharge, updatedAt: new Date().toISOString() });
    }

    const res = await this.saveChargesConfig(
      {
        ...current,
        charges: newCharges,
      },
      user
    );

    return res.success;
  }

  /**
   * Helper to update tax configuration
   */
  static async updateTaxConfig(
    updatedTax: TaxConfig,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<boolean> {
    const current = this.getChargesConfig();
    const res = await this.saveChargesConfig(
      {
        ...current,
        tax: { ...updatedTax, updatedAt: new Date().toISOString() },
      },
      user
    );

    return res.success;
  }

  /**
   * Delete a custom charge item
   */
  static async deleteChargeItem(
    chargeId: string,
    user?: { id?: string; name?: string; role?: string }
  ): Promise<boolean> {
    const current = this.getChargesConfig();
    const newCharges = current.charges.filter((c) => c.id !== chargeId);
    const res = await this.saveChargesConfig(
      {
        ...current,
        charges: newCharges,
      },
      user
    );

    return res.success;
  }

  /**
   * Reset configuration to factory defaults
   */
  static async resetToDefault(
    user?: { id?: string; name?: string; role?: string }
  ): Promise<ChargesMasterConfig> {
    await this.saveChargesConfig(DEFAULT_CHARGES_CONFIG, user);
    return DEFAULT_CHARGES_CONFIG;
  }
}
