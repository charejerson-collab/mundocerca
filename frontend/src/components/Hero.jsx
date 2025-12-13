import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Hero({ searchMode, setSearchMode, searchText, setSearchText, setView, lang }) {
  const navigate = useNavigate();
  return (
    <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 text-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">{lang === 'en' ? 'Live confidently in Mexico' : 'Vive con confianza en México'}</h2>
        <p className="mt-4 text-xl opacity-90 max-w-2xl">{lang === 'en' ? 'The trusted ecosystem for rentals and verified professional services.' : 'El ecosistema confiable para rentas y servicios profesionales verificados.'}</p>

        <div className="mt-8 bg-white rounded-2xl p-5 text-slate-900 shadow-2xl max-w-3xl border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex gap-2">
              <button onClick={() => setSearchMode('homes')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchMode === 'homes' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 hover:bg-slate-200'}`}>{lang === 'en' ? 'Homes' : 'Casas'}</button>
              <button onClick={() => setSearchMode('pros')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${searchMode === 'pros' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-100 hover:bg-slate-200'}`}>{lang === 'en' ? 'Professionals' : 'Profesionales'}</button>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <input
                aria-label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { navigate(searchMode === 'homes' ? '/search/homes' : '/search/pros'); } }}
                className="flex-1 min-w-0 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={searchMode === 'homes' ? (lang === 'en' ? 'Search homes, city...' : 'Busca casas, ciudad...') : (lang === 'en' ? 'Search professionals...' : 'Busca profesionales...')}
              />
              <button
                onClick={() => navigate(searchMode === 'homes' ? '/search/homes' : '/search/pros')}
                className="bg-indigo-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
              >
                {lang === 'en' ? 'Search' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
