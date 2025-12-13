import React from 'react';
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
  ChevronRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: 199, maxListings: 2, icon: '📦' },
  pro: { name: 'Pro Plan', price: 399, maxListings: 10, icon: '🚀' },
  business: { name: 'Business Plan', price: 699, maxListings: 25, icon: '🏢' }
};

export default function Dashboard() {
  const { user, setUser, navigateTo, lang } = useApp();
  const plan = PLAN_DETAILS[user?.subscriptionPlan] || PLAN_DETAILS.basic;
  
  const freeMonthEnds = user?.freeMonthEnds 
    ? new Date(user.freeMonthEnds).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const handleLogout = () => {
    localStorage.removeItem('mc_user');
    localStorage.removeItem('mc_token');
    setUser(null);
    navigateTo('home');
  };

  // Mock stats
  const stats = [
    { label: lang === 'en' ? 'Total Views' : 'Vistas Totales', value: '0', icon: Eye, color: 'bg-blue-100 text-blue-600' },
    { label: lang === 'en' ? 'Active Listings' : 'Listados Activos', value: '0', icon: Home, color: 'bg-green-100 text-green-600' },
    { label: lang === 'en' ? 'Messages' : 'Mensajes', value: '0', icon: MessageSquare, color: 'bg-purple-100 text-purple-600' },
    { label: lang === 'en' ? 'This Month' : 'Este Mes', value: '$0', icon: TrendingUp, color: 'bg-orange-100 text-orange-600' }
  ];

  const quickActions = [
    { 
      title: lang === 'en' ? 'Add Your First Casa' : 'Agrega Tu Primera Casa', 
      desc: lang === 'en' ? 'Start listing your property' : 'Comienza a listar tu propiedad',
      icon: Plus,
      primary: true,
      action: () => navigateTo('create-listing')
    },
    { 
      title: lang === 'en' ? 'Manage Listings' : 'Administrar Listados', 
      desc: lang === 'en' ? 'View and edit your properties' : 'Ver y editar tus propiedades',
      icon: List,
      primary: false,
      action: () => navigateTo('seller-dashboard')
    },
    { 
      title: lang === 'en' ? 'Billing & Plan' : 'Facturación y Plan', 
      desc: lang === 'en' ? 'Manage your subscription' : 'Administra tu suscripción',
      icon: CreditCard,
      primary: false,
      action: () => navigateTo('plans')
    },
    { 
      title: lang === 'en' ? 'Settings' : 'Configuración', 
      desc: lang === 'en' ? 'Account preferences' : 'Preferencias de cuenta',
      icon: Settings,
      primary: false,
      action: () => navigateTo('seller-dashboard')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigateTo('home')} className="flex items-center gap-2">
                <Home size={22} className="text-indigo-600" />
                <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Mundo Cerca</span>
              </button>
              <span className="hidden md:inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {lang === 'en' ? 'Dashboard' : 'Panel'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{plan.name}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={lang === 'en' ? 'Logout' : 'Cerrar Sesión'}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {lang === 'en' ? 'Welcome, ' : '¡Bienvenido, '}{user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            {lang === 'en' 
              ? "Here's an overview of your rental business" 
              : 'Aquí tienes un resumen de tu negocio de alquiler'}
          </p>
        </div>

        {/* Free Month Banner */}
        {freeMonthEnds && (
          <div className="mb-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{lang === 'en' ? 'Free Month Active!' : '¡Mes Gratis Activo!'}</h3>
                  <p className="opacity-90">
                    {lang === 'en' ? 'Your free trial ends on ' : 'Tu prueba gratis termina el '}{freeMonthEnds}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span className="font-medium">{lang === 'en' ? '30 days remaining' : '30 días restantes'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Plan Details Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{plan.icon}</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                <p className="text-gray-500">
                  {lang === 'en' ? 'Up to ' : 'Hasta '}{plan.maxListings} {lang === 'en' ? 'listings' : 'listados'} • ${plan.price} MXN/{lang === 'en' ? 'month' : 'mes'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigateTo('plans')}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
            >
              {lang === 'en' ? 'Upgrade Plan' : 'Mejorar Plan'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {lang === 'en' ? 'Quick Actions' : 'Acciones Rápidas'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={action.action}
                className={`p-6 rounded-xl text-left transition-all flex items-center gap-4 group ${
                  action.primary 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200' 
                    : 'bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  action.primary ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${action.primary ? 'text-white' : 'text-gray-900'}`}>
                    {action.title}
                  </h3>
                  <p className={`text-sm ${action.primary ? 'text-white/80' : 'text-gray-500'}`}>
                    {action.desc}
                  </p>
                </div>
                <ChevronRight size={20} className={action.primary ? 'text-white/60' : 'text-gray-400 group-hover:text-indigo-600'} />
              </button>
            );
          })}
        </div>

        {/* Empty State for Listings */}
        <div className="mt-12 text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home size={40} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {lang === 'en' ? 'No listings yet' : 'Aún no tienes listados'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {lang === 'en' 
              ? 'Start showcasing your properties to reach thousands of potential renters across Mexico.'
              : 'Comienza a mostrar tus propiedades para llegar a miles de posibles inquilinos en todo México.'}
          </p>
          <button 
            onClick={() => navigateTo('create-listing')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
          >
            <span className="flex items-center gap-2">
              <Plus size={20} />
              {lang === 'en' ? 'Add Your First Property' : 'Agrega Tu Primera Propiedad'}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
