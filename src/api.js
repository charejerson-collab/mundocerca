// =============================================================================
// MundoCerca Frontend API Client
// =============================================================================
// Connects to: Railway Backend → Supabase Database
// =============================================================================

// In production: Set VITE_API_URL to your Railway backend URL
// Example: https://mundocerca-backend.railway.app
const API_ROOT = import.meta.env.VITE_API_URL || '';

// =============================================================================
// Helper Functions
// =============================================================================

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function getAuthHeaders() {
  const token = localStorage.getItem('mc_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

// =============================================================================
// Auth State Management
// =============================================================================

export const auth = {
  getToken: () => localStorage.getItem('mc_token'),
  
  getUser: () => {
    const userStr = localStorage.getItem('mc_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  setAuth: (token, user) => {
    localStorage.setItem('mc_token', token);
    localStorage.setItem('mc_user', JSON.stringify(user));
  },
  
  clearAuth: () => {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_user');
  },
  
  isAuthenticated: () => !!localStorage.getItem('mc_token'),
};

// =============================================================================
// API Client
// =============================================================================

const api = {
  // ===========================================================================
  // Health Check
  // ===========================================================================
  ping: () => fetch(`${API_ROOT}/api/ping`).then(handleResponse),
  health: () => fetch(`${API_ROOT}/api/health`).then(handleResponse),

  // ===========================================================================
  // Listings / Properties
  // ===========================================================================
  getListings: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.city_id) params.append('city_id', filters.city_id);
    if (filters.category) params.append('category', filters.category);
    if (filters.min_price) params.append('min_price', filters.min_price);
    if (filters.max_price) params.append('max_price', filters.max_price);
    if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const queryString = params.toString();
    const url = `${API_ROOT}/api/listings${queryString ? `?${queryString}` : ''}`;
    return fetch(url, { headers: { ...getAuthHeaders() } }).then(handleResponse);
  },

  getProperties: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, value);
    });
    
    const queryString = params.toString();
    const url = `${API_ROOT}/api/properties${queryString ? `?${queryString}` : ''}`;
    return fetch(url, { headers: { ...getAuthHeaders() } }).then(handleResponse);
  },

  getProperty: (id) => 
    fetch(`${API_ROOT}/api/properties/${id}`, { 
      headers: { ...getAuthHeaders() } 
    }).then(handleResponse),

  createProperty: (propertyData) => 
    fetch(`${API_ROOT}/api/properties`, {
      method: 'POST',
      headers: { ...jsonHeaders(), ...getAuthHeaders() },
      body: JSON.stringify(propertyData)
    }).then(handleResponse),

  updateProperty: (id, updates) => 
    fetch(`${API_ROOT}/api/properties/${id}`, {
      method: 'PUT',
      headers: { ...jsonHeaders(), ...getAuthHeaders() },
      body: JSON.stringify(updates)
    }).then(handleResponse),

  deleteProperty: (id) => 
    fetch(`${API_ROOT}/api/properties/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  // ===========================================================================
  // Professionals
  // ===========================================================================
  getPros: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.city_id) params.append('city_id', filters.city_id);
    
    const queryString = params.toString();
    const url = `${API_ROOT}/api/pros${queryString ? `?${queryString}` : ''}`;
    return fetch(url, { headers: { ...getAuthHeaders() } }).then(handleResponse);
  },

  // ===========================================================================
  // Authentication
  // ===========================================================================
  login: async (email, password) => {
    const data = await fetch(`${API_ROOT}/api/auth/login`, {
      method: 'POST',
      headers: { ...jsonHeaders() },
      body: JSON.stringify({ email, password })
    }).then(handleResponse);
    
    if (data.token && data.user) {
      auth.setAuth(data.token, data.user);
    }
    return data;
  },

  register: async (name, email, password) => {
    const data = await fetch(`${API_ROOT}/api/auth/register`, {
      method: 'POST',
      headers: { ...jsonHeaders() },
      body: JSON.stringify({ name, email, password })
    }).then(handleResponse);
    
    if (data.token && data.user) {
      auth.setAuth(data.token, data.user);
    }
    return data;
  },

  logout: () => {
    auth.clearAuth();
    return Promise.resolve({ ok: true });
  },

  getSession: () => 
    fetch(`${API_ROOT}/api/auth/session`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  // ===========================================================================
  // Password Reset Flow
  // ===========================================================================
  requestPasswordReset: (email) => 
    fetch(`${API_ROOT}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { ...jsonHeaders() },
      body: JSON.stringify({ email })
    }).then(handleResponse),

  verifyResetOtp: (email, otp) => 
    fetch(`${API_ROOT}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { ...jsonHeaders() },
      body: JSON.stringify({ email, otp })
    }).then(handleResponse),

  resetPassword: (email, resetToken, newPassword) => 
    fetch(`${API_ROOT}/api/auth/reset-password`, {
      method: 'POST',
      headers: { ...jsonHeaders() },
      body: JSON.stringify({ email, resetToken, newPassword })
    }).then(handleResponse),

  // ===========================================================================
  // File Uploads
  // ===========================================================================
  uploadVerification: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_ROOT}/api/verification-upload`, { 
      method: 'POST', 
      body: form, 
      headers: { ...getAuthHeaders() } 
    }).then(handleResponse);
  },

  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return fetch(`${API_ROOT}/api/upload/image`, { 
      method: 'POST', 
      body: form, 
      headers: { ...getAuthHeaders() } 
    }).then(handleResponse);
  },

  // ===========================================================================
  // Subscription Management
  // ===========================================================================
  activateSubscription: (plan) => 
    fetch(`${API_ROOT}/api/subscription/activate`, {
      method: 'POST',
      headers: { ...jsonHeaders(), ...getAuthHeaders() },
      body: JSON.stringify({ plan })
    }).then(handleResponse),

  getSubscription: () => 
    fetch(`${API_ROOT}/api/subscription`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  cancelSubscription: () => 
    fetch(`${API_ROOT}/api/subscription/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  // ===========================================================================
  // Favorites
  // ===========================================================================
  getFavorites: () => 
    fetch(`${API_ROOT}/api/favorites`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  addFavorite: (propertyId) => 
    fetch(`${API_ROOT}/api/favorites`, {
      method: 'POST',
      headers: { ...jsonHeaders(), ...getAuthHeaders() },
      body: JSON.stringify({ property_id: propertyId })
    }).then(handleResponse),

  removeFavorite: (propertyId) => 
    fetch(`${API_ROOT}/api/favorites/${propertyId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  // ===========================================================================
  // Inquiries
  // ===========================================================================
  sendInquiry: (propertyId, data) => 
    fetch(`${API_ROOT}/api/inquiries`, {
      method: 'POST',
      headers: { ...jsonHeaders(), ...getAuthHeaders() },
      body: JSON.stringify({ property_id: propertyId, ...data })
    }).then(handleResponse),

  getInquiries: () => 
    fetch(`${API_ROOT}/api/inquiries`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),
};

export default api;
