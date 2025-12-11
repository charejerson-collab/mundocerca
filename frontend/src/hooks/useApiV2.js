// =============================================================================
// MundoCerca - React Hooks for API V2
// =============================================================================
// Custom hooks for data fetching and state management
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { createViewTracker } from '../services/apiV2.js';

// =============================================================================
// GENERIC DATA FETCHING HOOK
// =============================================================================

/**
 * Generic hook for async data fetching with loading and error states
 * @param {Function} fetcher - Async function that fetches data
 * @param {Array} deps - Dependencies array
 * @param {Object} options - Hook options
 */
export function useAsync(fetcher, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);
  
  return { data, loading, error, execute, setData };
}

// =============================================================================
// PROFILE HOOKS
// =============================================================================

/**
 * Hook for current user's profile
 */
export function useProfile() {
  const { data, loading, error, execute } = useAsync(
    () => api.profiles.getMe(),
    [],
    { immediate: true }
  );
  
  const updateProfile = useCallback(async (updates) => {
    const updated = await api.profiles.update(updates);
    execute(); // Refresh
    return updated;
  }, [execute]);
  
  return {
    profile: data,
    loading,
    error,
    refresh: execute,
    updateProfile,
  };
}

/**
 * Hook for public profile by ID
 * @param {string} userId - User ID
 */
export function usePublicProfile(userId) {
  return useAsync(
    () => api.profiles.getById(userId),
    [userId],
    { immediate: !!userId }
  );
}

// =============================================================================
// LISTINGS HOOKS
// =============================================================================

/**
 * Hook for listings with filters and pagination
 * @param {Object} options - Query options
 */
export function useListings(options = {}) {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });
  
  const { data, loading, error, execute } = useAsync(
    () => api.listings.getAll(options),
    [JSON.stringify(options)],
    { immediate: true }
  );
  
  useEffect(() => {
    if (data) {
      setListings(data.listings || data);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    }
  }, [data]);
  
  const loadMore = useCallback(async () => {
    if (!pagination.hasNext) return;
    
    const result = await api.listings.getAll({
      ...options,
      page: pagination.page + 1,
    });
    
    setListings(prev => [...prev, ...(result.listings || [])]);
    setPagination(result.pagination);
  }, [options, pagination]);
  
  return {
    listings,
    loading,
    error,
    pagination,
    refresh: execute,
    loadMore,
  };
}

/**
 * Hook for single listing with view tracking
 * @param {number} listingId - Listing ID
 */
export function useListing(listingId) {
  const trackerRef = useRef(null);
  
  const { data, loading, error, execute } = useAsync(
    () => api.listings.getById(listingId),
    [listingId],
    { immediate: !!listingId }
  );
  
  // Setup view tracking
  useEffect(() => {
    if (!listingId) return;
    
    trackerRef.current = createViewTracker(listingId);
    trackerRef.current.recordView();
    
    // Track scroll
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      trackerRef.current?.updateScrollDepth(scrollPercent);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      trackerRef.current?.finalize();
    };
  }, [listingId]);
  
  const trackContact = useCallback(() => {
    trackerRef.current?.trackContactClick();
  }, []);
  
  const trackWhatsApp = useCallback(() => {
    trackerRef.current?.trackWhatsAppClick();
  }, []);
  
  const trackFavorite = useCallback(() => {
    trackerRef.current?.trackFavorite();
  }, []);
  
  return {
    listing: data,
    loading,
    error,
    refresh: execute,
    trackContact,
    trackWhatsApp,
    trackFavorite,
  };
}

/**
 * Hook for creating listings
 */
export function useCreateListing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const createListing = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check limits first
      const limitCheck = await api.subscriptions.checkLimit('create_listing');
      if (!limitCheck.allowed) {
        const err = new Error(limitCheck.reason);
        err.upgrade = true;
        throw err;
      }
      
      return await api.listings.create(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { createListing, loading, error };
}

// =============================================================================
// MESSAGING HOOKS
// =============================================================================

/**
 * Hook for conversations list
 */
export function useConversations(options = {}) {
  const [conversations, setConversations] = useState([]);
  
  const { data, loading, error, execute } = useAsync(
    () => api.messages.getConversations(options),
    [JSON.stringify(options)],
    { immediate: true }
  );
  
  useEffect(() => {
    if (data) {
      setConversations(data);
    }
  }, [data]);
  
  return {
    conversations,
    loading,
    error,
    refresh: execute,
  };
}

/**
 * Hook for unread count (with polling)
 * @param {number} pollInterval - Polling interval in ms (0 to disable)
 */
export function useUnreadCount(pollInterval = 30000) {
  const [count, setCount] = useState(0);
  
  const fetchCount = useCallback(async () => {
    try {
      const result = await api.messages.getUnreadCount();
      setCount(result.unreadCount || 0);
    } catch (e) {
      // Silently fail
    }
  }, []);
  
  useEffect(() => {
    fetchCount();
    
    if (pollInterval > 0) {
      const interval = setInterval(fetchCount, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchCount, pollInterval]);
  
  return count;
}

/**
 * Hook for conversation messages
 * @param {number} conversationId - Conversation ID
 */
export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  
  const { loading, error, execute } = useAsync(
    () => api.messages.getMessages(conversationId),
    [conversationId],
    { immediate: !!conversationId }
  );
  
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;
      
      const result = await api.messages.getMessages(conversationId);
      setMessages(result.messages || []);
      setHasMore(result.hasMore);
      
      // Mark as read
      api.messages.markAsRead(conversationId);
    };
    
    fetchMessages();
  }, [conversationId]);
  
  const sendMessage = useCallback(async (content) => {
    const message = await api.messages.send(conversationId, content);
    setMessages(prev => [...prev, message]);
    return message;
  }, [conversationId]);
  
  const loadOlder = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;
    
    const oldest = messages[0];
    const result = await api.messages.getMessages(conversationId, {
      before: oldest.created_at,
    });
    
    setMessages(prev => [...result.messages, ...prev]);
    setHasMore(result.hasMore);
  }, [conversationId, messages, hasMore]);
  
  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadOlder,
    refresh: execute,
  };
}

// =============================================================================
// ANALYTICS HOOKS
// =============================================================================

/**
 * Hook for seller dashboard
 */
export function useSellerDashboard() {
  return useAsync(
    () => api.analytics.getDashboard(),
    [],
    { immediate: true }
  );
}

/**
 * Hook for listing analytics
 * @param {number} listingId - Listing ID
 * @param {string} period - Time period
 */
export function useListingAnalytics(listingId, period = '30d') {
  return useAsync(
    () => api.analytics.getListingAnalytics(listingId, period),
    [listingId, period],
    { immediate: !!listingId }
  );
}

// =============================================================================
// SUBSCRIPTION HOOKS
// =============================================================================

/**
 * Hook for current subscription
 */
export function useSubscription() {
  const { data, loading, error, execute } = useAsync(
    () => api.subscriptions.getCurrent(),
    [],
    { immediate: true }
  );
  
  const checkout = useCallback(async (plan, interval) => {
    const session = await api.subscriptions.createCheckout(plan, interval);
    if (session.url) {
      window.location.href = session.url;
    }
    return session;
  }, []);
  
  const openPortal = useCallback(async () => {
    const session = await api.subscriptions.createPortal();
    if (session.url) {
      window.location.href = session.url;
    }
    return session;
  }, []);
  
  const cancel = useCallback(async (immediately = false) => {
    await api.subscriptions.cancel(immediately);
    execute(); // Refresh
  }, [execute]);
  
  return {
    subscription: data,
    loading,
    error,
    refresh: execute,
    checkout,
    openPortal,
    cancel,
  };
}

/**
 * Hook for plan comparison
 */
export function usePlans() {
  return useAsync(
    () => api.subscriptions.getPlans(),
    [],
    { immediate: true }
  );
}

/**
 * Hook for checking plan limits
 */
export function usePlanLimits() {
  const [limits, setLimits] = useState({});
  
  const checkLimit = useCallback(async (action, context = {}) => {
    const result = await api.subscriptions.checkLimit(action, context);
    setLimits(prev => ({ ...prev, [action]: result }));
    return result;
  }, []);
  
  return { limits, checkLimit };
}

export default {
  useAsync,
  useProfile,
  usePublicProfile,
  useListings,
  useListing,
  useCreateListing,
  useConversations,
  useUnreadCount,
  useMessages,
  useSellerDashboard,
  useListingAnalytics,
  useSubscription,
  usePlans,
  usePlanLimits,
};
