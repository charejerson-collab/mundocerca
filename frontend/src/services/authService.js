// =============================================================================
// Auth Service - Supabase Authentication
// =============================================================================
// Provides signUp, signIn, signOut, getUser functions
// Falls back to backend API if Supabase is not configured
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_ROOT = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_ROOT || '';

// Helper for API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('mc_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  const res = await fetch(`${API_ROOT}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

// =============================================================================
// SIGN UP
// =============================================================================
export async function signUp(name, email, password) {
  if (isSupabaseConfigured()) {
    // Use Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Store name in user metadata
      },
    });
    
    if (error) throw { error: error.message };
    
    // Also insert into users table for app-specific data
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email,
        name,
        created_at: new Date().toISOString(),
      });
    }
    
    return {
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name,
      },
      session: data.session,
    };
  }
  
  // Fallback to backend API
  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  
  if (result.token) {
    localStorage.setItem('mc_token', result.token);
  }
  
  return result;
}

// =============================================================================
// SIGN IN
// =============================================================================
export async function signIn(email, password) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw { error: error.message };
    
    // Get user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name,
        ...profile,
      },
      session: data.session,
    };
  }
  
  // Fallback to backend API
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  if (result.token) {
    localStorage.setItem('mc_token', result.token);
  }
  
  return result;
}

// =============================================================================
// SIGN OUT
// =============================================================================
export async function signOut() {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.auth.signOut();
    if (error) throw { error: error.message };
  }
  
  // Clear local storage regardless
  localStorage.removeItem('mc_token');
  localStorage.removeItem('mc_user');
  
  return { ok: true };
}

// =============================================================================
// GET CURRENT USER
// =============================================================================
export async function getUser() {
  if (isSupabaseConfigured()) {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;
    
    // Get full profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name,
      ...profile,
    };
  }
  
  // Fallback: check localStorage
  const stored = localStorage.getItem('mc_user');
  return stored ? JSON.parse(stored) : null;
}

// =============================================================================
// PASSWORD RESET (using backend API - more control)
// =============================================================================
export async function requestPasswordReset(email) {
  return apiCall('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetOtp(email, otp) {
  return apiCall('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword(email, resetToken, newPassword) {
  return apiCall('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
}

// =============================================================================
// AUTH STATE LISTENER
// =============================================================================
export function onAuthStateChange(callback) {
  if (isSupabaseConfigured()) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null);
    });
  }
  
  // No-op for non-Supabase
  return { data: { subscription: { unsubscribe: () => {} } } };
}

export default {
  signUp,
  signIn,
  signOut,
  getUser,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
  onAuthStateChange,
};
