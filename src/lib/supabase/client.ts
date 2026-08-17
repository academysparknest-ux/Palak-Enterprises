import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const defaultKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);
const supabaseUrl = env.VITE_SUPABASE_URL || defaultUrl;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Create real client with persistent session handling
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
