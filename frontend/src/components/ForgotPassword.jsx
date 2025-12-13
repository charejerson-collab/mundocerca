import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import Input from './Input';
import Button from './Button';

export default function ForgotPassword({ onBack, onSuccess }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get step from URL, default to 'email'
  const step = searchParams.get('step') || 'email';
  
  // Update step in URL
  const setStep = useCallback((newStep) => {
    const newParams = new URLSearchParams(searchParams);
    if (newStep === 'email') {
      newParams.delete('step');
    } else {
      newParams.set('step', newStep);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Form data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  // 60-second countdown
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // =========================================================================
  // COUNTDOWN TIMER
  // =========================================================================
  
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    
    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);

  // Start countdown after initial request
  const startCountdown = useCallback((seconds = 60) => {
    setCountdown(seconds);
    setCanResend(false);
  }, []);

  // =========================================================================
  // STEP 1: Request Reset Code
  // =========================================================================
  
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.requestPasswordReset(email);
      
      if (res.error) {
        // Handle rate limit / cooldown from server
        if (res.waitSeconds) {
          startCountdown(res.waitSeconds);
          setError(res.error);
        } else {
          setError(res.error);
        }
        return;
      }
      
      setMessage(res.message || 'Check your email for the verification code');
      setStep('otp');
      startCountdown(res.cooldownSeconds || 60);
      
    } catch (err) {
      setError(err.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // RESEND CODE
  // =========================================================================
  
  const handleResend = async () => {
    if (!canResend || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.requestPasswordReset(email);
      
      if (res.error) {
        if (res.waitSeconds) {
          startCountdown(res.waitSeconds);
        }
        setError(res.error);
        return;
      }
      
      setMessage('A new code has been sent to your email');
      startCountdown(res.cooldownSeconds || 60);
      setOtp(''); // Clear previous OTP input
      
    } catch (err) {
      setError(err.error || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: Verify OTP
  // =========================================================================
  
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.verifyResetOtp(email, otp);
      
      if (res.error) {
        setError(res.error);
        return;
      }
      
      setResetToken(res.resetToken);
      setStep('newPassword');
      setMessage(null);
      
    } catch (err) {
      setError(err.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: Set New Password
  // =========================================================================
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.resetPassword(email, resetToken, newPassword);
      
      if (res.error) {
        setError(res.error);
        return;
      }
      
      setStep('success');
      
    } catch (err) {
      setError(err.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'newPassword' && 'Create New Password'}
            {step === 'success' && 'Password Reset!'}
          </h1>
          <p className="text-gray-600 mt-1">
            {step === 'email' && "Enter your email to receive a reset code"}
            {step === 'otp' && `We sent a code to ${email}`}
            {step === 'newPassword' && "Choose a strong password"}
            {step === 'success' && "Your password has been updated"}
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {message && step !== 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-600 text-sm">{message}</span>
            </div>
          )}

          {/* STEP 1: Email Input */}
          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
              
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={loading || countdown > 0}
              >
                {loading ? 'Sending...' : countdown > 0 ? `Wait ${countdown}s` : 'Send Reset Code'}
              </Button>
            </form>
          )}

          {/* STEP 2: OTP Input */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              {/* Resend Button with Countdown */}
              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium disabled:opacity-50"
                  >
                    Didn't receive code? Resend
                  </button>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Resend code in <span className="font-medium text-indigo-600">{countdown}s</span>
                  </p>
                )}
              </div>

              <p className="text-gray-500 text-xs text-center">
                Check your spam folder if you don't see the email
              </p>
            </form>
          )}

          {/* STEP 3: New Password */}
          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </div>
              
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={loading || newPassword.length < 8}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600">You can now log in with your new password.</p>
              <Button
                variant="primary"
                className="w-full py-3"
                onClick={() => onSuccess?.()}
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>

        {/* Back Link */}
        {step !== 'success' && (
          <div className="text-center mt-6">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
