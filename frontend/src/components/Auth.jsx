import React, { useState } from 'react';
import api from '../api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import Input from './Input';
import Button from './Button';
import ForgotPassword from './ForgotPassword';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Auth0 OAuth login via Supabase
  const doAuth0Login = async () => {
    if (!isSupabaseConfigured()) {
      setError('OAuth not configured. Please use email/password login.');
      return;
    }
    
    setOauthLoading(true);
    setError(null);
    
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'auth0',
        options: {
          redirectTo: window.location.origin,
        }
      });
      
      if (oauthError) {
        setError(oauthError.message || 'Auth0 login failed');
      }
      // If successful, Supabase will redirect to Auth0
    } catch (e) {
      setError(e.message || 'Auth0 login failed');
    } finally {
      setOauthLoading(false);
    }
  };

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

            {/* Auth0 OAuth Divider */}
            {isSupabaseConfigured() && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={doAuth0Login}
                  disabled={oauthLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {oauthLoading ? (
                    <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#EB5424"/>
                    </svg>
                  )}
                  <span className="font-medium text-gray-700">
                    {oauthLoading ? 'Connecting...' : 'Sign in with Auth0'}
                  </span>
                </button>
              </>
            )}
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
