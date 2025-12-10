// =============================================================================
// Supabase Client - Backend (Node.js/Express) - Railway
// =============================================================================
// Uses SERVICE_ROLE_KEY for full database access
// NEVER expose this file or its keys to the frontend
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  console.error('   Set these environment variables in Railway');
}

// Create Supabase admin client with service role key
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Check if Supabase is configured
export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseServiceKey);

export default supabase;
