import React from 'react';
import { Home, User, Menu, X } from 'lucide-react';

export default function Navbar({ view, setView, searchMode, setSearchMode, lang, setLang, user, setUser, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <header className="w-full border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('home'); setSearchMode('homes'); }} aria-label="Return to Home" className="flex items-center gap-2 group">
            <Home size={22} className="text-indigo-600" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Mundo Cerca</span>
          </button>

          <nav className="hidden md:flex gap-4 ml-6">
            <button onClick={() => { setSearchMode('homes'); setView('search-homes'); }} className={`text-sm font-medium transition-colors duration-200 ${view === 'search-homes' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-gray-600 hover:text-indigo-600'}`}>
              {lang === 'en' ? 'Find a Home' : 'Buscar Casa'}
            </button>

            <button onClick={() => { setSearchMode('pros'); setView('search-pros'); }} className={`text-sm font-medium ${view === 'search-pros' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {lang === 'en' ? 'Find a Professional' : 'Buscar Profesional'}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="text-sm px-3 py-1 rounded-md border">
            {lang === 'en' ? 'ES' : 'EN'}
          </button>

          {user ? (
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors">
              <User size={18} />
              <span className="font-medium">{user.name?.split(' ')[0]}</span>
            </button>
          ) : (
            <div className="hidden md:flex gap-3">
              <button onClick={() => setView('login')} className="text-sm hover:text-indigo-600 transition-colors">Log in</button>
              <button onClick={() => setView('plans')} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md">{lang === 'en' ? 'Offer Services' : 'Ofrecer Servicios'}</button>
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
            <button onClick={() => { setSearchMode('homes'); setView('search-homes'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Find Home' : 'Buscar Casa'}</button>
            <button onClick={() => { setSearchMode('pros'); setView('search-pros'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Find Professional' : 'Buscar Profesional'}</button>
            <hr className="my-2" />
            {user ? (
              <button onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700 font-medium">{lang === 'en' ? 'My Dashboard' : 'Mi Panel'}</button>
            ) : (
              <>
                <button onClick={() => { setView('login'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg hover:bg-gray-100">{lang === 'en' ? 'Log in' : 'Iniciar Sesión'}</button>
                <button onClick={() => { setView('plans'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium">{lang === 'en' ? 'Offer Services' : 'Ofrecer Servicios'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
