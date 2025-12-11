// =============================================================================
// MundoCerca - API Client v2
// =============================================================================
// Frontend API integration for production features
// =============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get auth headers from localStorage
 * @returns {Object} Headers with Authorization
 */
function getAuthHeaders() {
  const token = localStorage.getItem('mc_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Handle API response
 * @param {Response} response - Fetch response
 * @returns {Promise<any>}
 */
async function handleResponse(response) {
  if (response.status === 204) return null;
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// =============================================================================
// PROFILES API
// =============================================================================

export const profiles = {
  /**
   * Get current user's profile
   */
  async getMe() {
    const response = await fetch(`${API_BASE}/api/v2/profiles/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update current user's profile
   * @param {Object} data - Profile data to update
   */
  async update(data) {
    const response = await fetch(`${API_BASE}/api/v2/profiles/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Get public profile by ID
   * @param {string} userId - User ID
   */
  async getById(userId) {
    const response = await fetch(`${API_BASE}/api/v2/profiles/${userId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },
};

// =============================================================================
// LISTINGS API
// =============================================================================

export const listings = {
  /**
   * Get listings with filters and pagination
   * @param {Object} options - Query options
   */
  async getAll(options = {}) {
    const params = new URLSearchParams();
    
    if (options.city) params.append('city', options.city);
    if (options.category) params.append('category', options.category);
    if (options.minPrice) params.append('minPrice', options.minPrice);
    if (options.maxPrice) params.append('maxPrice', options.maxPrice);
    if (options.bedrooms) params.append('bedrooms', options.bedrooms);
    if (options.bathrooms) params.append('bathrooms', options.bathrooms);
    if (options.featured) params.append('featured', 'true');
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    
    const response = await fetch(`${API_BASE}/api/v2/listings?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  /**
   * Search listings
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   */
  async search(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    
    const response = await fetch(`${API_BASE}/api/v2/listings/search?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  /**
   * Get single listing by ID
   * @param {number} id - Listing ID
   */
  async getById(id) {
    const response = await fetch(`${API_BASE}/api/v2/listings/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  /**
   * Create a new listing
   * @param {Object} data - Listing data
   */
  async create(data) {
    const response = await fetch(`${API_BASE}/api/v2/listings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Update a listing
   * @param {number} id - Listing ID
   * @param {Object} data - Updated data
   */
  async update(id, data) {
    const response = await fetch(`${API_BASE}/api/v2/listings/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Delete a listing
   * @param {number} id - Listing ID
   */
  async delete(id) {
    const response = await fetch(`${API_BASE}/api/v2/listings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Feature a listing
   * @param {number} id - Listing ID
   */
  async feature(id) {
    const response = await fetch(`${API_BASE}/api/v2/listings/${id}/feature`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get user's listings
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getByUser(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await fetch(`${API_BASE}/api/v2/listings/user/${userId}?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },
};

// =============================================================================
// ANALYTICS API
// =============================================================================

export const analytics = {
  /**
   * Record a listing view
   * @param {number} listingId - Listing ID
   * @param {Object} options - Additional tracking data
   */
  async recordView(listingId, options = {}) {
    const response = await fetch(`${API_BASE}/api/v2/analytics/view`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ listingId, ...options }),
    });
    return handleResponse(response);
  },

  /**
   * Update engagement metrics
   * @param {number} listingId - Listing ID
   * @param {Object} metrics - Engagement metrics
   */
  async updateEngagement(listingId, metrics) {
    const response = await fetch(`${API_BASE}/api/v2/analytics/engagement`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ listingId, ...metrics }),
    });
    return handleResponse(response);
  },

  /**
   * Get analytics for a listing
   * @param {number} listingId - Listing ID
   * @param {string} period - Time period ('7d', '30d', '90d')
   */
  async getListingAnalytics(listingId, period = '30d') {
    const response = await fetch(`${API_BASE}/api/v2/analytics/listing/${listingId}?period=${period}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get seller dashboard data
   */
  async getDashboard() {
    const response = await fetch(`${API_BASE}/api/v2/analytics/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// =============================================================================
// MESSAGING API
// =============================================================================

export const messages = {
  /**
   * Get user's conversations
   * @param {Object} options - Query options
   */
  async getConversations(options = {}) {
    const params = new URLSearchParams();
    if (options.archived) params.append('archived', 'true');
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get unread message count
   */
  async getUnreadCount() {
    const response = await fetch(`${API_BASE}/api/v2/messages/unread-count`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Start a new conversation
   * @param {number} listingId - Listing ID
   * @param {string} sellerId - Seller user ID
   * @param {string} message - Initial message
   */
  async startConversation(listingId, sellerId, message) {
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ listingId, sellerId, message }),
    });
    return handleResponse(response);
  },

  /**
   * Get messages in a conversation
   * @param {number} conversationId - Conversation ID
   * @param {Object} options - Query options
   */
  async getMessages(conversationId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);
    
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations/${conversationId}?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Send a message
   * @param {number} conversationId - Conversation ID
   * @param {string} content - Message content
   */
  async send(conversationId, content) {
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations/${conversationId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  /**
   * Mark messages as read
   * @param {number} conversationId - Conversation ID
   */
  async markAsRead(conversationId) {
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Delete a message
   * @param {number} messageId - Message ID
   */
  async delete(messageId) {
    const response = await fetch(`${API_BASE}/api/v2/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Archive a conversation
   * @param {number} conversationId - Conversation ID
   * @param {boolean} archive - Archive or unarchive
   */
  async archive(conversationId, archive = true) {
    const response = await fetch(`${API_BASE}/api/v2/messages/conversations/${conversationId}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ archive }),
    });
    return handleResponse(response);
  },

  /**
   * Search messages
   * @param {string} query - Search query
   */
  async search(query) {
    const response = await fetch(`${API_BASE}/api/v2/messages/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// =============================================================================
// SUBSCRIPTIONS API
// =============================================================================

export const subscriptions = {
  /**
   * Get available plans
   */
  async getPlans() {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/plans`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  /**
   * Get current subscription
   */
  async getCurrent() {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/current`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Create checkout session
   * @param {string} plan - Plan ID
   * @param {string} interval - 'monthly' or 'yearly'
   */
  async createCheckout(plan, interval = 'monthly') {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan, interval }),
    });
    return handleResponse(response);
  },

  /**
   * Create customer portal session
   */
  async createPortal() {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/portal`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Cancel subscription
   * @param {boolean} immediately - Cancel immediately or at period end
   */
  async cancel(immediately = false) {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ immediately }),
    });
    return handleResponse(response);
  },

  /**
   * Check plan limit
   * @param {string} action - Action to check
   * @param {Object} context - Additional context
   */
  async checkLimit(action, context = {}) {
    const response = await fetch(`${API_BASE}/api/v2/subscriptions/check-limit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, context }),
    });
    return handleResponse(response);
  },
};

// =============================================================================
// ANALYTICS TRACKING HOOKS
// =============================================================================

/**
 * Create a view tracker for listing pages
 * @param {number} listingId - Listing ID
 * @returns {Object} Tracker methods
 */
export function createViewTracker(listingId) {
  const sessionId = sessionStorage.getItem('session_id') || 
    (() => {
      const id = crypto.randomUUID?.() || Date.now().toString(36);
      sessionStorage.setItem('session_id', id);
      return id;
    })();

  let startTime = Date.now();
  let maxScroll = 0;

  return {
    /**
     * Record initial view
     */
    async recordView() {
      try {
        await analytics.recordView(listingId, {
          sessionId,
          utmSource: new URLSearchParams(window.location.search).get('utm_source'),
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        });
      } catch (e) {
        console.debug('View tracking failed:', e);
      }
    },

    /**
     * Track scroll depth
     * @param {number} scrollPercent - Current scroll percentage
     */
    updateScrollDepth(scrollPercent) {
      maxScroll = Math.max(maxScroll, scrollPercent);
    },

    /**
     * Track contact button click
     */
    async trackContactClick() {
      try {
        await analytics.updateEngagement(listingId, {
          sessionId,
          clickedContact: true,
        });
      } catch (e) {
        console.debug('Engagement tracking failed:', e);
      }
    },

    /**
     * Track WhatsApp button click
     */
    async trackWhatsAppClick() {
      try {
        await analytics.updateEngagement(listingId, {
          sessionId,
          clickedWhatsapp: true,
        });
      } catch (e) {
        console.debug('Engagement tracking failed:', e);
      }
    },

    /**
     * Track adding to favorites
     */
    async trackFavorite() {
      try {
        await analytics.updateEngagement(listingId, {
          sessionId,
          addedFavorite: true,
        });
      } catch (e) {
        console.debug('Engagement tracking failed:', e);
      }
    },

    /**
     * Send final engagement data (call on unmount)
     */
    async finalize() {
      const duration = Math.round((Date.now() - startTime) / 1000);
      try {
        await analytics.updateEngagement(listingId, {
          sessionId,
          durationSeconds: duration,
          scrollDepth: Math.round(maxScroll),
        });
      } catch (e) {
        console.debug('Final engagement tracking failed:', e);
      }
    },
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  profiles,
  listings,
  analytics,
  messages,
  subscriptions,
  createViewTracker,
};
