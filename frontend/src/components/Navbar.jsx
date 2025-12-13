import React from 'react';
import { Home, User, Menu, X, Store, MessageSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang, user, setUser, mobileMenuOpen, setMobileMenuOpen, navigateTo } = useApp();
  
  // Derive active state from URL pathname
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <header className="w-full border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('home')} aria-label="Return to Home" className="flex items-center gap-2 group">
            <Home size={22} className="text-indigo-600" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Mundo Cerca</span>
          </button>

          <nav className="hidden md:flex gap-4 ml-6">
            <button onClick={() => navigate('/marketplace')} className={`text-sm font-medium transition-colors duration-200 ${isActive('/marketplace') ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-gray-600 hover:text-indigo-600'}`}>
              {lang === 'en' ? 'Marketplace' : 'Mercado'}
            </button>
            
            <button onClick={() => navigate('/search/homes')} className={`text-sm font-medium transition-colors duration-200 ${isActive('/search/homes') ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-gray-600 hover:text-indigo-600'}`}>
              {lang === 'en' ? 'Find a Home' : 'Buscar Casa'}
            </button>

            <button onClick={() => navigate('/search/pros')} className={`text-sm font-medium ${isActive('/search/pros') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {lang === 'en' ? 'Find a Professional' : 'Buscar Profesional'}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="text-sm px-3 py-1 rounded-md border">
            {lang === 'en' ? 'ES' : 'EN'}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/messages')} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={lang === 'en' ? 'Messages' : 'Mensajes'}>
                <MessageSquare size={20} />
              </button>
              <button onClick={() => navigate('/seller-dashboard')} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={lang === 'en' ? 'Seller Dashboard' : 'Panel de Vendedor'}>
                <Store size={20} />
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors">
                <User size={18} />
                <span className="font-medium">{user.name?.split(' ')[0]}</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex gap-3">
              <button onClick={() => navigate('/login')} className="text-sm hover:text-indigo-600 transition-colors">Log in</button>
              <button onClick={() => navigate('/plans')} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md">{lang === 'en' ? 'Offer Services' : 'Ofrecer Servicios'}</button>
            </div>
          )}

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-gray-50">
          <div className="px-4 py-3 space-y-1">
            <button onClick={() => { navigate('/marketplace'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Marketplace' : 'Mercado'}</button>
            <button onClick={() => { navigate('/search/homes'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Find Home' : 'Buscar Casa'}</button>
            <button onClick={() => { navigate('/search/pros'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Find Professional' : 'Buscar Profesional'}</button>
            <hr className="my-2" />
            {user ? (
              <>
                <button onClick={() => { navigate('/seller-dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Seller Dashboard' : 'Panel de Vendedor'}</button>
                <button onClick={() => { navigate('/messages'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Messages' : 'Mensajes'}</button>
                <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700 font-medium">{lang === 'en' ? 'My Dashboard' : 'Mi Panel'}</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Log in' : 'Iniciar Sesión'}</button>
                <button onClick={() => { navigate('/plans'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium">{lang === 'en' ? 'Offer Services' : 'Ofrecer Servicios'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
