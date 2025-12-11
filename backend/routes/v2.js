// =============================================================================
// MundoCerca - API Routes (Production Features)
// =============================================================================
// Modular routes for profiles, listings, analytics, messaging, subscriptions
// =============================================================================

import express from 'express';
import { supabase, authMiddleware, JWT_SECRET } from '../server.js';
import * as profilesService from '../services/profilesService.js';
import * as listingsService from '../services/listingsService.js';
import * as analyticsService from '../services/analyticsService.js';
import * as messagingService from '../services/messagingService.js';
import * as subscriptionsService from '../services/subscriptionsService.js';

const router = express.Router();

// =============================================================================
// PROFILES ROUTES
// =============================================================================

/**
 * GET /api/v2/profiles/me - Get current user's profile
 */
router.get('/profiles/me', authMiddleware, async (req, res) => {
  try {
    const profile = await profilesService.getProfileById(req.user.id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/v2/profiles/me - Update current user's profile
 */
router.put('/profiles/me', authMiddleware, async (req, res) => {
  try {
    const profile = await profilesService.updateProfile(req.user.id, req.body);
    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/profiles/:id - Get public profile
 */
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await profilesService.getPublicProfile(req.params.id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// =============================================================================
// LISTINGS ROUTES (Enhanced)
// =============================================================================

/**
 * GET /api/v2/listings - Get listings with pagination and filters
 */
router.get('/listings', async (req, res) => {
  try {
    const filters = {
      city: req.query.city,
      category: req.query.category,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined,
      bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms) : undefined,
      bathrooms: req.query.bathrooms ? parseInt(req.query.bathrooms) : undefined,
      status: req.query.status || 'active',
      featured: req.query.featured === 'true',
    };
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';
    
    const result = await listingsService.getListings({
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * GET /api/v2/listings/search - Search listings
 */
router.get('/listings/search', async (req, res) => {
  try {
    const { q, ...filters } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const result = await listingsService.searchListings(q, {
      city: filters.city,
      category: filters.category,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error searching listings:', error);
    res.status(500).json({ error: 'Failed to search listings' });
  }
});

/**
 * GET /api/v2/listings/:id - Get single listing (with view tracking)
 */
router.get('/listings/:id', analyticsService.trackViewMiddleware(), async (req, res) => {
  try {
    const listing = await listingsService.getListingById(parseInt(req.params.id));
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

/**
 * POST /api/v2/listings - Create listing (auth required)
 */
router.post('/listings', authMiddleware, async (req, res) => {
  try {
    // Check plan limits
    const limitCheck = await subscriptionsService.checkPlanLimit(req.user.id, 'create_listing');
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        error: limitCheck.reason,
        upgrade: true,
        limit: limitCheck.limit,
        current: limitCheck.current,
      });
    }
    
    const listing = await listingsService.createListing(req.body, req.user.id);
    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/listings/:id - Update listing (owner only)
 */
router.put('/listings/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await listingsService.updateListing(
      parseInt(req.params.id),
      req.body,
      req.user.id
    );
    res.json(listing);
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/v2/listings/:id - Delete listing (owner only)
 */
router.delete('/listings/:id', authMiddleware, async (req, res) => {
  try {
    await listingsService.deleteListing(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/v2/listings/:id/feature - Feature a listing
 */
router.post('/listings/:id/feature', authMiddleware, async (req, res) => {
  try {
    const limitCheck = await subscriptionsService.checkPlanLimit(req.user.id, 'feature_listing');
    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        error: limitCheck.reason,
        upgrade: true,
      });
    }
    
    const listing = await listingsService.updateListing(
      parseInt(req.params.id),
      { is_featured: true },
      req.user.id
    );
    res.json(listing);
  } catch (error) {
    console.error('Error featuring listing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/listings/user/:userId - Get user's listings
 */
router.get('/listings/user/:userId', async (req, res) => {
  try {
    const result = await listingsService.getListings({
      filters: { ownerId: req.params.userId },
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

/**
 * POST /api/v2/analytics/view - Record a view (for SPA tracking)
 */
router.post('/analytics/view', async (req, res) => {
  try {
    const { listingId, sessionId } = req.body;
    
    if (!listingId) {
      return res.status(400).json({ error: 'listingId required' });
    }
    
    const visitorHash = analyticsService.generateVisitorHash(req);
    const deviceType = analyticsService.detectDeviceType(req.headers['user-agent']);
    
    const result = await analyticsService.recordView({
      listingId,
      viewerId: req.user?.id || null,
      visitorHash,
      sessionId,
      referrer: req.headers.referer,
      userAgent: req.headers['user-agent'],
      deviceType,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

/**
 * POST /api/v2/analytics/engagement - Update engagement metrics
 */
router.post('/analytics/engagement', async (req, res) => {
  try {
    const { listingId, sessionId, ...metrics } = req.body;
    
    if (!listingId) {
      return res.status(400).json({ error: 'listingId required' });
    }
    
    const visitorHash = analyticsService.generateVisitorHash(req);
    
    await analyticsService.updateViewEngagement({
      listingId,
      visitorHash,
      sessionId,
      ...metrics,
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating engagement:', error);
    res.status(500).json({ error: 'Failed to update engagement' });
  }
});

/**
 * GET /api/v2/analytics/listing/:id - Get listing analytics (owner only)
 */
router.get('/analytics/listing/:id', authMiddleware, async (req, res) => {
  try {
    // Verify ownership
    const listing = await listingsService.getListingById(parseInt(req.params.id));
    if (!listing || listing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check plan limits for analytics days
    const planCheck = await subscriptionsService.checkPlanLimit(req.user.id, 'view_analytics');
    const period = req.query.period || '30d';
    
    const [summary, daily] = await Promise.all([
      analyticsService.getListingAnalytics(parseInt(req.params.id), period),
      analyticsService.getListingAnalyticsDaily(parseInt(req.params.id), planCheck.days),
    ]);
    
    res.json({
      summary,
      daily,
      planLimitDays: planCheck.days,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/v2/analytics/dashboard - Get seller dashboard
 */
router.get('/analytics/dashboard', authMiddleware, async (req, res) => {
  try {
    const dashboard = await analyticsService.getSellerDashboard(req.user.id);
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// =============================================================================
// MESSAGING ROUTES
// =============================================================================

/**
 * GET /api/v2/messages/conversations - Get user's conversations
 */
router.get('/messages/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await messagingService.getUserConversations(req.user.id, {
      includeArchived: req.query.archived === 'true',
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/v2/messages/unread-count - Get unread message count
 */
router.get('/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await messagingService.getUnreadCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * POST /api/v2/messages/conversations - Start a new conversation
 */
router.post('/messages/conversations', authMiddleware, async (req, res) => {
  try {
    const { listingId, sellerId, message } = req.body;
    
    if (!listingId || !sellerId) {
      return res.status(400).json({ error: 'listingId and sellerId required' });
    }
    
    if (sellerId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    
    const conversation = await messagingService.getOrCreateConversation({
      listingId,
      buyerId: req.user.id,
      sellerId,
      initialMessage: message,
    });
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/messages/conversations/:id - Get conversation messages
 */
router.get('/messages/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const result = await messagingService.getConversationMessages(
      parseInt(req.params.id),
      req.user.id,
      {
        limit: parseInt(req.query.limit) || 50,
        before: req.query.before,
        after: req.query.after,
      }
    );
    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(error.message.includes('Not authorized') ? 403 : 500).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/v2/messages/conversations/:id - Send a message
 */
router.post('/messages/conversations/:id', authMiddleware, async (req, res) => {
  try {
    const { content, messageType } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content required' });
    }
    
    const message = await messagingService.sendMessage({
      conversationId: parseInt(req.params.id),
      senderId: req.user.id,
      content,
      messageType: messageType || 'text',
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/v2/messages/conversations/:id/read - Mark messages as read
 */
router.post('/messages/conversations/:id/read', authMiddleware, async (req, res) => {
  try {
    const count = await messagingService.markMessagesAsRead(
      parseInt(req.params.id),
      req.user.id
    );
    res.json({ markedAsRead: count });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * DELETE /api/v2/messages/:id - Delete a message
 */
router.delete('/messages/:id', authMiddleware, async (req, res) => {
  try {
    await messagingService.deleteMessage(parseInt(req.params.id), req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/messages/conversations/:id/archive - Archive conversation
 */
router.post('/messages/conversations/:id/archive', authMiddleware, async (req, res) => {
  try {
    await messagingService.toggleArchive(
      parseInt(req.params.id),
      req.user.id,
      req.body.archive !== false
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/messages/search - Search messages
 */
router.get('/messages/search', authMiddleware, async (req, res) => {
  try {
    const results = await messagingService.searchMessages(
      req.user.id,
      req.query.q,
      { limit: parseInt(req.query.limit) || 20 }
    );
    res.json(results);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// =============================================================================
// SUBSCRIPTIONS ROUTES
// =============================================================================

/**
 * GET /api/v2/subscriptions/plans - Get available plans
 */
router.get('/subscriptions/plans', (req, res) => {
  res.json(subscriptionsService.getPlanComparison());
});

/**
 * GET /api/v2/subscriptions/current - Get current subscription
 */
router.get('/subscriptions/current', authMiddleware, async (req, res) => {
  try {
    const subscription = await subscriptionsService.getUserSubscription(req.user.id);
    res.json(subscription || { plan: 'free', limits: subscriptionsService.PLAN_CONFIGS.free });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/v2/subscriptions/checkout - Create checkout session
 */
router.post('/subscriptions/checkout', authMiddleware, async (req, res) => {
  try {
    const { plan, interval } = req.body;
    
    if (!plan || !['basic', 'pro', 'business'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const session = await subscriptionsService.createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      plan,
      interval: interval || 'monthly',
      successUrl: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/pricing`,
    });
    
    res.json(session);
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/subscriptions/portal - Create customer portal session
 */
router.post('/subscriptions/portal', authMiddleware, async (req, res) => {
  try {
    const session = await subscriptionsService.createPortalSession(
      req.user.id,
      `${process.env.FRONTEND_URL}/dashboard`
    );
    res.json(session);
  } catch (error) {
    console.error('Error creating portal:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/subscriptions/cancel - Cancel subscription
 */
router.post('/subscriptions/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await subscriptionsService.cancelSubscription(
      req.user.id,
      req.body.immediately === true
    );
    res.json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/subscriptions/check-limit - Check plan limit
 */
router.post('/subscriptions/check-limit', authMiddleware, async (req, res) => {
  try {
    const { action, context } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action required' });
    }
    
    const result = await subscriptionsService.checkPlanLimit(req.user.id, action, context || {});
    res.json(result);
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({ error: 'Failed to check limit' });
  }
});

// =============================================================================
// STRIPE WEBHOOK (V2)
// =============================================================================

/**
 * POST /api/v2/stripe/webhook - Handle Stripe webhooks
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await subscriptionsService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
