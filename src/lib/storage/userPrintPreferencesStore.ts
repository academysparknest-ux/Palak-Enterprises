import { supabase, isSupabaseConfigured } from "../supabase/client";
import {
  DEFAULT_USER_PRINT_PREFERENCES,
  type UserSavedPrintPreferences,
} from "../../types/printJob";

const STORAGE_KEY = "palak_user_print_preferences_v1";

export class UserPrintPreferencesStore {
  /**
   * Retrieves saved print preferences from localStorage, falling back to defaults.
   */
  static getLocalPreferences(): UserSavedPrintPreferences {
    if (typeof window === "undefined") return DEFAULT_USER_PRINT_PREFERENCES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_USER_PRINT_PREFERENCES;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_USER_PRINT_PREFERENCES,
        ...parsed,
        finishing: {
          ...DEFAULT_USER_PRINT_PREFERENCES.finishing,
          ...(parsed.finishing || {}),
        },
      };
    } catch {
      return DEFAULT_USER_PRINT_PREFERENCES;
    }
  }

  /**
   * Saves preferences locally and synchronizes with Supabase if user is logged in.
   */
  static async savePreferences(
    preferences: UserSavedPrintPreferences,
    userId?: string
  ): Promise<void> {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (e) {
        console.warn("Failed to persist print preferences in localStorage:", e);
      }
    }

    if (userId && isSupabaseConfigured && supabase) {
      try {
        await supabase.from("user_print_preferences").upsert(
          {
            user_id: userId,
            preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (err) {
        console.warn("Supabase user_print_preferences sync notice:", err);
      }
    }
  }

  /**
   * Loads user preferences from Supabase if logged in, updating local cache.
   */
  static async loadUserPreferences(userId?: string): Promise<UserSavedPrintPreferences> {
    const local = this.getLocalPreferences();
    if (!userId || !isSupabaseConfigured || !supabase) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from("user_print_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.preferences) {
        const merged: UserSavedPrintPreferences = {
          ...DEFAULT_USER_PRINT_PREFERENCES,
          ...data.preferences,
          finishing: {
            ...DEFAULT_USER_PRINT_PREFERENCES.finishing,
            ...(data.preferences.finishing || {}),
          },
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
        }
        return merged;
      }
    } catch (err) {
      console.warn("Error fetching cloud user print preferences:", err);
    }

    return local;
  }
}
