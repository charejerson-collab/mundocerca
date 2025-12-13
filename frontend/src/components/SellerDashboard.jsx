// =============================================================================
// MundoCerca - Seller Dashboard (Enhanced)
// =============================================================================
// Full-featured dashboard with real analytics, listings management, and messaging
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  List, 
  CreditCard, 
  Settings, 
  LogOut, 
  TrendingUp, 
  Eye, 
  MessageSquare,
  Calendar,
  Sparkles,
  ChevronRight,
  BarChart3,
  Users,
  Heart,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../services/apiV2';

// =============================================================================
// PLAN CONFIGURATION
// =============================================================================

const PLAN_DETAILS = {
  free: { name: 'Plan Gratis', price: 0, maxListings: 3, icon: '🆓', color: 'gray' },
  basic: { name: 'Plan Básico', price: 99, maxListings: 10, icon: '📦', color: 'blue' },
  pro: { name: 'Plan Pro', price: 299, maxListings: 50, icon: '🚀', color: 'purple' },
  business: { name: 'Plan Empresa', price: 699, maxListings: -1, icon: '🏢', color: 'indigo' }
};

// =============================================================================
// DASHBOARD TABS
// =============================================================================

const TABS = [
  { id: 'overview', label: 'Resumen', icon: BarChart3 },
  { id: 'listings', label: 'Mis Anuncios', icon: List },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'analytics', label: 'Analíticas', icon: TrendingUp },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({ label, value, change, changeType, icon: Icon, color }) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={24} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
          }`}>
            {isPositive ? <ArrowUpRight size={16} /> : isNegative ? <ArrowDownRight size={16} /> : null}
            {change}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-4">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// =============================================================================
// LISTING STATUS BADGE
// =============================================================================

function StatusBadge({ status }) {
  const configs = {
    active: { label: 'Activo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Clock },
    paused: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
    pending: { label: 'Pendiente', color: 'bg-blue-100 text-blue-700', icon: Clock },
    sold: { label: 'Vendido', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    rented: { label: 'Rentado', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    archived: { label: 'Archivado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  };
  
  const config = configs[status] || configs.draft;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// =============================================================================
// MY LISTING CARD
// =============================================================================

function MyListingCard({ listing, onEdit, onDelete, onToggleStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
      <div className="flex">
        {/* Image */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 relative">
          <img 
            src={listing.featured_image || listing.images?.[0] || 'https://via.placeholder.com/200x200?text=Sin+Imagen'} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {listing.is_featured && (
            <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
              ⭐ Destacado
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
              <p className="text-sm text-gray-500">{listing.city_id} • {listing.category}</p>
            </div>
            <StatusBadge status={listing.status} />
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="font-bold text-lg text-indigo-600">
              ${listing.price?.toLocaleString()} <span className="text-xs font-normal text-gray-500">/mes</span>
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-auto pt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye size={14} /> {listing.views_count || 0} vistas
            </span>
            <span className="flex items-center gap-1">
              <Heart size={14} /> {listing.favorites_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={14} /> {listing.inquiries_count || 0}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 flex flex-col gap-2 border-l border-gray-100">
          <button 
            onClick={() => onEdit(listing)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={() => onToggleStatus(listing)}
            className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title={listing.status === 'active' ? 'Pausar' : 'Activar'}
          >
            {listing.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button 
            onClick={() => onDelete(listing)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CONVERSATION ITEM
// =============================================================================

function ConversationItem({ conversation, onClick, isActive }) {
  return (
    <button
      onClick={() => onClick(conversation)}
      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
        isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {conversation.other_user?.full_name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-900 truncate">
              {conversation.other_user?.full_name || 'Usuario'}
            </p>
            <span className="text-xs text-gray-500">
              {new Date(conversation.updated_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">
            {conversation.listing?.title || 'Sin título'}
          </p>
          {conversation.latest_message && (
            <p className="text-sm text-gray-500 truncate mt-1">
              {conversation.latest_message.content}
            </p>
          )}
          {conversation.unread_count > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white text-xs rounded-full mt-1">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${
        isOwn 
          ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md' 
          : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
      } px-4 py-3`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// ANALYTICS CHART (Simple Bar Chart)
// =============================================================================

function SimpleBarChart({ data, label }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">{label}</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all hover:from-indigo-600 hover:to-purple-600"
              style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: item.value > 0 ? '8px' : '0' }}
            />
            <span className="text-xs text-gray-500 mt-2">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function SellerDashboard({ user, setUser, setView, lang = 'es', onBack, onCreateListing, onEditListing, onViewMessages }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL, default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';
  
  // Update tab in URL
  const setActiveTab = useCallback((tab) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    // Clear conversationId when switching away from messages tab
    if (tab !== 'messages') {
      newParams.delete('conversationId');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Ensure we have navigation functions - use callbacks if setView not provided
  const navigateTo = (view, params) => {
    if (setView) {
      setView(view, params);
    }
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [listings, setListings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Get active conversation from URL when on messages tab
  const conversationIdFromUrl = searchParams.get('conversationId');
  const activeConversation = conversationIdFromUrl && conversations.length > 0
    ? conversations.find(c => c.id.toString() === conversationIdFromUrl) || null
    : null;
  
  // Update conversation in URL
  const setActiveConversation = useCallback((conversation) => {
    const newParams = new URLSearchParams(searchParams);
    if (conversation) {
      newParams.set('conversationId', conversation.id.toString());
    } else {
      newParams.delete('conversationId');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const plan = PLAN_DETAILS[subscription?.plan || user?.subscriptionPlan || 'free'];
  
  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  
  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await api.analytics.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, []);
  
  const fetchListings = useCallback(async () => {
    try {
      const result = await api.listings.getByUser(user.id);
      setListings(result.listings || result.data || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    }
  }, [user?.id]);
  
  const fetchConversations = useCallback(async () => {
    try {
      const convs = await api.messages.getConversations();
      setConversations(convs || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);
  
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await api.messages.getUnreadCount();
      setUnreadCount(result.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);
  
  const fetchSubscription = useCallback(async () => {
    try {
      const sub = await api.subscriptions.getCurrent();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  }, []);
  
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      const result = await api.messages.getMessages(conversationId);
      setMessages(result.messages || []);
      await api.messages.markAsRead(conversationId);
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [fetchUnreadCount]);
  
  // Fetch messages when conversationId changes in URL
  useEffect(() => {
    if (activeConversation && activeTab === 'messages') {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id, activeTab, fetchMessages]);
  
  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchListings(),
        fetchConversations(),
        fetchUnreadCount(),
        fetchSubscription(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchDashboardData, fetchListings, fetchConversations, fetchUnreadCount, fetchSubscription]);
  
  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchListings(),
      fetchConversations(),
      fetchUnreadCount(),
    ]);
    setRefreshing(false);
  };
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const handleLogout = () => {
    localStorage.removeItem('mc_user');
    localStorage.removeItem('mc_token');
    setUser(null);
    setView('home');
  };
  
  const handleEditListing = (listing) => {
    setView('edit-listing', { listingId: listing.id });
  };
  
  const handleDeleteListing = async (listing) => {
    if (!confirm('¿Estás seguro de eliminar este anuncio?')) return;
    try {
      await api.listings.delete(listing.id);
      setListings(prev => prev.filter(l => l.id !== listing.id));
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };
  
  const handleToggleStatus = async (listing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    try {
      await api.listings.update(listing.id, { status: newStatus });
      setListings(prev => prev.map(l => 
        l.id === listing.id ? { ...l, status: newStatus } : l
      ));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
  
  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
  };
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    try {
      const newMessage = await api.messages.send(activeConversation.id, messageInput.trim());
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
    } catch (error) {
      alert('Error al enviar: ' + error.message);
    }
  };
  
  const handleUpgradePlan = async () => {
    setView('plans');
  };
  
  const handleCreateListing = () => {
    setView('create-listing');
  };
  
  // ==========================================================================
  // STATS CALCULATION
  // ==========================================================================
  
  const stats = [
    { 
      label: 'Vistas Totales', 
      value: dashboardData?.total_views?.toLocaleString() || '0', 
      change: dashboardData?.views_change_pct || 0,
      changeType: (dashboardData?.views_change_pct || 0) > 0 ? 'positive' : (dashboardData?.views_change_pct || 0) < 0 ? 'negative' : 'neutral',
      icon: Eye, 
      color: 'bg-blue-100 text-blue-600' 
    },
    { 
      label: 'Visitantes Únicos', 
      value: dashboardData?.total_unique_visitors?.toLocaleString() || '0', 
      icon: Users, 
      color: 'bg-green-100 text-green-600' 
    },
    { 
      label: 'Anuncios Activos', 
      value: dashboardData?.active_listings?.toString() || listings.filter(l => l.status === 'active').length.toString(), 
      icon: Home, 
      color: 'bg-purple-100 text-purple-600' 
    },
    { 
      label: 'Mensajes', 
      value: unreadCount.toString(), 
      icon: MessageSquare, 
      color: 'bg-orange-100 text-orange-600' 
    },
  ];
  
  // Weekly chart data (mock if no real data)
  const weeklyData = dashboardData?.weekly_views || [
    { label: 'Lun', value: 0 },
    { label: 'Mar', value: 0 },
    { label: 'Mié', value: 0 },
    { label: 'Jue', value: 0 },
    { label: 'Vie', value: 0 },
    { label: 'Sáb', value: 0 },
    { label: 'Dom', value: 0 },
  ];
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="flex items-center gap-2">
                <Home size={22} className="text-indigo-600" />
                <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Mundo Cerca
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
              
              {/* Notifications */}
              <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* User Menu */}
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right">
                  <p className="font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{plan.name}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'auto' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <span className="ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ¡Bienvenido, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600">Aquí tienes un resumen de tu negocio</p>
            </div>
            
            {/* Plan Banner */}
            <div className={`bg-gradient-to-r ${
              plan.color === 'purple' ? 'from-purple-500 to-indigo-600' :
              plan.color === 'blue' ? 'from-blue-500 to-cyan-600' :
              plan.color === 'indigo' ? 'from-indigo-500 to-purple-600' :
              'from-gray-500 to-gray-600'
            } rounded-2xl p-6 text-white`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{plan.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="opacity-90">
                      {plan.maxListings === -1 
                        ? 'Anuncios ilimitados' 
                        : `Hasta ${plan.maxListings} anuncios`}
                    </p>
                  </div>
                </div>
                {plan.price === 0 && (
                  <button 
                    onClick={handleUpgradePlan}
                    className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Mejorar Plan
                  </button>
                )}
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleCreateListing}
                className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-left hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transition-all group"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Plus size={24} />
                </div>
                <h3 className="font-bold text-lg">Crear Nuevo Anuncio</h3>
                <p className="text-white/80 text-sm">Publica tu propiedad ahora</p>
              </button>
              
              <button
                onClick={() => setActiveTab('listings')}
                className="p-6 bg-white border border-gray-100 rounded-2xl text-left hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <List size={24} />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Ver Mis Anuncios</h3>
                <p className="text-gray-500 text-sm">{listings.length} anuncios en total</p>
              </button>
            </div>
            
            {/* Weekly Chart */}
            <SimpleBarChart data={weeklyData} label="Vistas de la Semana" />
          </div>
        )}
        
        {/* LISTINGS TAB */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Mis Anuncios</h2>
              <button
                onClick={handleCreateListing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Nuevo Anuncio
              </button>
            </div>
            
            {listings.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home size={32} className="text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sin anuncios todavía</h3>
                <p className="text-gray-500 mb-6">Crea tu primer anuncio para comenzar</p>
                <button
                  onClick={handleCreateListing}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Crear Mi Primer Anuncio
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map(listing => (
                  <MyListingCard
                    key={listing.id}
                    listing={listing}
                    onEdit={handleEditListing}
                    onDelete={handleDeleteListing}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
            <div className="flex h-full">
              {/* Conversations List */}
              <div className="w-80 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Mensajes</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Sin conversaciones</p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        onClick={handleSelectConversation}
                        isActive={activeConversation?.id === conv.id}
                      />
                    ))
                  )}
                </div>
              </div>
              
              {/* Messages Panel */}
              <div className="flex-1 flex flex-col">
                {activeConversation ? (
                  <>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {activeConversation.other_user?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {activeConversation.other_user?.full_name || 'Usuario'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activeConversation.listing?.title}
                        </p>
                      </div>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {messages.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isOwn={msg.sender_id === user.id}
                        />
                      ))}
                    </div>
                    
                    {/* Input */}
                    <div className="p-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Escribe un mensaje..."
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim()}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Selecciona una conversación</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Analíticas</h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleBarChart data={weeklyData} label="Vistas por Día" />
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Top Anuncios</h3>
                <div className="space-y-3">
                  {listings
                    .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
                    .slice(0, 5)
                    .map((listing, idx) => (
                      <div key={listing.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <span className="flex-1 truncate text-gray-900">{listing.title}</span>
                        <span className="text-sm text-gray-500">{listing.views_count || 0} vistas</span>
                      </div>
                    ))}
                  {listings.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Sin datos</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Perfil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input 
                    type="text"
                    value={user?.name || ''}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={user?.email || ''}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    readOnly
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Suscripción</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{plan.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500">${plan.price}/mes</p>
                  </div>
                </div>
                <button
                  onClick={handleUpgradePlan}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  {plan.price === 0 ? 'Mejorar Plan' : 'Administrar'}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-red-100">
              <h3 className="font-semibold text-red-600 mb-4">Zona de Peligro</h3>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
