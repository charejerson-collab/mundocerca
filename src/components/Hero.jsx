import React from 'react';

export default function Hero({ searchMode, setSearchMode, searchText, setSearchText, setView, lang }) {
  return (
    <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 text-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">{lang === 'en' ? 'Live confidently in Mexico' : 'Vive con confianza en México'}</h2>
        <p className="mt-4 text-xl opacity-90 max-w-2xl">{lang === 'en' ? 'The trusted ecosystem for rentals and verified professional services.' : 'El ecosistema confiable para rentas y servicios profesionales verificados.'}</p>

        <div className="mt-8 bg-white rounded-2xl p-5 text-slate-900 shadow-2xl max-w-3xl border border-gray-100">
          <div className="flex gap-2 items-center">
            <button onClick={() => setSearchMode('homes')} className={`px-4 py-2 rounded-full ${searchMode === 'homes' ? 'bg-indigo-50 font-bold' : 'bg-slate-100'}`}>{lang === 'en' ? 'Homes' : 'Casas'}</button>
            <button onClick={() => setSearchMode('pros')} className={`px-4 py-2 rounded-full ${searchMode === 'pros' ? 'bg-indigo-50 font-bold' : 'bg-slate-100'}`}>{lang === 'en' ? 'Professionals' : 'Profesionales'}</button>

            <div className="flex-1 relative">
              <input
                aria-label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setView(searchMode === 'homes' ? 'search-homes' : 'search-pros'); } }}
                className="w-full border rounded-xl px-4 py-3"
                placeholder={searchMode === 'homes' ? (lang === 'en' ? 'Search homes, city, neighborhood...' : 'Busca casas, ciudad, colonia...') : (lang === 'en' ? 'Search professionals, service, name...' : 'Busca profesionales, servicio, nombre...')}
              />
              <button onClick={() => setView(searchMode === 'homes' ? 'search-homes' : 'search-pros')} className="absolute right-2 top-2 bg-indigo-600 text-white px-4 py-2 rounded-xl">{lang === 'en' ? 'Search' : 'Buscar'}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
