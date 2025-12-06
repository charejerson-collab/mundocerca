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
  }
};
