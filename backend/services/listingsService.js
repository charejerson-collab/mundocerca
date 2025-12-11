// =============================================================================
// MundoCerca - Listings Service
// =============================================================================
// Production-grade listings CRUD with search, pagination, and filtering
// =============================================================================

import { supabase } from '../server.js';
import { getMaxListings } from './profilesService.js';

/**
 * Listing categories
 */
export const CATEGORIES = ['house', 'apartment', 'room', 'business', 'land', 'office'];

/**
 * Listing statuses
 */
export const STATUSES = ['draft', 'pending', 'active', 'paused', 'sold', 'rented', 'archived'];

/**
 * Get listings with filtering, search, and pagination
 * @param {Object} options - Query options
 * @returns {Promise<{data: Object[], count: number, page: number, pageSize: number}>}
 */
export async function getListings({
  search = null,
  cityId = null,
  category = null,
  minPrice = null,
  maxPrice = null,
  bedrooms = null,
  ownerId = null,
  status = 'active',
  featured = null,
  page = 1,
  pageSize = 20,
  sortBy = 'created_at',
  sortOrder = 'desc',
} = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const offset = (page - 1) * pageSize;

  // Use the search function for complex queries
  if (search) {
    const { data, error } = await supabase.rpc('search_listings', {
      search_query: search,
      p_city_id: cityId,
      p_category: category,
      p_min_price: minPrice,
      p_max_price: maxPrice,
      p_bedrooms: bedrooms,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) throw error;

    // Get total count
    const { data: countResult } = await supabase.rpc('count_listings', {
      search_query: search,
      p_city_id: cityId,
      p_category: category,
      p_min_price: minPrice,
      p_max_price: maxPrice,
      p_bedrooms: bedrooms,
    });

    return {
      data: data || [],
      count: countResult || 0,
      page,
      pageSize,
      totalPages: Math.ceil((countResult || 0) / pageSize),
    };
  }

  // Build query for non-search requests
  let query = supabase
    .from('listings')
    .select(`
      id,
      title,
      slug,
      description,
      price,
      price_type,
      currency,
      category,
      property_type,
      bedrooms,
      bathrooms,
      area_sqm,
      city_id,
      neighborhood,
      featured_image,
      images,
      status,
      is_featured,
      is_verified,
      views_count,
      favorites_count,
      created_at,
      published_at,
      owner:profiles!owner_id (
        id,
        name,
        avatar_url,
        is_verified
      )
    `, { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }
  if (cityId) {
    query = query.eq('city_id', cityId);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (minPrice !== null) {
    query = query.gte('price', minPrice);
  }
  if (maxPrice !== null) {
    query = query.lte('price', maxPrice);
  }
  if (bedrooms !== null) {
    query = query.gte('bedrooms', bedrooms);
  }
  if (featured !== null) {
    query = query.eq('is_featured', featured);
  }

  // Apply sorting
  const validSortFields = ['created_at', 'price', 'views_count', 'published_at'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  query = query.order('is_featured', { ascending: false }) // Featured first
    .order(sortField, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get single listing by ID or slug
 * @param {string|number} identifier - Listing ID or slug
 * @returns {Promise<Object>}
 */
export async function getListing(identifier) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const isId = !isNaN(Number(identifier));
  
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      owner:profiles!owner_id (
        id,
        name,
        avatar_url,
        phone,
        is_verified,
        company_name
      )
    `)
    .eq(isId ? 'id' : 'slug', identifier)
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
 * Create a new listing
 * @param {string} ownerId - Owner user ID
 * @param {Object} listingData - Listing data
 * @returns {Promise<Object>}
 */
export async function createListing(ownerId, listingData) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Check listing limit
  const maxListings = await getMaxListings(ownerId);
  const { count: currentCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .not('status', 'in', '("archived","sold","rented")');

  if (currentCount >= maxListings) {
    throw new Error(`Listing limit reached. Your plan allows ${maxListings} active listings. Please upgrade to add more.`);
  }

  // Validate required fields
  const required = ['title', 'price', 'city_id', 'category'];
  for (const field of required) {
    if (!listingData[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Validate category
  if (!CATEGORIES.includes(listingData.category)) {
    throw new Error(`Invalid category. Must be one of: ${CATEGORIES.join(', ')}`);
  }

  // Validate price
  if (typeof listingData.price !== 'number' || listingData.price < 0) {
    throw new Error('Price must be a positive number');
  }

  // Sanitize data
  const sanitized = {
    owner_id: ownerId,
    title: listingData.title.trim().substring(0, 200),
    description: listingData.description?.substring(0, 5000) || null,
    price: Math.floor(listingData.price),
    price_type: listingData.price_type || 'monthly',
    currency: listingData.currency || 'MXN',
    category: listingData.category,
    property_type: listingData.property_type || 'rent',
    bedrooms: Math.max(0, parseInt(listingData.bedrooms) || 0),
    bathrooms: Math.max(0, parseInt(listingData.bathrooms) || 0),
    area_sqm: listingData.area_sqm ? Math.max(1, parseInt(listingData.area_sqm)) : null,
    parking_spaces: Math.max(0, parseInt(listingData.parking_spaces) || 0),
    city_id: listingData.city_id,
    neighborhood: listingData.neighborhood?.substring(0, 100) || null,
    address: listingData.address?.substring(0, 200) || null,
    latitude: listingData.latitude || null,
    longitude: listingData.longitude || null,
    images: Array.isArray(listingData.images) ? listingData.images.slice(0, 20) : [],
    featured_image: listingData.featured_image || listingData.images?.[0] || null,
    whatsapp: listingData.whatsapp?.substring(0, 20) || null,
    email: listingData.email?.substring(0, 100) || null,
    show_phone: listingData.show_phone !== false,
    amenities: listingData.amenities || [],
    features: listingData.features || {},
    status: 'draft', // Always start as draft
    meta_title: listingData.meta_title?.substring(0, 70) || null,
    meta_description: listingData.meta_description?.substring(0, 160) || null,
  };

  const { data, error } = await supabase
    .from('listings')
    .insert(sanitized)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update a listing
 * @param {number} listingId - Listing ID
 * @param {string} ownerId - Owner user ID (for authorization)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateListing(listingId, ownerId, updates) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', listingId)
    .single();

  if (!existing) {
    throw new Error('Listing not found');
  }

  if (existing.owner_id !== ownerId) {
    throw new Error('Unauthorized: You do not own this listing');
  }

  // Remove protected fields
  const sanitized = { ...updates };
  delete sanitized.id;
  delete sanitized.owner_id;
  delete sanitized.created_at;
  delete sanitized.views_count;
  delete sanitized.favorites_count;
  delete sanitized.inquiries_count;
  delete sanitized.is_verified; // Admin only

  // Validate fields if present
  if (sanitized.category && !CATEGORIES.includes(sanitized.category)) {
    throw new Error('Invalid category');
  }
  if (sanitized.status && !STATUSES.includes(sanitized.status)) {
    throw new Error('Invalid status');
  }
  if (sanitized.price !== undefined && (typeof sanitized.price !== 'number' || sanitized.price < 0)) {
    throw new Error('Price must be a positive number');
  }

  const { data, error } = await supabase
    .from('listings')
    .update(sanitized)
    .eq('id', listingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Publish a listing (change status from draft to active)
 * @param {number} listingId - Listing ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<Object>}
 */
export async function publishListing(listingId, ownerId) {
  return updateListing(listingId, ownerId, { status: 'active' });
}

/**
 * Archive a listing (soft delete)
 * @param {number} listingId - Listing ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<Object>}
 */
export async function archiveListing(listingId, ownerId) {
  return updateListing(listingId, ownerId, { status: 'archived' });
}

/**
 * Delete a listing permanently
 * @param {number} listingId - Listing ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<boolean>}
 */
export async function deleteListing(listingId, ownerId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', listingId)
    .single();

  if (!existing) {
    throw new Error('Listing not found');
  }

  if (existing.owner_id !== ownerId) {
    throw new Error('Unauthorized: You do not own this listing');
  }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (error) throw error;

  return true;
}

/**
 * Get owner's listings with drafts
 * @param {string} ownerId - Owner user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>}
 */
export async function getOwnerListings(ownerId, { status = null, page = 1, pageSize = 20 } = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Increment view count
 * @param {number} listingId - Listing ID
 */
export async function incrementViewCount(listingId) {
  if (!supabase) return;

  await supabase.rpc('increment', {
    row_id: listingId,
    table_name: 'listings',
    column_name: 'views_count',
  }).catch(() => {
    // Fallback if RPC doesn't exist
    supabase
      .from('listings')
      .update({ views_count: supabase.raw('views_count + 1') })
      .eq('id', listingId);
  });
}

export default {
  CATEGORIES,
  STATUSES,
  getListings,
  getListing,
  createListing,
  updateListing,
  publishListing,
  archiveListing,
  deleteListing,
  getOwnerListings,
  incrementViewCount,
};
