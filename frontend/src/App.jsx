import React, { useState } from 'react';
import { Routes, Route, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Scale,
  Stethoscope,
  Wrench,
  FileText
} from 'lucide-react';
import { ToastContainer } from './components/Toast';
import api from './api';

import { AppProvider, useApp } from './contexts/AppContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ListingCard from './components/ListingCard';
import ProfessionalCard from './components/ProfessionalCard';

// Page Components
import Auth from './components/Auth';
import PlansPage from './components/PlansPage';
import CreateAccountPage from './components/CreateAccountPage';
import ConfirmSubscriptionPage from './components/ConfirmSubscriptionPage';
import Dashboard from './components/Dashboard';
import SellerDashboard from './components/SellerDashboard';
import ListingForm from './components/ListingForm';
import Marketplace from './components/Marketplace';
import ListingDetail from './components/ListingDetail';
import MessagingPage from './components/Messaging';

// --- MOCK DATA: PROFESSIONAL CATEGORIES ---
const PRO_CATEGORIES = [
  { id: 'legal', name: 'Legal & Immigration', icon: Scale, desc: 'Lawyers, Notaries, Visa Experts' },
  { id: 'health', name: 'Health & Medical', icon: Stethoscope, desc: 'Dentists, General Doctors, Ophthalmologists' },
  { id: 'home', name: 'Home Services', icon: Wrench, desc: 'Plumbers, Electricians, Architects' },
  { id: 'finance', name: 'Finance & Tax', icon: FileText, desc: 'Accountants, Tax Advisors' },
];

// Error Page Component
function ErrorPage({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-600 mb-6">Lo sentimos, ocurrió un error inesperado. Por favor intenta de nuevo.</p>
        {error?.message && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6 font-mono">{error.message}</p>
        )}
        <button
          onClick={resetErrorBoundary}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE COMPONENTS (Use context via useApp hook)
// =============================================================================

function CategoryGrid() {
  const { lang, navigateTo } = useApp();
  
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Find the help you need' : 'Encuentra la ayuda que necesitas'}</h3>
        <p className="text-gray-600">{lang === 'en' ? 'Browse our categories of trusted professionals' : 'Explora nuestras categorías de profesionales de confianza'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRO_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div 
              key={cat.id} 
              onClick={() => navigateTo('search-pros', { catId: cat.id })} 
              className="group bg-white p-6 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 cursor-pointer transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{cat.name}</div>
                  <div className="text-sm text-gray-500">{cat.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomesView() {
  const { listings, lang, formatMXN, navigateTo } = useApp();
  const [searchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState('');
  const [homeCat, setHomeCat] = useState('all');
  const cityId = searchParams.get('cityId');

  const filtered = listings.filter((l) => {
    const txt = (l.title + ' ' + l.description).toLowerCase();
    const matchesText = txt.includes(localSearch.toLowerCase());
    const matchesCat = homeCat === 'all' ? true : l.category === homeCat;
    const matchesCity = !cityId || l.city_id === cityId;
    return matchesText && matchesCat && matchesCity;
  });

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Search Rentals' : 'Buscar Rentas'}</h3>
        <p className="text-gray-600">{lang === 'en' ? 'Find your perfect home from our listings' : 'Encuentra tu hogar perfecto en nuestros listados'}</p>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            value={localSearch} 
            onChange={(e) => setLocalSearch(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
            placeholder={lang === 'en' ? 'Search by title or description' : 'Buscar por título o descripción'} 
          />
        </div>
        <select 
          value={homeCat} 
          onChange={(e) => setHomeCat(e.target.value)} 
          className="px-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
        >
          <option value="all">All / Todos</option>
          <option value="house">House / Casa</option>
          <option value="apartment">Apartment / Departamento</option>
          <option value="room">Room / Cuarto</option>
          <option value="business">Business / Local</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.length > 0 ? filtered.map((l) => (
          <ListingCard key={l.id} listing={l} formatMXN={formatMXN} onDetails={(li) => { navigateTo('listing-detail', { listingId: li.id }); }} />
        )) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{lang === 'en' ? 'No properties found matching your criteria.' : 'No se encontraron propiedades con sus criterios.'}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProsView() {
  const { professionals, lang, addToast } = useApp();
  const [searchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState('');
  const catId = searchParams.get('catId');
  const navigate = useNavigate();
  
  const filtered = professionals.filter((p) => {
    const txt = (p.name + ' ' + p.title + ' ' + p.description).toLowerCase();
    const matchesText = txt.includes(localSearch.toLowerCase());
    const matchesCat = !catId || p.category === catId;
    return matchesText && matchesCat;
  });

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Verified Professionals' : 'Profesionales Verificados'}</h3>
        <p className="text-gray-600">{lang === 'en' ? 'Connect with trusted service providers in your area' : 'Conéctate con proveedores de servicios de confianza en tu área'}</p>
      </div>

      <div className="mb-8">
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            value={localSearch} 
            onChange={(e) => setLocalSearch(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
            placeholder={lang === 'en' ? 'Search professionals by name or service' : 'Buscar profesionales por nombre o servicio'} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.length > 0 ? filtered.map((p) => (
          <ProfessionalCard key={p.id} pro={p} onView={(pr) => addToast(`${lang === 'en' ? 'Viewing profile' : 'Viendo perfil'}: ${pr.name}`, 'info')} />
        )) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{lang === 'en' ? 'No professionals found matching your criteria.' : 'No se encontraron profesionales con sus criterios.'}</p>
            <button onClick={() => { navigate('/search/pros'); setLocalSearch(''); }} className="mt-4 text-indigo-600 font-medium hover:text-indigo-700">{lang === 'en' ? 'Clear filters' : 'Limpiar filtros'}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function VerificationPage() {
  const { lang, addToast, navigateTo } = useApp();
  const navigate = useNavigate();
  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState(PRO_CATEGORIES[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const licenseInputRef = React.useRef(null);
  const idInputRef = React.useRef(null);

  const handleSubmit = async () => {
    if (!fullName || !licenseFile || !idFile) {
      addToast(lang === 'en' ? 'Please fill all fields and upload both documents' : 'Por favor completa todos los campos y sube ambos documentos', 'warning');
      return;
    }
    setSubmitting(true);
    
    try {
      // Upload both documents via API
      const [licenseRes, idRes] = await Promise.all([
        api.uploadVerification(licenseFile),
        api.uploadVerification(idFile)
      ]);
      
      if (licenseRes.ok && idRes.ok) {
        addToast(lang === 'en' ? 'Documents uploaded successfully!' : '¡Documentos subidos exitosamente!', 'success');
        setSubmitting(false);
        setSubmitted(true);
      }
    } catch (err) {
      addToast(err.error || (lang === 'en' ? 'Upload failed. Please try again.' : 'Error al subir. Inténtalo de nuevo.'), 'error');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Application Submitted!' : '¡Solicitud Enviada!'}</h3>
          <p className="text-gray-600 max-w-md mx-auto">{lang === 'en' ? 'We will review your documents and get back to you within 2-3 business days.' : 'Revisaremos tus documentos y te contactaremos en 2-3 días hábiles.'}</p>
          <button onClick={() => navigate('/')} className="mt-6 text-indigo-600 font-medium hover:text-indigo-700">{lang === 'en' ? '← Back to Home' : '← Volver al Inicio'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Become a Verified Professional' : 'Conviértete en Profesional Verificado'}</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">{lang === 'en' ? 'To maintain quality and trust, Mundo Cerca requires ID and credential verification for all service providers.' : 'Para mantener la calidad y confianza, Mundo Cerca requiere verificación de ID y credenciales.'}</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'en' ? 'Full Name' : 'Nombre Completo'}</label>
            <input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
              placeholder={lang === 'en' ? 'Enter your full legal name' : 'Ingresa tu nombre legal completo'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'en' ? 'Service Category' : 'Categoría de Servicio'}</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              {PRO_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'en' ? 'Upload Professional License' : 'Subir Licencia Profesional'}</label>
            <div 
              onClick={() => licenseInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${licenseFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400'}`}
            >
              {licenseFile ? (
                <>
                  <svg className="w-10 h-10 mx-auto text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 text-sm font-medium">{licenseFile.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{lang === 'en' ? 'Click to change' : 'Clic para cambiar'}</p>
                </>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 text-sm">{lang === 'en' ? 'Click to upload or drag and drop' : 'Haz clic para subir o arrastra y suelta'}</p>
                  <p className="text-gray-400 text-xs mt-1">PDF, JPG, PNG (max 10MB)</p>
                </>
              )}
              <input 
                ref={licenseInputRef}
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png" 
                className="hidden" 
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'en' ? 'Upload Government ID (INE/Passport)' : 'Subir Identificación Oficial (INE/Pasaporte)'}</label>
            <div 
              onClick={() => idInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${idFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400'}`}
            >
              {idFile ? (
                <>
                  <svg className="w-10 h-10 mx-auto text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 text-sm font-medium">{idFile.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{lang === 'en' ? 'Click to change' : 'Clic para cambiar'}</p>
                </>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <p className="text-gray-600 text-sm">{lang === 'en' ? 'Click to upload or drag and drop' : 'Haz clic para subir o arrastra y suelta'}</p>
                  <p className="text-gray-400 text-xs mt-1">PDF, JPG, PNG (max 10MB)</p>
                </>
              )}
              <input 
                ref={idInputRef}
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png" 
                className="hidden" 
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {lang === 'en' ? 'Submitting...' : 'Enviando...'}
                </span>
              ) : (lang === 'en' ? 'Submit for Review ($49 USD)' : 'Enviar para Revisión ($49 USD)')}
            </button>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{lang === 'en' ? 'Data encrypted and securely stored' : 'Datos encriptados y almacenados de forma segura'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Main layout component for routes that show navbar/hero/footer
function MainLayout({ children }) {
  const { toasts, removeToast, lang } = useApp();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      {children}
      <footer className="mt-16 bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Mundo Cerca</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {lang === 'en' 
                  ? 'Connecting people with homes and trusted professionals across Mexico. Your journey to finding the perfect home starts here.'
                  : 'Conectando personas con hogares y profesionales de confianza en todo México. Tu viaje para encontrar el hogar perfecto comienza aquí.'}
              </p>
              <div className="flex gap-4 mt-6">
                <a href="#" className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:shadow-lg transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:shadow-lg transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:shadow-lg transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
              </div>
            </div>

            {/* Links Sections */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{lang === 'en' ? 'Platform' : 'Plataforma'}</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Search Homes' : 'Buscar Casas'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Find Professionals' : 'Encontrar Profesionales'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Pricing' : 'Precios'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Support' : 'Soporte'}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{lang === 'en' ? 'Help' : 'Ayuda'}</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Help Center' : 'Centro de Ayuda'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Trust & Safety' : 'Confianza y Seguridad'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Contact Us' : 'Contáctanos'}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{lang === 'en' ? 'Legal' : 'Legal'}</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Terms of Service' : 'Términos de Servicio'}</a></li>
                <li><a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors">{lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Mundo Cerca. {lang === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
            </p>
            <p className="text-gray-500 text-sm">
              {lang === 'en' ? 'Made with ❤️ in Mexico' : 'Hecho con ❤️ en México'}
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// =============================================================================
// ROUTE COMPONENTS (Use context via useApp hook)
// =============================================================================

function HomeRoute() {
  const { listings, lang, formatMXN, navigateTo } = useApp();
  
  return (
    <MainLayout>
      <CategoryGrid />
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Featured Homes' : 'Casas Destacadas'}</h3>
            <p className="text-gray-600 mt-1">{lang === 'en' ? 'Discover your perfect place to live' : 'Descubre tu lugar perfecto para vivir'}</p>
          </div>
          <button 
            onClick={() => navigateTo('search-homes')} 
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            {lang === 'en' ? 'View all' : 'Ver todos'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.slice(0, 3).map((l) => (
            <ListingCard key={l.id} listing={l} compact={true} formatMXN={formatMXN} onDetails={(li) => { navigateTo('listing-detail', { listingId: li.id }); }} />
          ))}
        </div>
      </section>
    </MainLayout>
  );
}

function SearchHomesRoute() {
  return (
    <MainLayout>
      <CategoryGrid />
      <HomesView />
    </MainLayout>
  );
}

function SearchProsRoute() {
  return (
    <MainLayout>
      <CategoryGrid />
      <ProsView />
    </MainLayout>
  );
}

function VerifyRoute() {
  return (
    <MainLayout>
      <CategoryGrid />
      <VerificationPage />
    </MainLayout>
  );
}

function PlansPageRoute() {
  return <PlansPage />;
}

function CreateAccountPageRoute() {
  return <CreateAccountPage />;
}

function ConfirmSubscriptionPageRoute() {
  return <ConfirmSubscriptionPage />;
}

function DashboardRoute() {
  return <Dashboard />;
}

function LoginRoute() {
  const { setUser, navigateTo } = useApp();
  return (
    <Auth onLogin={(u) => { 
      setUser(u); 
      // Redirect to dashboard if user has active subscription, otherwise home
      if (u.subscriptionActive || u.subscriptionPlan) {
        navigateTo('dashboard');
      } else {
        navigateTo('home');
      }
    }} />
  );
}

function SellerDashboardRoute() {
  const { navigateTo } = useApp();
  return (
    <SellerDashboard 
      onBack={() => navigateTo('dashboard')}
      onCreateListing={() => navigateTo('create-listing')}
      onEditListing={(listing) => navigateTo('edit-listing', { listingId: listing.id })}
      onViewMessages={() => navigateTo('messages')}
    />
  );
}

function CreateListingRoute() {
  const { lang, navigateTo, addToast } = useApp();
  return (
    <ListingForm 
      onBack={() => navigateTo('seller-dashboard')}
      onSuccess={(listing) => {
        addToast(lang === 'en' ? 'Listing created successfully!' : '¡Anuncio creado exitosamente!', 'success');
        navigateTo('seller-dashboard');
      }}
    />
  );
}

function EditListingRoute() {
  const { lang, navigateTo, addToast } = useApp();
  const params = useParams();
  return (
    <ListingForm 
      listingId={params.listingId}
      onBack={() => navigateTo('seller-dashboard')}
      onSuccess={(listing) => {
        addToast(lang === 'en' ? 'Listing updated successfully!' : '¡Anuncio actualizado exitosamente!', 'success');
        navigateTo('seller-dashboard');
      }}
    />
  );
}

function MarketplaceRoute() {
  const { navigateTo } = useApp();
  return (
    <Marketplace 
      onBack={() => navigateTo('home')}
      onViewListing={(listing) => navigateTo('listing-detail', { listingId: listing.id })}
    />
  );
}

function ListingDetailRoute() {
  const { navigateTo } = useApp();
  const params = useParams();
  return (
    <ListingDetail 
      listingId={params.listingId}
      onBack={() => navigateTo('marketplace')}
      onMessage={(listing) => {}}
    />
  );
}

function MessagesRoute() {
  const { navigateTo } = useApp();
  return (
    <MessagingPage 
      onBack={() => navigateTo('seller-dashboard')}
    />
  );
}

// =============================================================================
// MAIN APP COMPONENT (Layout + Providers + Routes only)
// =============================================================================

function AppContent() {
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/search/homes" element={<SearchHomesRoute />} />
        <Route path="/search/pros" element={<SearchProsRoute />} />
        <Route path="/verify" element={<VerifyRoute />} />
        <Route path="/plans" element={<PlansPageRoute />} />
        <Route path="/create-account" element={<CreateAccountPageRoute />} />
        <Route path="/confirm-subscription" element={<ConfirmSubscriptionPageRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/seller-dashboard" element={<SellerDashboardRoute />} />
        <Route path="/seller-dashboard/create" element={<CreateListingRoute />} />
        <Route path="/seller-dashboard/edit/:listingId" element={<EditListingRoute />} />
        <Route path="/marketplace" element={<MarketplaceRoute />} />
        <Route path="/listing/:listingId" element={<ListingDetailRoute />} />
        <Route path="/messages/:conversationId" element={<MessagesRoute />} />
        <Route path="/messages" element={<MessagesRoute />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
