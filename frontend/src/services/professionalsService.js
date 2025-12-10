// =============================================================================
// Professionals Service - CRUD operations for service professionals
// =============================================================================
// Uses Supabase if configured, falls back to backend API
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_ROOT = import.meta.env.VITE_API_ROOT || '';

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
// GET ALL PROFESSIONALS
// =============================================================================
export async function getProfessionals(filters = {}) {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('professionals')
      .select('*')
      .order('rating', { ascending: false });
    
    // Apply filters
    if (filters.city_id) {
      query = query.eq('city_id', filters.city_id);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    if (error) throw { error: error.message };
    return data || [];
  }
  
  // Fallback to backend API
  return apiCall('/api/pros');
}

// =============================================================================
// GET SINGLE PROFESSIONAL
// =============================================================================
export async function getProfessional(id) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall(`/api/pros/${id}`);
}

// =============================================================================
// CREATE PROFESSIONAL
// =============================================================================
export async function createProfessional(professional) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('professionals')
      .insert(professional)
      .select()
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall('/api/pros', {
    method: 'POST',
    body: JSON.stringify(professional),
  });
}

// =============================================================================
// UPDATE PROFESSIONAL
// =============================================================================
export async function updateProfessional(id, updates) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('professionals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw { error: error.message };
    return data;
  }
  
  return apiCall(`/api/pros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// =============================================================================
// DELETE PROFESSIONAL
// =============================================================================
export async function deleteProfessional(id) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', id);
    
    if (error) throw { error: error.message };
    return { ok: true };
  }
  
  return apiCall(`/api/pros/${id}`, {
    method: 'DELETE',
  });
}

export default {
  getProfessionals,
  getProfessional,
  createProfessional,
  updateProfessional,
  deleteProfessional,
};
