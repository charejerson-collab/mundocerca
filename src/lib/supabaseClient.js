// =============================================================================
// Supabase Client - Frontend (Vite + React)
// =============================================================================
// Uses import.meta.env for Vite environment variables
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Using backend API fallback.');
}

// Create Supabase client (will be null if not configured)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Check if Supabase is available
export const isSupabaseConfigured = () => !!supabase;

export default supabase;
