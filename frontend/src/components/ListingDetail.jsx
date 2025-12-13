// =============================================================================
// MundoCerca - Listing Detail Page
// =============================================================================
// Full property detail view with contact options and analytics tracking
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Car,
  Ruler,
  Calendar,
  Eye,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  ExternalLink,
  Loader2,
  User,
  Shield,
  Clock
} from 'lucide-react';
import api, { createViewTracker } from '../services/apiV2';

// =============================================================================
// IMAGE GALLERY
// =============================================================================

function ImageGallery({ images, title }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  // Get current index from URL, default to 0
  const currentIndex = parseInt(searchParams.get('image') || '0', 10);
  
  // Update image index in URL
  const setCurrentIndex = useCallback((index) => {
    const newParams = new URLSearchParams(searchParams);
    if (index === 0) {
      newParams.delete('image');
    } else {
      newParams.set('image', index.toString());
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400">Sin imágenes</p>
      </div>
    );
  }
  
  // Ensure currentIndex is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  
  useEffect(() => {
    if (safeIndex !== currentIndex) {
      setCurrentIndex(safeIndex);
    }
  }, [currentIndex, safeIndex, setCurrentIndex]);
  
  const goNext = () => setCurrentIndex((safeIndex + 1) % images.length);
  const goPrev = () => setCurrentIndex((safeIndex - 1 + images.length) % images.length);
  
  return (
    <>
      {/* Main Gallery */}
      <div className="relative">
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
          <img 
            src={images[safeIndex]} 
            alt={`${title} - ${safeIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          />
        </div>
        
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <ChevronRight size={24} />
            </button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === safeIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === safeIndex ? 'border-indigo-500' : 'border-transparent'
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      
      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X size={28} />
          </button>
          
          <button
            onClick={goPrev}
            className="absolute left-4 p-3 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={32} />
          </button>
          
          <img 
            src={images[safeIndex]} 
            alt={`${title} - ${safeIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          
          <button
            onClick={goNext}
            className="absolute right-4 p-3 text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight size={32} />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
            {safeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// CONTACT CARD
// =============================================================================

function ContactCard({ listing, onWhatsApp, onMessage, onPhone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
      {/* Price */}
      <div className="mb-6">
        <p className="text-3xl font-bold text-indigo-600">
          ${listing.price?.toLocaleString()}
          <span className="text-base font-normal text-gray-500">
            /{listing.price_type === 'monthly' ? 'mes' : listing.price_type === 'weekly' ? 'semana' : listing.price_type}
          </span>
        </p>
        {listing.currency !== 'MXN' && (
          <p className="text-sm text-gray-500">{listing.currency}</p>
        )}
      </div>
      
      {/* Seller Info */}
      {listing.owner && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {listing.owner.full_name?.[0] || 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{listing.owner.full_name || 'Usuario'}</p>
            {listing.owner.verified && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Shield size={12} />
                Verificado
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Contact Buttons */}
      <div className="space-y-3">
        {listing.whatsapp && (
          <button
            onClick={onWhatsApp}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Phone size={20} />
            WhatsApp
          </button>
        )}
        
        <button
          onClick={onMessage}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <MessageSquare size={20} />
          Enviar Mensaje
        </button>
        
        {listing.show_phone && listing.whatsapp && (
          <button
            onClick={onPhone}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Phone size={20} />
            Ver Teléfono
          </button>
        )}
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Eye size={16} />
          {listing.views_count || 0} vistas
        </span>
        <span className="flex items-center gap-1">
          <Heart size={16} />
          {listing.favorites_count || 0} favoritos
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// AMENITIES DISPLAY
// =============================================================================

const AMENITY_LABELS = {
  wifi: 'WiFi',
  ac: 'Aire Acondicionado',
  parking: 'Estacionamiento',
  pool: 'Alberca',
  gym: 'Gimnasio',
  security: 'Seguridad 24/7',
  elevator: 'Elevador',
  furnished: 'Amueblado',
  pets: 'Acepta Mascotas',
  laundry: 'Lavandería',
  garden: 'Jardín',
  terrace: 'Terraza',
};

function AmenitiesList({ amenities }) {
  if (!amenities || amenities.length === 0) return null;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {amenities.map(amenity => (
        <div key={amenity} className="flex items-center gap-2 text-gray-700">
          <Check size={18} className="text-green-500" />
          {AMENITY_LABELS[amenity] || amenity}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN LISTING DETAIL COMPONENT
// =============================================================================

export default function ListingDetail({ listingId, onBack, onMessage }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [tracker, setTracker] = useState(null);
  
  // Fetch listing
  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await api.listings.getById(listingId);
        setListing(data);
        
        // Setup view tracking
        const viewTracker = createViewTracker(listingId);
        setTracker(viewTracker);
        viewTracker.recordView();
      } catch (err) {
        setError(err.message || 'No se pudo cargar el anuncio');
      } finally {
        setLoading(false);
      }
    };
    
    fetchListing();
    
    // Cleanup - finalize tracking on unmount
    return () => {
      tracker?.finalize();
    };
  }, [listingId]);
  
  // Scroll tracking
  useEffect(() => {
    if (!tracker) return;
    
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      tracker.updateScrollDepth(scrollPercent);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tracker]);
  
  const handleWhatsApp = () => {
    tracker?.trackWhatsAppClick();
    const message = encodeURIComponent(`Hola, me interesa la propiedad: ${listing.title}`);
    window.open(`https://wa.me/${listing.whatsapp}?text=${message}`, '_blank');
  };
  
  const handleMessage = () => {
    tracker?.trackContactClick();
    if (user) {
      onMessage?.(listing);
    } else {
      // Redirect to login
      alert('Inicia sesión para enviar mensajes');
    }
  };
  
  const handlePhone = () => {
    setShowPhone(true);
  };
  
  const handleFavorite = () => {
    tracker?.trackFavorite();
    setIsFavorite(!isFavorite);
    // TODO: Save to backend
  };
  
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Mira esta propiedad: ${listing.title}`,
          url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }
  
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="bg-white rounded-xl p-8 border border-red-100">
            <p className="text-red-600">{error || 'Anuncio no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const images = listing.images?.length > 0 
    ? listing.images 
    : listing.featured_image 
      ? [listing.featured_image] 
      : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Volver</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite 
                    ? 'bg-red-50 text-red-500' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <ImageGallery images={images} title={listing.title} />
            
            {/* Title & Location */}
            <div>
              <div className="flex flex-wrap items-start gap-2 mb-2">
                {listing.is_featured && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    ⭐ Destacado
                  </span>
                )}
                {listing.is_verified && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                    <Shield size={12} />
                    Verificado
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full capitalize">
                  {listing.category}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {listing.title}
              </h1>
              
              <p className="text-gray-600 flex items-center gap-1">
                <MapPin size={18} />
                {listing.neighborhood && `${listing.neighborhood}, `}
                {listing.city_id}
                {listing.address && ` - ${listing.address}`}
              </p>
            </div>
            
            {/* Features */}
            <div className="flex flex-wrap gap-6 p-6 bg-white rounded-xl border border-gray-100">
              {listing.bedrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Bed size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.bedrooms}</p>
                    <p className="text-xs text-gray-500">Recámaras</p>
                  </div>
                </div>
              )}
              
              {listing.bathrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Bath size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.bathrooms}</p>
                    <p className="text-xs text-gray-500">Baños</p>
                  </div>
                </div>
              )}
              
              {listing.parking_spaces > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Car size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.parking_spaces}</p>
                    <p className="text-xs text-gray-500">Estacionamiento</p>
                  </div>
                </div>
              )}
              
              {listing.area_sqm > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Ruler size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.area_sqm} m²</p>
                    <p className="text-xs text-gray-500">Área</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {listing.description || 'Sin descripción disponible.'}
              </p>
            </div>
            
            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenidades</h2>
                <AmenitiesList amenities={listing.amenities} />
              </div>
            )}
            
            {/* Published Date */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              Publicado el {new Date(listing.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ContactCard
              listing={listing}
              onWhatsApp={handleWhatsApp}
              onMessage={handleMessage}
              onPhone={handlePhone}
            />
            
            {/* Phone Modal */}
            {showPhone && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Teléfono de Contacto</h3>
                  <p className="text-2xl font-bold text-indigo-600 mb-4">{listing.whatsapp}</p>
                  <div className="flex gap-3">
                    <a
                      href={`tel:${listing.whatsapp}`}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium text-center hover:bg-indigo-700 transition-colors"
                    >
                      Llamar
                    </a>
                    <button
                      onClick={() => setShowPhone(false)}
                      className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
