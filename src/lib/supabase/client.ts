import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);
export const supabaseUrl: string = env.VITE_SUPABASE_URL || '';
export const supabaseKey: string = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

let latestServerEpochMs: number | null = null;
let serverDatePerfTimestamp: number = 0;

export function recordServerResponseDate(dateHeader: string | null | undefined): void {
  if (!dateHeader) return;
  const parsed = Date.parse(dateHeader);
  if (!isNaN(parsed)) {
    latestServerEpochMs = parsed;
    serverDatePerfTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

export function getEstimatedServerNowMs(): number {
  if (latestServerEpochMs !== null) {
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - serverDatePerfTimestamp;
    return latestServerEpochMs + elapsed;
  }
  return Date.now();
}

export async function probeServerDate(): Promise<number> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseKey },
    });
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      recordServerResponseDate(dateHeader);
      return Date.parse(dateHeader);
    }
  } catch {
    // Non-fatal probe fallback
  }
  return getEstimatedServerNowMs();
}

const customFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const dateHeader = response.headers.get('date');
  if (dateHeader) {
    recordServerResponseDate(dateHeader);
  }
  return response;
};

// Create real client with persistent session handling and server-time header tracking
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: customFetch,
      },
    })
  : null;
