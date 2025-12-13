import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import api from '../api';

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, addToast, removeToast } = useToast();

  // Navigation & UI State
  const [searchText, setSearchText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive searchMode from route path or query param
  const searchMode = location.pathname.startsWith('/search/pros') 
    ? 'pros' 
    : location.pathname.startsWith('/search/homes')
    ? 'homes'
    : searchParams.get('searchMode') || 'homes';
  
  // Update searchMode - navigate to search route if on search page, otherwise update query param
  const setSearchMode = useCallback((mode) => {
    if (location.pathname.startsWith('/search/')) {
      // If on search page, navigate to appropriate search route
      if (mode === 'pros') {
        navigate('/search/pros');
      } else {
        navigate('/search/homes');
      }
    } else {
      // If on other pages, update query param
      const newParams = new URLSearchParams(searchParams);
      if (mode === 'homes') {
        newParams.delete('searchMode');
      } else {
        newParams.set('searchMode', mode);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [location.pathname, navigate, searchParams, setSearchParams]);

  // Auth State - restore from localStorage on mount
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('mc_user');
      const savedToken = localStorage.getItem('mc_token');
      if (savedUser && savedToken) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Failed to restore user session:', e);
    }
    return null;
  });
  
  const [lang, setLang] = useState('en');
  
  // Derive selectedPlan from URL query param, default to 'basic'
  const selectedPlan = searchParams.get('plan') || 'basic';
  
  // Update selectedPlan in URL
  const setSelectedPlan = useCallback((plan) => {
    const newParams = new URLSearchParams(searchParams);
    if (plan === 'basic') {
      newParams.delete('plan');
    } else {
      newParams.set('plan', plan);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Mock data for fallback
  const MOCK_LISTINGS = [
    {
      id: 101,
      title: 'Casa Familiar en Zona Norte',
      price: 12000,
      city_id: 'tapachula',
      category: 'house',
      bedrooms: 3,
      bathrooms: 2,
      description: 'Hermosa casa cerca del centro de Tapachula. Cuenta con jardín amplio y aire acondicionado en todas las habitaciones.',
      whatsapp: '529621234567',
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=1000',
      owner_id: 'user_local'
    },
    {
      id: 1,
      title: 'Modern Apartment in Polanco',
      price: 25000,
      city_id: 'cdmx',
      category: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      description: 'Beautiful apartment in the heart of Polanco. Walking distance to parks and museums. 24/7 Security.',
      whatsapp: '525512345678',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000',
      owner_id: 'user_1'
    },
    {
      id: 2,
      title: 'Cozy Room in Condesa',
      price: 8500,
      city_id: 'cdmx',
      category: 'room',
      bedrooms: 1,
      bathrooms: 1,
      description: 'Private room with shared bathroom in a hipster artistic flat.',
      whatsapp: '525512345678',
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=1000',
      owner_id: 'user_2'
    },
    {
      id: 3,
      title: 'Commercial Space Downtown',
      price: 15000,
      city_id: 'tapachula',
      category: 'business',
      bedrooms: 0,
      bathrooms: 1,
      description: 'Perfect locale for a small shop or office. High foot traffic area.',
      whatsapp: '529621234567',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
      owner_id: 'user_local'
    },
  ];

  const MOCK_PROFESSIONALS = [
    {
      id: 'p1',
      name: 'Lic. Marco Antonio',
      title: 'Immigration Specialist',
      category: 'legal',
      city_id: 'tapachula',
      rating: 4.9,
      reviews: 120,
      verified: true,
      description: 'Expert in Mexican residency, humanitarian visas, and citizenship processes. 15 years of experience.',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
      whatsapp: '529620000000'
    },
    {
      id: 'p2',
      name: 'Dr. Elena Rodriguez',
      title: 'Dental Surgeon',
      category: 'health',
      city_id: 'tapachula',
      rating: 5.0,
      reviews: 85,
      verified: true,
      description: 'English-speaking dentist specializing in implants and cosmetic dentistry. Modern clinic in downtown.',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
      whatsapp: '529620000000'
    },
    {
      id: 'p3',
      name: 'Arq. Sofia Mendoza',
      title: 'Architect & Interior Design',
      category: 'home',
      city_id: 'cdmx',
      rating: 4.8,
      reviews: 45,
      verified: true,
      description: 'Sustainable architecture and renovation services for expats buying property in CDMX.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      whatsapp: '525500000000'
    }
  ];

  // Data State - fetched from API, initialized with mock data as fallback
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [professionals, setProfessionals] = useState(MOCK_PROFESSIONALS);
  const [dataLoading, setDataLoading] = useState(true);

  // Centralized navigation function
  const navigateTo = useCallback((targetView, viewParams = {}) => {
    const routeMap = {
      'home': '/',
      'search-homes': '/search/homes',
      'search-pros': '/search/pros',
      'verify': '/verify',
      'plans': '/plans',
      'create-account': '/create-account',
      'confirm-subscription': '/confirm-subscription',
      'dashboard': '/dashboard',
      'login': '/login',
      'seller-dashboard': '/seller-dashboard',
      'create-listing': '/seller-dashboard/create',
      'edit-listing': `/seller-dashboard/edit/${viewParams.listingId || ''}`,
      'marketplace': '/marketplace',
      'listing-detail': `/listing/${viewParams.listingId || ''}`,
      'messages': '/messages'
    };
    
    let path = routeMap[targetView] || '/';
    
    // Add query params if needed
    const urlParams = new URLSearchParams();
    if (viewParams.cityId) urlParams.set('cityId', viewParams.cityId);
    if (viewParams.catId) urlParams.set('catId', viewParams.catId);
    if (viewParams.plan) urlParams.set('plan', viewParams.plan);
    // Preserve plan param when navigating to create-account if it exists
    if (targetView === 'create-account' && selectedPlan && selectedPlan !== 'basic') {
      urlParams.set('plan', selectedPlan);
    }
    const queryString = urlParams.toString();
    if (queryString) path += `?${queryString}`;
    
    navigate(path);
  }, [navigate, selectedPlan]);
  
  // Verify user session on mount and fetch subscription status
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('mc_token');
      const savedUser = localStorage.getItem('mc_user');
      if (!token || !savedUser) return;
      
      const currentUser = JSON.parse(savedUser);

      try {
        // Verify session with backend
        const sessionRes = await api.getSession().catch(() => null);
        if (!sessionRes || !sessionRes.user) {
          // Token invalid, clear session
          localStorage.removeItem('mc_token');
          localStorage.removeItem('mc_user');
          setUser(null);
          return;
        }

        // Fetch subscription status
        const subRes = await api.getSubscription().catch(() => null);
        if (subRes && subRes.subscription) {
          const updatedUser = {
            ...currentUser,
            subscriptionActive: subRes.subscription.status === 'active',
            subscriptionPlan: subRes.subscription.plan,
            freeMonthEnds: subRes.subscription.freeMonthEnds || subRes.subscription.free_month_ends
          };
          localStorage.setItem('mc_user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      }
    };
    verifySession();
  }, []); // Run once on mount

  // Fetch listings and professionals from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [listingsRes, prosRes] = await Promise.all([
          api.getListings().catch(() => null),
          api.getPros().catch(() => null)
        ]);
        
        // Handle both array response and {properties: []} response structure
        const listingsData = Array.isArray(listingsRes) ? listingsRes : listingsRes?.properties || listingsRes;
        const prosData = Array.isArray(prosRes) ? prosRes : prosRes?.professionals || prosRes;
        
        if (listingsData && Array.isArray(listingsData) && listingsData.length > 0) {
          setListings(listingsData);
        }
        if (prosData && Array.isArray(prosData) && prosData.length > 0) {
          setProfessionals(prosData);
        }
      } catch (err) {
        // Silently use fallback data if API fails
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helpers
  const formatMXN = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

  const value = {
    // Navigation
    navigateTo,
    
    // Auth
    user,
    setUser,
    
    // UI
    lang,
    setLang,
    searchMode,
    setSearchMode,
    searchText,
    setSearchText,
    mobileMenuOpen,
    setMobileMenuOpen,
    
    // Plans
    selectedPlan,
    setSelectedPlan,
    
    // Data
    listings,
    professionals,
    dataLoading,
    
    // Helpers
    formatMXN,
    
    // Toast
    toasts,
    addToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

