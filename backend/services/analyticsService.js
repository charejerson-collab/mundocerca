// =============================================================================
// MundoCerca - Analytics Service
// =============================================================================
// Track listing views, engagement, and seller dashboard metrics
// =============================================================================

import crypto from 'crypto';
import { supabase } from '../server.js';

/**
 * Generate anonymous visitor hash from request data
 * Uses IP + User-Agent for fingerprinting (privacy-friendly)
 * @param {Object} req - Express request object
 * @returns {string} Hashed visitor identifier
 */
export function generateVisitorHash(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const raw = `${ip}:${ua}`;
  
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {'desktop'|'mobile'|'tablet'|'unknown'}
 */
export function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  if (/windows|macintosh|linux/i.test(ua)) {
    return 'desktop';
  }
  
  return 'unknown';
}

/**
 * Record a listing view
 * @param {Object} options - View data
 * @returns {Promise<{isUnique: boolean, viewId: number}>}
 */
export async function recordView({
  listingId,
  viewerId = null,
  visitorHash,
  sessionId = null,
  referrer = null,
  userAgent = null,
  deviceType = 'unknown',
  utmSource = null,
  utmMedium = null,
  utmCampaign = null,
}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Use Supabase RPC for atomic operation
  try {
    const { data: isUnique } = await supabase.rpc('record_listing_view', {
      p_listing_id: listingId,
      p_visitor_hash: visitorHash,
      p_session_id: sessionId,
      p_viewer_id: viewerId,
      p_referrer: referrer,
      p_user_agent: userAgent,
      p_device_type: deviceType,
    });

    return { isUnique: isUnique === true };
  } catch (error) {
    // Fallback to direct insert if RPC doesn't exist
    const { data, error: insertError } = await supabase
      .from('listing_views')
      .insert({
        listing_id: listingId,
        viewer_id: viewerId,
        visitor_hash: visitorHash,
        session_id: sessionId,
        referrer,
        user_agent: userAgent,
        device_type: deviceType,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Update view count
    await supabase
      .from('listings')
      .update({ views_count: supabase.sql`views_count + 1` })
      .eq('id', listingId);

    // Check if unique (simple check - same visitor in last 24h)
    const { count } = await supabase
      .from('listing_views')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('visitor_hash', visitorHash)
      .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return { isUnique: count === 1, viewId: data?.id };
  }
}

/**
 * Update view engagement metrics
 * @param {Object} options - Engagement data
 * @returns {Promise<boolean>}
 */
export async function updateViewEngagement({
  listingId,
  visitorHash,
  sessionId = null,
  durationSeconds = null,
  scrollDepth = null,
  clickedContact = null,
  clickedWhatsapp = null,
  addedFavorite = null,
}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data } = await supabase.rpc('update_view_engagement', {
      p_listing_id: listingId,
      p_visitor_hash: visitorHash,
      p_session_id: sessionId,
      p_duration_seconds: durationSeconds,
      p_scroll_depth: scrollDepth,
      p_clicked_contact: clickedContact,
      p_clicked_whatsapp: clickedWhatsapp,
      p_added_favorite: addedFavorite,
    });

    return data === true;
  } catch (error) {
    // Fallback to direct update
    const updates = {};
    if (durationSeconds !== null) updates.duration_seconds = durationSeconds;
    if (scrollDepth !== null) updates.scroll_depth = scrollDepth;
    if (clickedContact !== null) updates.clicked_contact = clickedContact;
    if (clickedWhatsapp !== null) updates.clicked_whatsapp = clickedWhatsapp;
    if (addedFavorite !== null) updates.added_favorite = addedFavorite;

    if (Object.keys(updates).length === 0) return false;

    const { error: updateError } = await supabase
      .from('listing_views')
      .update(updates)
      .eq('listing_id', listingId)
      .eq('visitor_hash', visitorHash)
      .gte('viewed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('viewed_at', { ascending: false })
      .limit(1);

    return !updateError;
  }
}

/**
 * Get analytics summary for a listing
 * @param {number} listingId - Listing ID
 * @param {string} period - Time period ('7d', '30d', '90d', 'all')
 * @returns {Promise<Object>}
 */
export async function getListingAnalytics(listingId, period = '30d') {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.rpc('get_listing_analytics', {
      p_listing_id: listingId,
      p_period: period,
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    // Fallback to direct query
    const periodMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': 100 * 365 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - (periodMs[period] || periodMs['30d'])).toISOString();

    const { data: views, error: viewsError } = await supabase
      .from('listing_views')
      .select('*')
      .eq('listing_id', listingId)
      .gte('viewed_at', since);

    if (viewsError) throw viewsError;

    const uniqueVisitors = new Set(views.map(v => v.visitor_hash)).size;
    const totalViews = views.length;
    const avgDuration = views.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / (totalViews || 1);
    const avgScroll = views.reduce((sum, v) => sum + (v.scroll_depth || 0), 0) / (totalViews || 1);
    const contactClicks = views.filter(v => v.clicked_contact).length;
    const whatsappClicks = views.filter(v => v.clicked_whatsapp).length;
    const favorites = views.filter(v => v.added_favorite).length;
    const desktopViews = views.filter(v => v.device_type === 'desktop').length;
    const mobileViews = views.filter(v => v.device_type === 'mobile').length;

    return {
      total_views: totalViews,
      unique_visitors: uniqueVisitors,
      avg_duration_seconds: Math.round(avgDuration * 10) / 10,
      avg_scroll_depth: Math.round(avgScroll * 10) / 10,
      contact_rate: totalViews ? Math.round((contactClicks / totalViews) * 10000) / 100 : 0,
      whatsapp_rate: totalViews ? Math.round((whatsappClicks / totalViews) * 10000) / 100 : 0,
      favorite_rate: totalViews ? Math.round((favorites / totalViews) * 10000) / 100 : 0,
      desktop_pct: totalViews ? Math.round((desktopViews / totalViews) * 1000) / 10 : 0,
      mobile_pct: totalViews ? Math.round((mobileViews / totalViews) * 1000) / 10 : 0,
    };
  }
}

/**
 * Get daily analytics for charts
 * @param {number} listingId - Listing ID
 * @param {number} days - Number of days
 * @returns {Promise<Object[]>}
 */
export async function getListingAnalyticsDaily(listingId, days = 30) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.rpc('get_listing_analytics_daily', {
      p_listing_id: listingId,
      p_days: days,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    // Fallback
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: views } = await supabase
      .from('listing_views')
      .select('visitor_hash, clicked_contact, clicked_whatsapp, viewed_at')
      .eq('listing_id', listingId)
      .gte('viewed_at', since);

    // Group by date
    const byDate = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      byDate[date] = { date, views: 0, unique_visitors: new Set(), contact_clicks: 0 };
    }

    (views || []).forEach(v => {
      const date = v.viewed_at.split('T')[0];
      if (byDate[date]) {
        byDate[date].views++;
        byDate[date].unique_visitors.add(v.visitor_hash);
        if (v.clicked_contact || v.clicked_whatsapp) {
          byDate[date].contact_clicks++;
        }
      }
    });

    return Object.values(byDate)
      .map(d => ({
        date: d.date,
        views: d.views,
        unique_visitors: d.unique_visitors.size,
        contact_clicks: d.contact_clicks,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

/**
 * Get seller dashboard summary
 * @param {string} sellerId - Seller user ID
 * @returns {Promise<Object>}
 */
export async function getSellerDashboard(sellerId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.rpc('get_seller_dashboard', {
      p_seller_id: sellerId,
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    // Fallback to manual queries
    const { count: totalListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', sellerId);

    const { count: activeListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', sellerId)
      .eq('status', 'active');

    const { data: listings } = await supabase
      .from('listings')
      .select('views_count, favorites_count, inquiries_count')
      .eq('owner_id', sellerId);

    const totalViews = (listings || []).reduce((sum, l) => sum + (l.views_count || 0), 0);
    const totalFavorites = (listings || []).reduce((sum, l) => sum + (l.favorites_count || 0), 0);
    const totalInquiries = (listings || []).reduce((sum, l) => sum + (l.inquiries_count || 0), 0);

    return {
      total_listings: totalListings || 0,
      active_listings: activeListings || 0,
      total_views: totalViews,
      total_unique_visitors: 0, // Would need views table query
      total_inquiries: totalInquiries,
      total_favorites: totalFavorites,
      views_this_month: 0,
      views_change_pct: 0,
    };
  }
}

/**
 * Express middleware to track views
 * @returns {Function} Express middleware
 */
export function trackViewMiddleware() {
  return async (req, res, next) => {
    const listingId = req.params.id || req.params.listingId;
    
    if (!listingId) {
      return next();
    }

    try {
      const visitorHash = generateVisitorHash(req);
      const deviceType = detectDeviceType(req.headers['user-agent']);

      await recordView({
        listingId: parseInt(listingId),
        viewerId: req.user?.id || null,
        visitorHash,
        sessionId: req.headers['x-session-id'] || null,
        referrer: req.headers.referer || null,
        userAgent: req.headers['user-agent'],
        deviceType,
        utmSource: req.query.utm_source || null,
        utmMedium: req.query.utm_medium || null,
        utmCampaign: req.query.utm_campaign || null,
      });
    } catch (error) {
      console.error('Error tracking view:', error);
      // Don't block the request
    }

    next();
  };
}

export default {
  generateVisitorHash,
  detectDeviceType,
  recordView,
  updateViewEngagement,
  getListingAnalytics,
  getListingAnalyticsDaily,
  getSellerDashboard,
  trackViewMiddleware,
};
