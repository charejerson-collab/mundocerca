// =============================================================================
// MundoCerca - Marketplace Page
// =============================================================================
// Browse and search listings with advanced filters
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  MapPin,
  Grid,
  List,
  ChevronDown,
  SlidersHorizontal,
  Home,
  Building,
  Bed,
  Bath,
  Heart,
  Eye,
  MessageSquare,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import api from '../services/apiV2';

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'house', label: 'Casas' },
  { id: 'apartment', label: 'Departamentos' },
  { id: 'room', label: 'Cuartos' },
  { id: 'business', label: 'Locales' },
  { id: 'office', label: 'Oficinas' },
  { id: 'land', label: 'Terrenos' },
];

const CITIES = [
  { id: 'all', name: 'Todas las ciudades' },
  { id: 'tapachula', name: 'Tapachula' },
  { id: 'cdmx', name: 'Ciudad de México' },
  { id: 'guadalajara', name: 'Guadalajara' },
  { id: 'monterrey', name: 'Monterrey' },
  { id: 'cancun', name: 'Cancún' },
  { id: 'tuxtla', name: 'Tuxtla Gutiérrez' },
  { id: 'merida', name: 'Mérida' },
];

const PRICE_RANGES = [
  { id: 'all', label: 'Cualquier precio', min: null, max: null },
  { id: '0-5000', label: 'Hasta $5,000', min: 0, max: 5000 },
  { id: '5000-10000', label: '$5,000 - $10,000', min: 5000, max: 10000 },
  { id: '10000-20000', label: '$10,000 - $20,000', min: 10000, max: 20000 },
  { id: '20000-50000', label: '$20,000 - $50,000', min: 20000, max: 50000 },
  { id: '50000+', label: 'Más de $50,000', min: 50000, max: null },
];

const SORT_OPTIONS = [
  { id: 'created_at_desc', label: 'Más recientes', sortBy: 'created_at', sortOrder: 'desc' },
  { id: 'created_at_asc', label: 'Más antiguos', sortBy: 'created_at', sortOrder: 'asc' },
  { id: 'price_asc', label: 'Precio: menor a mayor', sortBy: 'price', sortOrder: 'asc' },
  { id: 'price_desc', label: 'Precio: mayor a menor', sortBy: 'price', sortOrder: 'desc' },
  { id: 'views_desc', label: 'Más vistos', sortBy: 'views_count', sortOrder: 'desc' },
];

// =============================================================================
// SKELETON LOADER COMPONENT
// =============================================================================

function ListingCardSkeleton({ viewMode = 'grid' }) {
  const isGrid = viewMode === 'grid';
  
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse ${
        isGrid ? '' : 'flex'
      }`}
    >
      {/* Image skeleton */}
      <div className={`bg-gray-200 ${isGrid ? 'aspect-[4/3]' : 'w-48 h-36 flex-shrink-0'}`} />
      
      {/* Content skeleton */}
      <div className={`p-4 ${isGrid ? '' : 'flex-1 flex flex-col'}`}>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="flex items-center gap-4 mb-3">
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 mt-auto">
          <div className="h-3 bg-gray-200 rounded w-10" />
          <div className="h-3 bg-gray-200 rounded w-10" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LISTING CARD COMPONENT
// =============================================================================

function MarketplaceListingCard({ listing, onView, onContact, onFavorite, viewMode = 'grid' }) {
  const isGrid = viewMode === 'grid';
  
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group ${
        isGrid ? '' : 'flex'
      }`}
      onClick={() => onView(listing)}
    >
      {/* Image */}
      <div className={`relative ${isGrid ? 'aspect-[4/3]' : 'w-48 h-36 flex-shrink-0'}`}>
        <img 
          src={listing.featured_image || listing.images?.[0] || 'https://via.placeholder.com/400x300?text=Sin+Imagen'} 
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {listing.is_featured && (
          <span className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
            ⭐ Destacado
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(listing); }}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        >
          <Heart size={18} className="text-gray-600 hover:text-red-500" />
        </button>
        
        {/* Price badge on image */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
          <span className="font-bold text-indigo-600">${listing.price?.toLocaleString()}</span>
          <span className="text-xs text-gray-500">/{listing.price_type === 'monthly' ? 'mes' : listing.price_type}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className={`p-4 ${isGrid ? '' : 'flex-1 flex flex-col'}`}>
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </h3>
        
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin size={14} />
          {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city_id}
        </p>
        
        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {listing.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed size={16} />
              {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath size={16} />
              {listing.bathrooms}
            </span>
          )}
          {listing.area_sqm > 0 && (
            <span className="text-xs text-gray-500">
              {listing.area_sqm} m²
            </span>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {listing.views_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {listing.favorites_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FILTER PANEL
// =============================================================================

function FilterPanel({ filters, onChange, onClose, isOpen }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl lg:relative lg:w-full lg:shadow-none lg:h-auto lg:rounded-xl lg:border lg:border-gray-100 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h3 className="font-bold text-lg">Filtros</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          
          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          {/* City */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
            <select
              value={filters.city}
              onChange={(e) => onChange({ ...filters, city: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CITIES.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>
          
          {/* Price Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rango de Precio</label>
            <select
              value={filters.priceRange}
              onChange={(e) => {
                const range = PRICE_RANGES.find(r => r.id === e.target.value);
                onChange({ 
                  ...filters, 
                  priceRange: e.target.value,
                  minPrice: range?.min,
                  maxPrice: range?.max
                });
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PRICE_RANGES.map(range => (
                <option key={range.id} value={range.id}>{range.label}</option>
              ))}
            </select>
          </div>
          
          {/* Bedrooms */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recámaras mínimas</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => onChange({ ...filters, bedrooms: num === filters.bedrooms ? null : num })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.bedrooms === num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num === 0 ? 'Todos' : num === 5 ? '5+' : num}
                </button>
              ))}
            </div>
          </div>
          
          {/* Featured Only */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.featured}
                onChange={(e) => onChange({ ...filters, featured: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Solo destacados</span>
            </label>
          </div>
          
          {/* Clear Filters */}
          <button
            onClick={() => onChange({
              category: 'all',
              city: 'all',
              priceRange: 'all',
              minPrice: null,
              maxPrice: null,
              bedrooms: null,
              featured: false,
            })}
            className="w-full py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN MARKETPLACE COMPONENT
// =============================================================================

export default function Marketplace({ onViewListing, onContact, onBack }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  
  // Get page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    city: 'all',
    priceRange: 'all',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    featured: false,
  });
  const [sortOption, setSortOption] = useState('created_at_desc');
  
  // Get viewMode from URL, default to 'grid'
  const viewMode = searchParams.get('view') || 'grid';
  
  // Update viewMode in URL
  const setViewMode = useCallback((mode) => {
    const newParams = new URLSearchParams(searchParams);
    if (mode === 'grid') {
      newParams.delete('view');
    } else {
      newParams.set('view', mode);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const [showFilters, setShowFilters] = useState(false);
  
  const lastFetchRef = useRef({ page: 0, filters: null, sortOption: null, searchQuery: null });
  
  // Update URL when page changes
  const updatePageInUrl = useCallback((page) => {
    const newParams = new URLSearchParams(searchParams);
    if (page === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', page.toString());
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Fetch listings
  const fetchListings = useCallback(async (page = 1, append = false) => {
    const sortConfig = SORT_OPTIONS.find(s => s.id === sortOption) || SORT_OPTIONS[0];
    
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      
      let result;
      
      if (searchQuery.trim()) {
        result = await api.listings.search(searchQuery, {
          city: filters.city !== 'all' ? filters.city : undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
        });
      } else {
        result = await api.listings.getAll({
          category: filters.category !== 'all' ? filters.category : undefined,
          city: filters.city !== 'all' ? filters.city : undefined,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          bedrooms: filters.bedrooms,
          featured: filters.featured ? true : undefined,
          page,
          limit: 20,
          sortBy: sortConfig.sortBy,
          sortOrder: sortConfig.sortOrder,
        });
      }
      
      const newListings = result.listings || result.data || result || [];
      
      if (append) {
        setListings(prev => [...prev, ...newListings]);
      } else {
        setListings(newListings);
      }
      
      if (result.pagination) {
        setPagination(result.pagination);
      } else {
        setPagination({
          page,
          totalPages: 1,
          totalCount: newListings.length,
        });
      }
      
      lastFetchRef.current = { page, filters, sortOption, searchQuery };
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, sortOption, searchQuery]);
  
  // Initial fetch and on filter change - reset to page 1
  useEffect(() => {
    const filtersChanged = JSON.stringify(lastFetchRef.current.filters) !== JSON.stringify(filters);
    const sortChanged = lastFetchRef.current.sortOption !== sortOption;
    
    if (filtersChanged || sortChanged) {
      if (currentPage !== 1) {
        updatePageInUrl(1);
      } else {
        fetchListings(1);
      }
    }
  }, [filters, sortOption, currentPage, updatePageInUrl, fetchListings]);
  
  // Search with debounce - reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      const searchChanged = lastFetchRef.current.searchQuery !== searchQuery;
      if (searchChanged) {
        if (currentPage !== 1) {
          updatePageInUrl(1);
        } else {
          fetchListings(1);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, updatePageInUrl, fetchListings]);
  
  // Fetch when page changes in URL
  useEffect(() => {
    if (lastFetchRef.current.page !== currentPage) {
      fetchListings(currentPage);
    }
  }, [currentPage, fetchListings]);
  
  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      updatePageInUrl(nextPage);
    }
  };
  
  const handleFavorite = (listing) => {
    // TODO: Implement favorites
    console.log('Favorite:', listing.id);
  };
  
  const activeFilterCount = [
    filters.category !== 'all',
    filters.city !== 'all',
    filters.priceRange !== 'all',
    filters.bedrooms !== null,
    filters.featured,
  ].filter(Boolean).length;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top bar with back and search */}
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                aria-label="Volver"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            )}
            
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, descripción, ubicación..."
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Filter Button (Mobile) */}
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors relative"
            >
              <SlidersHorizontal size={20} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Quick Filters & Sort */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilters(prev => ({ ...prev, category: cat.id }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.category === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              {/* Sort */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              
              {/* View Mode */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters (Desktop) */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-32">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilters(false)}
                isOpen={true}
              />
            </div>
          </div>
          
          {/* Results */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                {loading ? 'Cargando...' : (
                  <>
                    <span className="font-semibold text-gray-900">{pagination.totalCount || listings.length}</span> propiedades encontradas
                  </>
                )}
              </p>
            </div>
            
            {/* Loading State */}
            {loading ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {[...Array(6)].map((_, i) => (
                  <ListingCardSkeleton key={i} viewMode={viewMode} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <Home size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No se encontraron propiedades</h3>
                <p className="text-gray-500">Intenta ajustar los filtros o busca algo diferente</p>
              </div>
            ) : (
              <>
                {/* Listings Grid/List */}
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                    : 'space-y-4'
                }>
                  {listings.map(listing => (
                    <MarketplaceListingCard
                      key={listing.id}
                      listing={listing}
                      onView={onViewListing}
                      onContact={onContact}
                      onFavorite={handleFavorite}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {/* Load More */}
                {pagination.page < pagination.totalPages && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader2 className="animate-spin inline mr-2" size={18} />
                      ) : null}
                      Cargar Más
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
        isOpen={showFilters}
      />
    </div>
  );
}
