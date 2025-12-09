// =============================================================================
// Supabase Client - Backend (Node.js / Express)
// =============================================================================
// Uses process.env for Node.js environment variables
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Service key has full admin access - use for server-side operations only
// Falls back to anon key if service key not set
const supabaseKey = supabaseServiceKey || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured. Using SQLite fallback.');
}

// Create Supabase client (will be null if not configured)
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Check if Supabase is available
export const isSupabaseConfigured = () => !!supabase;

export default supabase;
