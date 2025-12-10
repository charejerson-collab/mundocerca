// =============================================================================
// Services Index - Re-export all services
// =============================================================================

export { default as authService } from './authService';
export { default as listingsService } from './listingsService';
export { default as professionalsService } from './professionalsService';
export { default as subscriptionsService } from './subscriptionsService';

// Individual exports for convenience
export { 
  signUp, 
  signIn, 
  signOut, 
  getUser,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
  onAuthStateChange,
} from './authService';

export {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} from './listingsService';

export {
  getProfessionals,
  getProfessional,
  createProfessional,
  updateProfessional,
  deleteProfessional,
} from './professionalsService';

export {
  getSubscription,
  activateSubscription,
  cancelSubscription,
  updateSubscriptionPlan,
} from './subscriptionsService';
