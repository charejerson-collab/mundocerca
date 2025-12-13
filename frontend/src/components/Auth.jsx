import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import Input from './Input';
import Button from './Button';
import ForgotPassword from './ForgotPassword';

export default function Auth({ onLogin }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get mode from URL, default to 'login'
  const mode = searchParams.get('mode') || 'login';
  
  // Update mode in URL
  const setMode = useCallback((newMode) => {
    const newParams = new URLSearchParams(searchParams);
    if (newMode === 'login') {
      newParams.delete('mode');
    } else {
      newParams.set('mode', newMode);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // ...existing code...

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

  // Show ForgotPassword component if in forgot mode
  if (mode === 'forgot') {
    return (
      <ForgotPassword
        onBack={() => setMode('login')}
        onSuccess={() => setMode('login')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Mundo Cerca</h1>
          <p className="text-gray-600 mt-1">Sign in to continue</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {/* Tab Switcher */}
          <div className="flex mb-8 bg-gray-100 rounded-xl p-1">
            <button 
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${mode==='login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} 
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${mode==='register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} 
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                <Input 
                  value={name} 
                  onChange={(e)=>setName(e.target.value)} 
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input 
                type="email"
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
                placeholder="Enter your password"
              />
            </div>

            <div className="pt-2">
              {mode === 'login' ? (
                <Button 
                  variant="primary" 
                  onClick={doLogin} 
                  disabled={loading}
                  className="w-full py-3"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Please wait...
                    </span>
                  ) : 'Sign In'}
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={doRegister} 
                  disabled={loading}
                  className="w-full py-3"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Please wait...
                    </span>
                  ) : 'Create Account'}
                </Button>
              )}
            </div>

            {/* ...existing code... */}
          </div>

          {mode === 'login' && (
            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          By continuing, you agree to our <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
