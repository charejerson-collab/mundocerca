// =============================================================================
// Subscriptions Service - Subscription management
// =============================================================================
// Uses Supabase if configured, falls back to backend API
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
// GET USER SUBSCRIPTION
// =============================================================================
export async function getSubscription(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw { error: error.message };
    }
    
    return data || null;
  }
  
  return apiCall('/api/subscription');
}

// =============================================================================
// ACTIVATE SUBSCRIPTION
// =============================================================================
export async function activateSubscription(userId, plan) {
  if (isSupabaseConfigured() && userId) {
    // Calculate free month end date
    const freeMonthEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        status: 'active',
        free_month_applied: true,
        start_date: new Date().toISOString(),
        free_month_ends: freeMonthEnds,
      })
      .select()
      .single();
    
    if (error) throw { error: error.message };
    
    return {
      ok: true,
      subscription: data,
    };
  }
  
  return apiCall('/api/subscription/activate', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

// =============================================================================
// CANCEL SUBSCRIPTION
// =============================================================================
export async function cancelSubscription(userId) {
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (error) throw { error: error.message };
    return { ok: true };
  }
  
  return apiCall('/api/subscription/cancel', {
    method: 'POST',
  });
}

// =============================================================================
// UPDATE SUBSCRIPTION PLAN
// =============================================================================
export async function updateSubscriptionPlan(userId, newPlan) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall('/api/subscription/update', {
    method: 'PUT',
    body: JSON.stringify({ plan: newPlan }),
  });
}

export default {
  getSubscription,
  activateSubscription,
  cancelSubscription,
  updateSubscriptionPlan,
};
