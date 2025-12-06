import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Home, 
  User, 
  PlusCircle, 
  LogOut, 
  Check, 
  MessageCircle, 
  Camera, 
  DollarSign, 
  Filter,
  Globe,
  ArrowRight,
  Briefcase,
  Stethoscope,
  Scale,
  Wrench,
  ShieldCheck,
  Star,
  FileText,
  Menu,
  X,
  Store
} from 'lucide-react';

// City names used by the UI; main data comes from backend
const CITIES = [
  { id: 'tapachula', name: 'Tapachula' },
  { id: 'cdmx', name: 'Ciudad de México' }
];

import api from './api';
import Auth from './components/Auth';
import Verification from './components/Verification';

export default function App() {
  const [view, setView] = useState('home');
  const [searchMode, setSearchMode] = useState('homes');
  const [searchText, setSearchText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [listings, setListings] = useState([]);
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mc_user')); } catch(e){return null}
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getListings(), api.getPros()])
      .then(([l, p]) => {
        setListings(l || []);
        setPros(p || []);
      })
      .catch(err => console.error('API fetch error', err))
      .finally(() => setLoading(false));
  }, []);

  const formatMXN = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

  const Navbar = () => (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <button onClick={() => setView('home')} className="flex items-center cursor-pointer px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <Globe className="h-8 w-8 text-indigo-600 mr-2 group-hover:scale-105 transition-transform" />
            <span className="font-bold text-xl tracking-tight text-indigo-600">Mundo Cerca</span>
          </button>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => { setSearchMode('homes'); setView('search-homes'); }} className={`text-sm font-medium ${view === 'search-homes' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>{lang === 'en' ? 'Find a Home' : 'Buscar Casa'}</button>
            <button onClick={() => { setSearchMode('pros'); setView('search-pros'); }} className={`text-sm font-medium ${view === 'search-pros' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>{lang === 'en' ? 'Find a Professional' : 'Buscar Profesional'}</button>
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="text-gray-400 hover:text-gray-600 font-medium">{lang === 'en' ? 'ES' : 'EN'}</button>

            <div className="flex items-center space-x-3 pl-4 border-l">
              {user ? (
                <>
                  <button onClick={() => setView('dashboard')} className="text-gray-700 font-medium hover:text-indigo-600">Dashboard</button>
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{user.name ? user.name[0] : 'U'}</div>
                  <button onClick={() => { localStorage.removeItem('mc_token'); localStorage.removeItem('mc_user'); setUser(null); setView('home'); }} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => setView('login')} className="text-gray-600 hover:text-gray-900 font-medium text-sm">Log in</button>
                  <button onClick={() => setView('verify')} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition">{lang === 'en' ? 'Offer Services' : 'Ofrecer Servicios'}</button>
                </>
              )}
            </div>
          </div>

          <div className="flex md:hidden items-center">
             <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-500 hover:text-gray-700">{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t p-4 space-y-4">
           <button onClick={() => {setSearchMode('homes'); setView('search-homes'); setMobileMenuOpen(false);}} className="block w-full text-left font-medium text-gray-700">Find Home</button>
           <button onClick={() => {setSearchMode('pros'); setView('search-pros'); setMobileMenuOpen(false);}} className="block w-full text-left font-medium text-gray-700">Find Professional</button>
           <button onClick={() => {setView('verify'); setMobileMenuOpen(false);}} className="block w-full text-left font-medium text-indigo-600">Join as Pro</button>
        </div>
      )}
    </nav>
  );

  const Hero = () => (
    <div className="relative bg-slate-900 overflow-hidden">
      <div className="absolute inset-0">
        <img className="w-full h-full object-cover opacity-30 transform scale-105" src="https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&q=80&w=1920" alt="Mexico Lifestyle" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
      </div>

      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-md">{lang === 'en' ? 'Live confidently in Mexico' : 'Vive con confianza en México'}</h1>
        <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto">{lang === 'en' ? 'The trusted ecosystem for rentals and verified professional services.' : 'El ecosistema confiable para rentas y servicios profesionales verificados.'}</p>

        <div className="mt-10 w-full max-w-3xl">
          <div className="flex justify-center space-x-2 mb-4">
            <button onClick={() => setSearchMode('homes')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'homes' ? 'bg-white text-slate-900' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}><div className="flex items-center"><Home className="w-4 h-4 mr-2"/> {lang === 'en' ? 'Homes' : 'Casas'}</div></button>
            <button onClick={() => setSearchMode('pros')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchMode === 'pros' ? 'bg-white text-slate-900' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}><div className="flex items-center"><Briefcase className="w-4 h-4 mr-2"/> {lang === 'en' ? 'Professionals' : 'Profesionales'}</div></button>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><Search className="h-6 w-6 text-gray-400 group-focus-within:text-indigo-600 transition-colors" /></div>
            <input type="text" className="block w-full pl-16 pr-20 py-5 rounded-2xl border-none leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 sm:text-xl shadow-2xl transition-all" placeholder={searchMode === 'homes' ? (lang === 'en' ? 'Search by city (e.g., Tapachula)' : 'Buscar por ciudad (ej. Tapachula)') : (lang === 'en' ? 'Search dentists, lawyers...' : 'Buscar dentistas, abogados...')} value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { setView(searchMode === 'homes' ? 'search-homes' : 'search-pros'); } }} />
            <button onClick={() => setView(searchMode === 'homes' ? 'search-homes' : 'search-pros')} className="absolute inset-y-2 right-2 bg-indigo-600 text-white rounded-xl px-6 hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium shadow-lg">{lang === 'en' ? 'Search' : 'Buscar'}</button>
          </div>
        </div>
      </div>
    </div>
  );

  const HomesView = () => {
    const [localSearch, setLocalSearch] = useState('');
    if (loading) return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">Loading listings...</div>);

    const filteredListings = listings.filter(l => (l.title || '').toLowerCase().includes(localSearch.toLowerCase()) || (l.description || '').toLowerCase().includes(localSearch.toLowerCase()));

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-2xl font-bold mb-4">{lang === 'en' ? 'Search Rentals' : 'Buscar Rentas'}</h2>
          <div className="flex gap-4">
            <div className="relative flex-grow">
               <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
               <input type="text" placeholder={lang === 'en' ? 'Search by keyword...' : 'Buscar por palabra clave...'} className="w-full pl-10 pr-4 py-2 border rounded-lg" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredListings.length > 0 ? filteredListings.map(l => (
            <div key={l.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition">
              <div className="h-48 bg-gray-200 relative"><img src={l.image} alt={l.title} className="w-full h-full object-cover" /></div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-900 truncate">{l.title}</h3>
                <p className="text-indigo-600 font-bold text-xl mt-1">{formatMXN(l.price)} <span className="text-sm font-normal text-gray-500">/mo</span></p>
                <div className="flex items-center text-sm text-gray-500 mt-2"><MapPin className="h-4 w-4 mr-1" /> {CITIES.find(c => c.id === l.city_id)?.name}</div>
                <button className="mt-4 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">{lang === 'en' ? 'View Details' : 'Ver Detalles'}</button>
              </div>
            </div>
          )) : (
            <div className="col-span-3 text-center py-12 text-gray-500">No properties found matching your criteria.</div>
          )}
        </div>
      </div>
    );
  };

  const ProsView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">{lang === 'en' ? 'Verified Professionals' : 'Profesionales Verificados'}</h2></div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition">
          <div className="w-full md:w-48 flex-shrink-0"><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400" className="w-full h-32 md:h-full object-cover rounded-lg" alt="pro" /></div>
          <div className="flex-grow"><h3 className="text-xl font-bold text-slate-900">Lic. Marco Antonio <ShieldCheck className="h-5 w-5 text-indigo-500 ml-2" /></h3><p className="text-indigo-600 font-medium">Immigration Specialist</p><p className="text-gray-600 mt-3 text-sm">Expert in Mexican residency and visas. 15 years of experience.</p></div>
          <div className="w-full md:w-48 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6"><button className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center"><MessageCircle className="h-4 w-4 mr-2" /> WhatsApp</button><button className="w-full py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">View Profile</button></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      {view === 'home' && (<><Hero /></>)}
      {view === 'search-homes' && <HomesView />}
      {view === 'search-pros' && <ProsView />}
      {view === 'login' && <Auth onLogin={(u) => { setUser(u); setView('home'); }} />}
      {view === 'verify' && <Verification />}

      <footer className="bg-white border-t mt-auto py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="col-span-1 md:col-span-1"><div className="flex items-center mb-4"><Globe className="h-6 w-6 text-indigo-600 mr-2" /><span className="font-bold text-lg text-slate-900">Mundo Cerca</span></div><p className="text-sm text-gray-500">Connecting people with homes and trusted professionals across Mexico.</p></div>
           <div><h4 className="font-bold mb-4">Platform</h4><ul className="space-y-2 text-sm text-gray-500"><li>Search Homes</li><li>Find Professionals</li><li>Pricing</li></ul></div>
           <div><h4 className="font-bold mb-4">Support</h4><ul className="space-y-2 text-sm text-gray-500"><li>Help Center</li><li>Trust & Safety</li><li>Contact Us</li></ul></div>
           <div><h4 className="font-bold mb-4">Legal</h4><ul className="space-y-2 text-sm text-gray-500"><li>Terms of Service</li><li>Privacy Policy</li></ul></div>
        </div>
      </footer>
    </div>
  );
}
