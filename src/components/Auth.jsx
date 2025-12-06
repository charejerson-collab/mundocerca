import React, { useState } from 'react';
import api from '../api';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.login(email, password);
      if (res.token) {
        localStorage.setItem('mc_token', res.token);
        localStorage.setItem('mc_user', JSON.stringify(res.user));
        onLogin && onLogin(res.user);
      }
    } catch (e) {
      setError(e.error || 'Login failed');
    } finally { setLoading(false) }
  };

  const doRegister = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.register(name, email, password);
      if (res.token) {
        localStorage.setItem('mc_token', res.token);
        localStorage.setItem('mc_user', JSON.stringify(res.user));
        onLogin && onLogin(res.user);
      }
    } catch (e) {
      setError(e.error || 'Register failed');
    } finally { setLoading(false) }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
        <div className="flex justify-between mb-4">
          <button className={`px-4 py-2 ${mode==='login'?'font-bold':''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`px-4 py-2 ${mode==='register'?'font-bold':''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        {mode === 'register' && (
          <div className="mb-3">
            <label className="block text-sm">Full name</label>
            <input className="w-full border p-2 rounded" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm">Email</label>
          <input className="w-full border p-2 rounded" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="block text-sm">Password</label>
          <input type="password" className="w-full border p-2 rounded" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>

        <div className="flex gap-2">
          {mode === 'login' ? (
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={doLogin} disabled={loading}>{loading ? 'Please wait...' : 'Login'}</button>
          ) : (
            <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={doRegister} disabled={loading}>{loading ? 'Please wait...' : 'Register'}</button>
          )}
          <button className="px-4 py-2 border rounded" onClick={() => { setMode(mode==='login'?'register':'login') }}>{mode==='login' ? 'Create account' : 'Have account?'}</button>
        </div>
      </div>
    </div>
  );
}
