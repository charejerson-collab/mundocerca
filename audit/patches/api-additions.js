/**
 * API ADDITIONS for Password Reset
 * 
 * Add these methods to src/api.js
 */

// Add to the default export object in src/api.js:

export default {
  // ... existing methods ...

  // Password Reset Flow
  requestPasswordReset: (email) => fetch(`${API_ROOT}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(handleResp),

  verifyResetOtp: (email, otp) => fetch(`${API_ROOT}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  }).then(handleResp),

  resetPassword: (email, resetToken, newPassword) => fetch(`${API_ROOT}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword })
  }).then(handleResp),
};


// ============================================================================
// FULL UPDATED api.js FILE
// ============================================================================

/*
const API_ROOT = import.meta.env.VITE_API_ROOT || '';

function handleResp(res) {
  if (!res.ok) return res.json().then(e => { throw e });
  return res.json();
}

function authHeader() {
  const t = localStorage.getItem('mc_token');
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

export default {
  getListings: () => fetch(`${API_ROOT}/api/listings`, { headers: { ...authHeader() } }).then(handleResp),
  getPros: () => fetch(`${API_ROOT}/api/pros`, { headers: { ...authHeader() } }).then(handleResp),
  
  login: (email, password) => fetch(`${API_ROOT}/api/auth/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password })
  }).then(handleResp),
  
  register: (name, email, password) => fetch(`${API_ROOT}/api/auth/register`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password })
  }).then(handleResp),
  
  uploadVerification: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_ROOT}/api/verification-upload`, { method: 'POST', body: form, headers: { ...authHeader() } }).then(handleResp);
  },

  // Password Reset Flow
  requestPasswordReset: (email) => fetch(`${API_ROOT}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(handleResp),

  verifyResetOtp: (email, otp) => fetch(`${API_ROOT}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  }).then(handleResp),

  resetPassword: (email, resetToken, newPassword) => fetch(`${API_ROOT}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword })
  }).then(handleResp),
};
*/
