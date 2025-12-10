// =============================================================================
// Properties Routes - Backend API (Railway)
// =============================================================================
// GET    /api/properties
// GET    /api/properties/:id
// POST   /api/properties
// PUT    /api/properties/:id
// DELETE /api/properties/:id
// =============================================================================

import express from 'express';
import { supabase } from './supabaseClient.js';
import { authMiddleware } from './authRoutes.js';

const router = express.Router();

// =============================================================================
// GET /api/properties - List all properties (public)
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { city_id, category, min_price, max_price, bedrooms, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('properties')
      .select(`
        id,
        title,
        description,
        price,
        city_id,
        category,
        bedrooms,
        bathrooms,
        image_url,
        whatsapp,
        is_active,
        created_at,
        landlord_id,
        landlords (
          id,
          business_name,
          user_id,
          users (name, avatar_url)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (city_id) query = query.eq('city_id', city_id);
    if (category) query = query.eq('category', category);
    if (min_price) query = query.gte('price', parseInt(min_price));
    if (max_price) query = query.lte('price', parseInt(max_price));
    if (bedrooms) query = query.gte('bedrooms', parseInt(bedrooms));
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Properties list error:', error);
      return res.status(500).json({ error: 'Failed to fetch properties' });
    }
    
    res.json({
      properties: data || [],
      count: data?.length || 0,
    });
    
  } catch (err) {
    console.error('Properties error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// GET /api/properties/:id - Get single property (public)
// =============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        landlords (
          id,
          business_name,
          verified,
          user_id,
          users (name, avatar_url, phone)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ property: data });
    
  } catch (err) {
    console.error('Property get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// POST /api/properties - Create property (protected)
// =============================================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      city_id, 
      category, 
      bedrooms = 0, 
      bathrooms = 0,
      image_url,
      whatsapp,
    } = req.body;
    
    // Validation
    if (!title || !price || !city_id || !category) {
      return res.status(400).json({ 
        error: 'Title, price, city_id, and category are required' 
      });
    }
    
    const validCategories = ['house', 'apartment', 'room', 'business'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Category must be one of: ${validCategories.join(', ')}` 
      });
    }
    
    // Check if user is a landlord
    let { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    // Auto-create landlord profile if not exists
    if (!landlord) {
      const { data: newLandlord, error: landlordError } = await supabase
        .from('landlords')
        .insert({
          user_id: req.user.id,
          business_name: req.user.name,
          verified: false,
        })
        .select('id')
        .single();
      
      if (landlordError) {
        console.error('Landlord creation error:', landlordError);
        return res.status(500).json({ error: 'Failed to create landlord profile' });
      }
      
      landlord = newLandlord;
    }
    
    // Create property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: landlord.id,
        title,
        description: description || '',
        price: parseInt(price),
        city_id,
        category,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        image_url: image_url || null,
        whatsapp: whatsapp || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Property creation error:', error);
      return res.status(500).json({ error: 'Failed to create property' });
    }
    
    res.status(201).json({
      property,
      message: 'Property created successfully',
    });
    
  } catch (err) {
    console.error('Property create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// PUT /api/properties/:id - Update property (protected)
// =============================================================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get landlord for this user
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (!landlord) {
      return res.status(403).json({ error: 'Not authorized to update properties' });
    }
    
    // Check ownership
    const { data: existing } = await supabase
      .from('properties')
      .select('id, landlord_id')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    if (existing.landlord_id !== landlord.id) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }
    
    // Allowed update fields
    const allowedFields = ['title', 'description', 'price', 'city_id', 'category', 
                          'bedrooms', 'bathrooms', 'image_url', 'whatsapp', 'is_active'];
    
    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }
    
    sanitizedUpdates.updated_at = new Date().toISOString();
    
    const { data: property, error } = await supabase
      .from('properties')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Property update error:', error);
      return res.status(500).json({ error: 'Failed to update property' });
    }
    
    res.json({
      property,
      message: 'Property updated successfully',
    });
    
  } catch (err) {
    console.error('Property update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// DELETE /api/properties/:id - Delete property (protected)
// =============================================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get landlord for this user
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (!landlord) {
      return res.status(403).json({ error: 'Not authorized to delete properties' });
    }
    
    // Check ownership
    const { data: existing } = await supabase
      .from('properties')
      .select('id, landlord_id')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    if (existing.landlord_id !== landlord.id) {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }
    
    // Soft delete (set is_active = false)
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Property delete error:', error);
      return res.status(500).json({ error: 'Failed to delete property' });
    }
    
    res.json({ message: 'Property deleted successfully' });
    
  } catch (err) {
    console.error('Property delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
