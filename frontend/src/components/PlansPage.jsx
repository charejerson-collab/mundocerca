import React, { useState } from 'react';
import { Check, Package, Rocket, Building2, Shield, Users, TrendingUp, Sparkles, Loader } from 'lucide-react';
import api from '../api';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Plan',
    icon: Package,
    price: 199,
    features: [
      'List up to 2 casas',
      'One-off services',
      'Basic search visibility',
      'Email support'
    ],
    highlight: false,
    guarantee: '14-day money-back guarantee'
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    icon: Rocket,
    price: 399,
    features: [
      'List 3–10 casas',
      'High visibility in search results',
      'Priority customer support',
      'Performance analytics'
    ],
    highlight: true,
    badge: 'Most Popular'
  },
  {
    id: 'business',
    name: 'Business Plan',
    icon: Building2,
    price: 699,
    features: [
      'List 11–25 casas',
      'Top priority in search placement',
      'Dedicated account manager',
      'Custom branding options',
      'API access'
    ],
    highlight: false
  }
];

const WHY_JOIN = [
  { icon: Users, text: 'Connect with trusted renters across Mexico' },
  { icon: TrendingUp, text: 'Boost exposure for your properties' },
  { icon: Sparkles, text: 'Simple setup, professional dashboard, full control' }
];

export default function PlansPage({ setView, setSelectedPlan, lang, user }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectPlan = async (planId) => {
    // If user is not logged in, redirect to create account with selected plan
    if (!user) {
      setSelectedPlan(planId);
      setView('create-account', { plan: planId });
      return;
    }

    // If user is logged in, create Stripe checkout session
    setLoading(planId);
    setError(null);

    try {
      const response = await api.createCheckoutSession(planId);
      
      if (response.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(lang === 'en' 
        ? 'Failed to start checkout. Please try again.' 
        : 'Error al iniciar el pago. Por favor intenta de nuevo.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="pt-16 pb-12 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles size={16} />
          {lang === 'en' ? 'First month FREE!' : '¡Primer mes GRATIS!'}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {lang === 'en' ? 'Offer Your Services' : 'Ofrece Tus Servicios'}
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-600 mb-4">
          {lang === 'en' ? 'Choose Your Plan' : 'Elige Tu Plan'}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          {lang === 'en' 
            ? 'Create your account, pick the plan that fits your needs, and start showcasing your properties with ease. First month free.'
            : 'Crea tu cuenta, elige el plan que se adapte a tus necesidades y comienza a mostrar tus propiedades con facilidad. Primer mes gratis.'}
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div 
                key={plan.id}
                className={`relative bg-white rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${
                  plan.highlight 
                    ? 'ring-2 ring-indigo-600 shadow-2xl shadow-indigo-200 md:scale-105 order-first lg:order-none' 
                    : 'shadow-lg hover:shadow-xl border border-gray-100'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                  plan.highlight ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  <Icon size={28} />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 ml-2">MXN / {lang === 'en' ? 'month' : 'mes'}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.guarantee && (
                  <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                    <Shield size={14} />
                    <span>{plan.guarantee}</span>
                  </div>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 disabled:opacity-70'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-70'
                  }`}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      {lang === 'en' ? 'Processing...' : 'Procesando...'}
                    </>
                  ) : (
                    lang === 'en' ? `Select ${plan.name}` : `Seleccionar ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why Join Section */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {lang === 'en' ? 'Why Join?' : '¿Por qué unirte?'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WHY_JOIN.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon size={32} className="text-indigo-600" />
                  </div>
                  <p className="text-gray-700 font-medium">{item.text}</p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-gray-600 mt-12 max-w-2xl mx-auto">
            {lang === 'en' 
              ? 'Start now and see why landlords trust Mundo Cerca to grow their rental business.'
              : 'Comienza ahora y descubre por qué los propietarios confían en Mundo Cerca para hacer crecer su negocio de alquiler.'}
          </p>
        </div>
      </div>

      {/* Back Button */}
      <div className="text-center pb-8">
        <button 
          onClick={() => setView('home')}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← {lang === 'en' ? 'Back to Home' : 'Volver al Inicio'}
        </button>
      </div>
    </div>
  );
}
