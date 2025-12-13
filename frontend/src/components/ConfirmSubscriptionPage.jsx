import React, { useState } from 'react';
import { Check, Sparkles, Shield, CreditCard, Calendar } from 'lucide-react';
import api from '../api';
import { useApp } from '../contexts/AppContext';

const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: 199, icon: '📦' },
  pro: { name: 'Pro Plan', price: 399, icon: '🚀' },
  business: { name: 'Business Plan', price: 699, icon: '🏢' }
};

export default function ConfirmSubscriptionPage() {
  const { selectedPlan, navigateTo, setUser, lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const plan = PLAN_DETAILS[selectedPlan] || PLAN_DETAILS.basic;
  const pendingUser = JSON.parse(localStorage.getItem('mc_user') || '{}');

  const handleStartSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      // Activate subscription via API
      const res = await api.activateSubscription(selectedPlan);
      
      if (res.ok && res.subscription) {
        // Update user in localStorage with subscription info
        const activeUser = {
          ...pendingUser,
          subscriptionActive: true,
          subscriptionPlan: selectedPlan,
          subscriptionStartDate: res.subscription.startDate || res.subscription.start_date,
          freeMonthEnds: res.subscription.freeMonthEnds || res.subscription.free_month_ends
        };

        localStorage.setItem('mc_user', JSON.stringify(activeUser));
        localStorage.removeItem('mc_pending_subscription');
        
        // Auto-login user
        setUser(activeUser);
        
        setLoading(false);
        navigateTo('dashboard');
      } else {
        throw new Error('Subscription activation failed');
      }
    } catch (err) {
      setError(err.error || (lang === 'en' ? 'Failed to activate subscription. Please try again.' : 'Error al activar la suscripción. Inténtalo de nuevo.'));
      setLoading(false);
    }
  };

  const freeMonthEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-MX', 
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-xl shadow-indigo-200">
            <CreditCard size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {lang === 'en' ? 'Confirm Your Subscription' : 'Confirma Tu Suscripción'}
          </h1>
          <p className="text-gray-600">
            {lang === 'en' ? 'Review your plan and start your free month' : 'Revisa tu plan y comienza tu mes gratis'}
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}

          {/* Plan Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{plan.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="opacity-90">{pendingUser.email}</p>
              </div>
            </div>
          </div>

          {/* Pricing Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">{lang === 'en' ? 'Monthly Price' : 'Precio Mensual'}</span>
              <span className="font-semibold text-gray-900">${plan.price} MXN</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">{lang === 'en' ? 'First Month Discount' : 'Descuento Primer Mes'}</span>
              <span className="font-semibold text-green-600">-${plan.price} MXN</span>
            </div>

            {/* Free Month Badge */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800">
                  {lang === 'en' ? 'First Month FREE Applied!' : '¡Primer Mes GRATIS Aplicado!'}
                </p>
                <p className="text-sm text-green-600">
                  {lang === 'en' ? 'Your free month ends on ' : 'Tu mes gratis termina el '}{freeMonthEndDate}
                </p>
              </div>
            </div>

            {/* Today's Total */}
            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-gray-900">{lang === 'en' ? "Today's Total" : 'Total de Hoy'}</p>
                  <p className="text-sm text-gray-500">{lang === 'en' ? 'Then' : 'Después'} ${plan.price} MXN/{lang === 'en' ? 'month' : 'mes'}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">$0</p>
                  <p className="text-sm text-gray-500">MXN</p>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="pt-4">
              <p className="font-medium text-gray-900 mb-3">{lang === 'en' ? "What's included:" : 'Qué incluye:'}</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check size={16} className="text-green-600" />
                  <span>{lang === 'en' ? 'Immediate access to dashboard' : 'Acceso inmediato al dashboard'}</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check size={16} className="text-green-600" />
                  <span>{lang === 'en' ? 'List your properties right away' : 'Lista tus propiedades de inmediato'}</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check size={16} className="text-green-600" />
                  <span>{lang === 'en' ? 'Cancel anytime during free month' : 'Cancela en cualquier momento durante el mes gratis'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleStartSubscription}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {lang === 'en' ? 'Activating...' : 'Activando...'}
                </span>
              ) : (
                <>
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={20} />
                    {lang === 'en' ? 'Start My Free Month' : 'Comenzar Mi Mes Gratis'}
                  </span>
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Shield size={16} />
              <span>{lang === 'en' ? 'Secure checkout • Cancel anytime' : 'Pago seguro • Cancela cuando quieras'}</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button 
            onClick={() => navigateTo('create-account')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← {lang === 'en' ? 'Back to Account' : 'Volver a la Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
