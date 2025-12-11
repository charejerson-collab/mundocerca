// =============================================================================
// MundoCerca - Listing Form (Create/Edit)
// =============================================================================
// Full-featured form for creating and editing property listings
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  X,
  Plus,
  Home,
  Building,
  Building2,
  Store,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Car,
  Ruler,
  Phone,
  Mail,
  Image,
  Video,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../services/apiV2';

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORIES = [
  { id: 'house', label: 'Casa', icon: Home },
  { id: 'apartment', label: 'Departamento', icon: Building },
  { id: 'room', label: 'Cuarto', icon: Bed },
  { id: 'business', label: 'Local Comercial', icon: Store },
  { id: 'office', label: 'Oficina', icon: Building2 },
  { id: 'land', label: 'Terreno', icon: MapPin },
];

const PRICE_TYPES = [
  { id: 'monthly', label: 'Por mes' },
  { id: 'weekly', label: 'Por semana' },
  { id: 'daily', label: 'Por día' },
  { id: 'yearly', label: 'Por año' },
  { id: 'sale', label: 'Venta' },
];

const PROPERTY_TYPES = [
  { id: 'rent', label: 'Renta' },
  { id: 'sale', label: 'Venta' },
  { id: 'lease', label: 'Arrendamiento' },
];

const CITIES = [
  { id: 'tapachula', name: 'Tapachula', state: 'Chiapas' },
  { id: 'cdmx', name: 'Ciudad de México', state: 'CDMX' },
  { id: 'guadalajara', name: 'Guadalajara', state: 'Jalisco' },
  { id: 'monterrey', name: 'Monterrey', state: 'Nuevo León' },
  { id: 'cancun', name: 'Cancún', state: 'Quintana Roo' },
  { id: 'tuxtla', name: 'Tuxtla Gutiérrez', state: 'Chiapas' },
  { id: 'merida', name: 'Mérida', state: 'Yucatán' },
  { id: 'puebla', name: 'Puebla', state: 'Puebla' },
];

const AMENITIES = [
  { id: 'wifi', label: 'WiFi' },
  { id: 'ac', label: 'Aire Acondicionado' },
  { id: 'parking', label: 'Estacionamiento' },
  { id: 'pool', label: 'Alberca' },
  { id: 'gym', label: 'Gimnasio' },
  { id: 'security', label: 'Seguridad 24/7' },
  { id: 'elevator', label: 'Elevador' },
  { id: 'furnished', label: 'Amueblado' },
  { id: 'pets', label: 'Acepta Mascotas' },
  { id: 'laundry', label: 'Lavandería' },
  { id: 'garden', label: 'Jardín' },
  { id: 'terrace', label: 'Terraza' },
];

// =============================================================================
// IMAGE UPLOAD COMPONENT
// =============================================================================

function ImageUploader({ images, onChange, maxImages = 10 }) {
  const [dragOver, setDragOver] = useState(false);
  
  const handleFiles = (files) => {
    const newImages = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') && images.length + newImages.length < maxImages) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push(e.target.result);
          if (newImages.length === files.length || images.length + newImages.length >= maxImages) {
            onChange([...images, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };
  
  const handleRemove = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };
  
  const handleSetFeatured = (index) => {
    const newImages = [...images];
    const [featured] = newImages.splice(index, 1);
    newImages.unshift(featured);
    onChange(newImages);
  };
  
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <Image size={40} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          Arrastra imágenes aquí o{' '}
          <label className="text-indigo-600 cursor-pointer hover:underline">
            selecciona archivos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="text-sm text-gray-400">
          {images.length}/{maxImages} imágenes • Máx. 5MB cada una
        </p>
      </div>
      
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {idx !== 0 && (
                  <button
                    onClick={() => handleSetFeatured(idx)}
                    className="p-2 bg-white rounded-full text-yellow-600 hover:bg-yellow-50"
                    title="Hacer principal"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={() => handleRemove(idx)}
                  className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  <X size={16} />
                </button>
              </div>
              {idx === 0 && (
                <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AMENITIES SELECTOR
// =============================================================================

function AmenitiesSelector({ selected, onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {AMENITIES.map(amenity => (
        <button
          key={amenity.id}
          type="button"
          onClick={() => toggle(amenity.id)}
          className={`p-3 rounded-xl border text-left transition-all ${
            selected.includes(amenity.id)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {selected.includes(amenity.id) ? (
              <CheckCircle size={18} className="text-indigo-600" />
            ) : (
              <div className="w-[18px] h-[18px] border-2 border-gray-300 rounded-full" />
            )}
            {amenity.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// FORM SECTION COMPONENT
// =============================================================================

function FormSection({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// MAIN LISTING FORM COMPONENT
// =============================================================================

export default function ListingForm({ listingId = null, onBack, onSuccess }) {
  const isEditing = !!listingId;
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'house',
    property_type: 'rent',
    price: '',
    price_type: 'monthly',
    currency: 'MXN',
    city_id: '',
    neighborhood: '',
    address: '',
    bedrooms: 0,
    bathrooms: 0,
    parking_spaces: 0,
    area_sqm: '',
    amenities: [],
    images: [],
    whatsapp: '',
    email: '',
    show_phone: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [limitError, setLimitError] = useState(null);
  
  // Load existing listing if editing
  useEffect(() => {
    if (isEditing) {
      loadListing();
    } else {
      checkLimits();
    }
  }, [listingId]);
  
  const loadListing = async () => {
    setLoading(true);
    try {
      const listing = await api.listings.getById(listingId);
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        category: listing.category || 'house',
        property_type: listing.property_type || 'rent',
        price: listing.price?.toString() || '',
        price_type: listing.price_type || 'monthly',
        currency: listing.currency || 'MXN',
        city_id: listing.city_id || '',
        neighborhood: listing.neighborhood || '',
        address: listing.address || '',
        bedrooms: listing.bedrooms || 0,
        bathrooms: listing.bathrooms || 0,
        parking_spaces: listing.parking_spaces || 0,
        area_sqm: listing.area_sqm?.toString() || '',
        amenities: listing.amenities || [],
        images: listing.images || [],
        whatsapp: listing.whatsapp || '',
        email: listing.email || '',
        show_phone: listing.show_phone !== false,
      });
    } catch (err) {
      setError('No se pudo cargar el anuncio');
    } finally {
      setLoading(false);
    }
  };
  
  const checkLimits = async () => {
    try {
      const result = await api.subscriptions.checkLimit('create_listing');
      if (!result.allowed) {
        setLimitError(result.reason);
      }
    } catch (err) {
      console.error('Failed to check limits:', err);
    }
  };
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!formData.price || parseInt(formData.price) <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }
    if (!formData.city_id) {
      setError('Selecciona una ciudad');
      return;
    }
    
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        area_sqm: formData.area_sqm ? parseInt(formData.area_sqm) : null,
        status: 'active',
      };
      
      if (isEditing) {
        await api.listings.update(listingId, payload);
      } else {
        await api.listings.create(payload);
      }
      
      onSuccess?.();
    } catch (err) {
      if (err.data?.upgrade) {
        setLimitError(err.message);
      } else {
        setError(err.message || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }
  
  if (limitError && !isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft size={20} />
            Volver
          </button>
          
          <div className="bg-white rounded-xl p-8 text-center border border-red-100">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Límite Alcanzado</h2>
            <p className="text-gray-600 mb-6">{limitError}</p>
            <button
              onClick={() => onBack?.('plans')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Mejorar Mi Plan
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex gap-4 w-full max-w-2xl">
            {['Información Básica', 'Precio', 'Ubicación', 'Detalles', 'Amenidades', 'Imágenes', 'Contacto'].map((label, idx) => (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 border-2 ${idx === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-200 text-gray-500 border-gray-300'}`}>{idx + 1}</div>
                <span className={`text-xs text-center ${idx === 0 ? 'text-indigo-700 font-semibold' : 'text-gray-400'}`}>{label}</span>
              </div>
              ))}
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Anuncio' : 'Nuevo Anuncio'}
              </h1>
              <p className="text-gray-500">
                {isEditing ? 'Actualiza los detalles de tu propiedad' : 'Publica tu propiedad en minutos'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Guardar Cambios' : 'Publicar Anuncio'}
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <FormSection title="Información Básica" description="Datos principales de tu propiedad">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título del Anuncio *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ej: Hermoso departamento en zona centro"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 mt-1">{formData.title.length}/200 caracteres</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe tu propiedad con detalle..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  maxLength={5000}
                />
                <p className="text-xs text-gray-400 mt-1">{formData.description.length}/5000 caracteres</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Propiedad *</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleChange('category', cat.id)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          formData.category === cat.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={24} className="mx-auto mb-2" />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormSection>
          
          {/* Pricing */}
          <FormSection title="Precio" description="Define el precio de tu propiedad">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio *</label>
                <div className="relative">
                  <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Precio</label>
                <select
                  value={formData.price_type}
                  onChange={(e) => handleChange('price_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRICE_TYPES.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>
          
          {/* Location */}
          <FormSection title="Ubicación" description="¿Dónde está ubicada tu propiedad?">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad *</label>
                <select
                  value={formData.city_id}
                  onChange={(e) => handleChange('city_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecciona una ciudad</option>
                  {CITIES.map(city => (
                    <option key={city.id} value={city.id}>{city.name}, {city.state}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Colonia / Barrio</label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  placeholder="Ej: Colonia Centro"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ej: Av. Principal #123"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </FormSection>
          
          {/* Details */}
          <FormSection title="Detalles" description="Características de la propiedad">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bed size={16} className="inline mr-1" />
                  Recámaras
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bath size={16} className="inline mr-1" />
                  Baños
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => handleChange('bathrooms', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Car size={16} className="inline mr-1" />
                  Estacionamiento
                </label>
                <input
                  type="number"
                  value={formData.parking_spaces}
                  onChange={(e) => handleChange('parking_spaces', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Ruler size={16} className="inline mr-1" />
                  Área (m²)
                </label>
                <input
                  type="number"
                  value={formData.area_sqm}
                  onChange={(e) => handleChange('area_sqm', e.target.value)}
                  min="0"
                  placeholder="Opcional"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </FormSection>
          
          {/* Amenities */}
          <FormSection title="Amenidades" description="Selecciona las amenidades disponibles">
            <AmenitiesSelector
              selected={formData.amenities}
              onChange={(val) => handleChange('amenities', val)}
            />
          </FormSection>
          
          {/* Images */}
          <FormSection title="Imágenes" description="Agrega fotos de tu propiedad (la primera será la principal)">
            <ImageUploader
              images={formData.images}
              onChange={(val) => handleChange('images', val)}
              maxImages={10}
            />
          </FormSection>
          
          {/* Contact */}
          <FormSection title="Contacto" description="Cómo te pueden contactar los interesados">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="inline mr-1" />
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="Ej: 529621234567"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail size={16} className="inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_phone}
                onChange={(e) => handleChange('show_phone', e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Mostrar mi teléfono en el anuncio</span>
            </label>
          </FormSection>
          
          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isEditing ? 'Guardar Cambios' : 'Publicar Anuncio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
