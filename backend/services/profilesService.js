// =============================================================================
// MundoCerca - Profiles Service
// =============================================================================
// Production-grade profile management with role-based access
// =============================================================================

import { supabase } from '../server.js';

/**
 * Profile roles
 */
export const ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  LANDLORD: 'landlord',
  ADMIN: 'admin',
};

/**
 * Subscription statuses
 */
export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  BUSINESS: 'business',
};

/**
 * Get profile by user ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Profile data
 */
export async function getProfile(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      name,
      phone,
      avatar_url,
      role,
      subscription_status,
      subscription_expires_at,
      bio,
      company_name,
      website,
      location,
      is_verified,
      verified_at,
      created_at,
      updated_at
    `)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Get public profile (limited fields for non-owners)
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Public profile data
 */
export async function getPublicProfile(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Update user profile
 * @param {string} userId - User UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated profile
 */
export async function updateProfile(userId, updates) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Sanitize updates - remove protected fields
  const sanitized = { ...updates };
  delete sanitized.id;
  delete sanitized.email;
  delete sanitized.role; // Role changes require admin
  delete sanitized.subscription_status; // Managed by subscription system
  delete sanitized.subscription_expires_at;
  delete sanitized.stripe_customer_id;
  delete sanitized.is_verified;
  delete sanitized.verified_at;
  delete sanitized.created_at;

  // Validate fields
  if (sanitized.name && (typeof sanitized.name !== 'string' || sanitized.name.length > 100)) {
    throw new Error('Invalid name');
  }
  if (sanitized.phone && !/^\+?[\d\s-]{7,20}$/.test(sanitized.phone)) {
    throw new Error('Invalid phone format');
  }
  if (sanitized.website && sanitized.website.length > 200) {
    throw new Error('Website URL too long');
  }
  if (sanitized.bio && sanitized.bio.length > 500) {
    throw new Error('Bio too long (max 500 characters)');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(sanitized)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user role (admin only)
 * @param {string} userId - User UUID
 * @param {string} newRole - New role
 * @param {string} adminId - Admin user ID (for audit)
 * @returns {Promise<Object>} Updated profile
 */
export async function updateUserRole(userId, newRole, adminId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Validate role
  if (!Object.values(ROLES).includes(newRole)) {
    throw new Error('Invalid role');
  }

  // Verify admin has admin role
  const admin = await getProfile(adminId);
  if (!admin || admin.role !== ROLES.ADMIN) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Log role change for audit
  console.log(`[AUDIT] Role changed for ${userId} to ${newRole} by admin ${adminId}`);

  return data;
}

/**
 * Check if user has specific role
 * @param {string} userId - User UUID
 * @param {string} requiredRole - Required role
 * @returns {Promise<boolean>}
 */
export async function hasRole(userId, requiredRole) {
  const profile = await getProfile(userId);
  if (!profile) return false;
  
  // Admin has all roles
  if (profile.role === ROLES.ADMIN) return true;
  
  return profile.role === requiredRole;
}

/**
 * Check if user is premium (pro or business)
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>}
 */
export async function isPremium(userId) {
  const profile = await getProfile(userId);
  if (!profile) return false;
  
  const premiumPlans = [SUBSCRIPTION_STATUS.PRO, SUBSCRIPTION_STATUS.BUSINESS];
  
  if (!premiumPlans.includes(profile.subscription_status)) {
    return false;
  }
  
  // Check expiration
  if (profile.subscription_expires_at) {
    return new Date(profile.subscription_expires_at) > new Date();
  }
  
  return true;
}

/**
 * Get user's max listings based on subscription
 * @param {string} userId - User UUID
 * @returns {Promise<number>}
 */
export async function getMaxListings(userId) {
  const profile = await getProfile(userId);
  if (!profile) return 0;
  
  const limits = {
    [SUBSCRIPTION_STATUS.FREE]: 1,
    [SUBSCRIPTION_STATUS.BASIC]: 2,
    [SUBSCRIPTION_STATUS.PRO]: 10,
    [SUBSCRIPTION_STATUS.BUSINESS]: 100,
  };
  
  return limits[profile.subscription_status] || 1;
}

/**
 * Search profiles (for admin or messaging)
 * @param {Object} filters - Search filters
 * @returns {Promise<Object[]>}
 */
export async function searchProfiles({ query, role, limit = 20, offset = 0 }) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  let queryBuilder = supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role, is_verified')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (role) {
    queryBuilder = queryBuilder.eq('role', role);
  }

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  return data;
}

/**
 * Update last login timestamp
 * @param {string} userId - User UUID
 */
export async function updateLastLogin(userId) {
  if (!supabase) return;

  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}

export default {
  ROLES,
  SUBSCRIPTION_STATUS,
  getProfile,
  getPublicProfile,
  updateProfile,
  updateUserRole,
  hasRole,
  isPremium,
  getMaxListings,
  searchProfiles,
  updateLastLogin,
};
