import React from 'react';
import { Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Components
import Auth from './components/Auth';
import PlansPage from './components/PlansPage';
import CreateAccountPage from './components/CreateAccountPage';
import ConfirmSubscriptionPage from './components/ConfirmSubscriptionPage';
import Dashboard from './components/Dashboard';
import SellerDashboard from './components/SellerDashboard';
import ListingForm from './components/ListingForm';
import Marketplace from './components/Marketplace';
import ListingDetail from './components/ListingDetail';
import MessagingPage from './components/Messaging';
import ListingCard from './components/ListingCard';

// Error Page Component
function ErrorPage({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-600 mb-6">Lo sentimos, ocurrió un error inesperado. Por favor intenta de nuevo.</p>
        {error?.message && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6 font-mono">{error.message}</p>
        )}
        <button
          onClick={resetErrorBoundary}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

export default function AppRoutes({
  // Navigation
  navigateTo,
  setView,
  
  // State
  user,
  setUser,
  lang,
  selectedPlan,
  setSelectedPlan,
  
  // UI State
  view,
  searchMode,
  setSearchMode,
  searchText,
  setSearchText,
  mobileMenuOpen,
  setMobileMenuOpen,
  
  // Data
  listings,
  professionals,
  formatMXN,
  
  // Components
  MainLayout,
  CategoryGrid,
  HomesView,
  ProsView,
  VerificationPage,
  
  // Toast
  addToast
}) {
  // Route wrapper components
  const PlansPageRoute = () => <PlansPage setView={setView} setSelectedPlan={setSelectedPlan} lang={lang} user={user} />;
  
  const CreateAccountPageRoute = () => {
    const [searchParams] = useSearchParams();
    const planFromUrl = searchParams.get('plan') || selectedPlan || 'basic';
    return <CreateAccountPage selectedPlan={planFromUrl} setView={setView} setUser={setUser} lang={lang} />;
  };
  
  const ConfirmSubscriptionPageRoute = () => <ConfirmSubscriptionPage selectedPlan={selectedPlan} setView={setView} setUser={setUser} lang={lang} />;
  
  const DashboardRoute = () => <Dashboard user={user} setUser={setUser} setView={setView} navigateTo={navigateTo} lang={lang} />;
  
  const LoginRoute = () => <Auth onLogin={(u) => { 
    setUser(u); 
    // Redirect to dashboard if user has active subscription, otherwise home
    if (u.subscriptionActive || u.subscriptionPlan) {
      navigateTo('dashboard');
    } else {
      navigateTo('home');
    }
  }} />;
  
  const SellerDashboardRoute = () => (
    <SellerDashboard 
      user={user}
      setUser={setUser}
      setView={(v, p) => navigateTo(v, p || {})}
      lang={lang}
      onBack={() => navigateTo('dashboard')}
      onCreateListing={() => navigateTo('create-listing')}
      onEditListing={(listing) => navigateTo('edit-listing', { listingId: listing.id })}
      onViewMessages={() => navigateTo('messages')}
    />
  );
  
  const CreateListingRoute = () => (
    <ListingForm 
      user={user}
      onBack={() => navigateTo('seller-dashboard')}
      onSuccess={(listing) => {
        addToast(lang === 'en' ? 'Listing created successfully!' : '¡Anuncio creado exitosamente!', 'success');
        navigateTo('seller-dashboard');
      }}
    />
  );
  
  const EditListingRoute = () => {
    const params = useParams();
    return (
      <ListingForm 
        user={user}
        listingId={params.listingId}
        onBack={() => navigateTo('seller-dashboard')}
        onSuccess={(listing) => {
          addToast(lang === 'en' ? 'Listing updated successfully!' : '¡Anuncio actualizado exitosamente!', 'success');
          navigateTo('seller-dashboard');
        }}
      />
    );
  };
  
  const MarketplaceRoute = () => (
    <Marketplace 
      user={user}
      onBack={() => navigateTo('home')}
      onViewListing={(listing) => navigateTo('listing-detail', { listingId: listing.id })}
    />
  );
  
  const ListingDetailRoute = () => {
    const params = useParams();
    return (
      <ListingDetail 
        listingId={params.listingId}
        user={user}
        onBack={() => navigateTo('marketplace')}
        onMessage={(listing) => {}}
      />
    );
  };
  
  const MessagesRoute = () => (
    <MessagingPage 
      user={user}
      onBack={() => navigateTo('seller-dashboard')}
    />
  );
  
  const HomeRoute = () => (
    <MainLayout>
      <CategoryGrid />
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Featured Homes' : 'Casas Destacadas'}</h3>
            <p className="text-gray-600 mt-1">{lang === 'en' ? 'Discover your perfect place to live' : 'Descubre tu lugar perfecto para vivir'}</p>
          </div>
          <button 
            onClick={() => { setSearchMode('homes'); navigateTo('search-homes'); }} 
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            {lang === 'en' ? 'View all' : 'Ver todos'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.slice(0, 3).map((l) => (
            <ListingCard key={l.id} listing={l} compact={true} formatMXN={formatMXN} onDetails={(li) => { navigateTo('listing-detail', { listingId: li.id }); }} />
          ))}
        </div>
      </section>
    </MainLayout>
  );
  
  const SearchHomesRoute = () => (
    <MainLayout>
      <CategoryGrid />
      <HomesView />
    </MainLayout>
  );
  
  const SearchProsRoute = () => (
    <MainLayout>
      <CategoryGrid />
      <ProsView />
    </MainLayout>
  );
  
  const VerifyRoute = () => (
    <MainLayout>
      <CategoryGrid />
      <VerificationPage />
    </MainLayout>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/search/homes" element={<SearchHomesRoute />} />
        <Route path="/search/pros" element={<SearchProsRoute />} />
        <Route path="/verify" element={<VerifyRoute />} />
        <Route path="/plans" element={<PlansPageRoute />} />
        <Route path="/create-account" element={<CreateAccountPageRoute />} />
        <Route path="/confirm-subscription" element={<ConfirmSubscriptionPageRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/seller-dashboard" element={<SellerDashboardRoute />} />
        <Route path="/seller-dashboard/create" element={<CreateListingRoute />} />
        <Route path="/seller-dashboard/edit/:listingId" element={<EditListingRoute />} />
        <Route path="/marketplace" element={<MarketplaceRoute />} />
        <Route path="/listing/:listingId" element={<ListingDetailRoute />} />
        <Route path="/messages/:conversationId" element={<MessagesRoute />} />
        <Route path="/messages" element={<MessagesRoute />} />
      </Routes>
    </ErrorBoundary>
  );
}

