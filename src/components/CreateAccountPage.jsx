import React, { useState } from 'react';
import { Sparkles, Shield, Check } from 'lucide-react';
import Input from './Input';
import Button from './Button';
import api from '../api';

const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: 199 },
  pro: { name: 'Pro Plan', price: 399 },
  business: { name: 'Business Plan', price: 699 }
};

export default function CreateAccountPage({ selectedPlan, setView, setUser, lang }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const plan = PLAN_DETAILS[selectedPlan] || PLAN_DETAILS.basic;

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password) {
      setError(lang === 'en' ? 'Please fill in all required fields' : 'Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Register user via API
      const res = await api.register(formData.fullName, formData.email, formData.password);
      
      if (res.token) {
        // Save token and user to localStorage
        localStorage.setItem('mc_token', res.token);
        
        // Extend user object with subscription info
        const newUser = {
          ...res.user,
          phone: formData.phone,
          plan: selectedPlan,
          freeMonthApplied: true,
          createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('mc_user', JSON.stringify(newUser));
        localStorage.setItem('mc_pending_subscription', JSON.stringify({
          plan: selectedPlan,
          freeMonth: true
        }));

        setLoading(false);
        setView('confirm-subscription');
      }
    } catch (err) {
      setError(err.error || (lang === 'en' ? 'Registration failed. Please try again.' : 'Error al registrarse. Inténtalo de nuevo.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {lang === 'en' ? 'Create Your Account' : 'Crea Tu Cuenta'}
          </h1>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles size={16} />
            {lang === 'en' ? 'Start With Your Free First Month!' : '¡Comienza Con Tu Primer Mes Gratis!'}
          </div>
        </div>

        {/* Selected Plan Badge */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-600 font-medium">{lang === 'en' ? 'Selected Plan' : 'Plan Seleccionado'}</p>
            <p className="text-lg font-bold text-gray-900">{plan.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">${plan.price} <span className="text-sm font-normal text-gray-500">MXN/{lang === 'en' ? 'mo' : 'mes'}</span></p>
            <p className="text-sm text-green-600 font-medium">{lang === 'en' ? 'First month FREE' : 'Primer mes GRATIS'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'en' ? 'Full Name' : 'Nombre Completo'} <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.fullName}
                onChange={handleChange('fullName')}
                placeholder={lang === 'en' ? 'Enter your full name' : 'Ingresa tu nombre completo'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'en' ? 'Email' : 'Correo Electrónico'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder={lang === 'en' ? 'Enter your email' : 'Ingresa tu correo'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'en' ? 'Password' : 'Contraseña'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                placeholder={lang === 'en' ? 'Create a password' : 'Crea una contraseña'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'en' ? 'Phone (Optional)' : 'Teléfono (Opcional)'}
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                placeholder={lang === 'en' ? 'Your phone number' : 'Tu número de teléfono'}
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === 'en' ? 'Creating Account...' : 'Creando Cuenta...'}
                  </span>
                ) : (
                  lang === 'en' ? 'Continue to Checkout' : 'Continuar al Pago'
                )}
              </Button>
            </div>
          </form>

          {/* Security Note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield size={16} />
            <span>{lang === 'en' ? 'Your data is secure and encrypted' : 'Tus datos están seguros y encriptados'}</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button 
            onClick={() => setView('plans')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← {lang === 'en' ? 'Back to Plans' : 'Volver a Planes'}
          </button>
        </div>

        {/* Terms */}
        <p className="text-center text-gray-500 text-sm mt-6">
          {lang === 'en' 
            ? 'By creating an account, you agree to our '
            : 'Al crear una cuenta, aceptas nuestros '}
          <a href="#" className="text-indigo-600 hover:underline">{lang === 'en' ? 'Terms of Service' : 'Términos de Servicio'}</a>
          {lang === 'en' ? ' and ' : ' y '}
          <a href="#" className="text-indigo-600 hover:underline">{lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}</a>
        </p>
      </div>
    </div>
  );
}
