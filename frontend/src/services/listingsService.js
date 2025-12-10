// =============================================================================
// Listings Service - CRUD operations for property listings
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
// GET ALL LISTINGS
// =============================================================================
export async function getListings(filters = {}) {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('listings')
      .select('*')
      .order('id', { ascending: false });
    
    // Apply filters
    if (filters.city_id) {
      query = query.eq('city_id', filters.city_id);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    if (error) throw { error: error.message };
    return data || [];
  }
  
  // Fallback to backend API
  return apiCall('/api/listings');
}

// =============================================================================
// GET SINGLE LISTING
// =============================================================================
export async function getListing(id) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall(`/api/listings/${id}`);
}

// =============================================================================
// CREATE LISTING
// =============================================================================
export async function createListing(listing) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('listings')
      .insert(listing)
      .select()
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall('/api/listings', {
    method: 'POST',
    body: JSON.stringify(listing),
  });
}

// =============================================================================
// UPDATE LISTING
// =============================================================================
export async function updateListing(id, updates) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall(`/api/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// =============================================================================
// DELETE LISTING
// =============================================================================
export async function deleteListing(id) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    
    if (error) throw { error: error.message };
    return { ok: true };
  }
  
  return apiCall(`/api/listings/${id}`, {
    method: 'DELETE',
  });
}

export default {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
};
