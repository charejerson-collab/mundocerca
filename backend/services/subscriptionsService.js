// =============================================================================
// MundoCerca - Subscriptions Service
// =============================================================================
// Stripe integration for subscription management
// =============================================================================

import Stripe from 'stripe';
import { supabase } from '../server.js';

// Initialize Stripe (lazy loaded)
let stripe = null;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    });
  }
  return stripe;
}

/**
 * Plan configurations with limits
 */
export const PLAN_CONFIGS = {
  free: {
    name: 'Gratis',
    price_monthly: 0,
    price_yearly: 0,
    max_listings: 3,
    max_images_per_listing: 5,
    featured_listings: 0,
    analytics_days: 7,
    priority_support: false,
    verified_badge: false,
    whatsapp_button: false,
    auto_renew_listings: false,
    social_share: true,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
  },
  basic: {
    name: 'Básico',
    price_monthly: 4.99,
    price_yearly: 49.99,
    max_listings: 10,
    max_images_per_listing: 10,
    featured_listings: 1,
    analytics_days: 30,
    priority_support: false,
    verified_badge: false,
    whatsapp_button: true,
    auto_renew_listings: true,
    social_share: true,
    stripe_price_id_monthly: process.env.STRIPE_BASIC_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_BASIC_YEARLY,
  },
  pro: {
    name: 'Profesional',
    price_monthly: 14.99,
    price_yearly: 149.99,
    max_listings: 50,
    max_images_per_listing: 20,
    featured_listings: 5,
    analytics_days: 90,
    priority_support: true,
    verified_badge: true,
    whatsapp_button: true,
    auto_renew_listings: true,
    social_share: true,
    stripe_price_id_monthly: process.env.STRIPE_PRO_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_PRO_YEARLY,
  },
  business: {
    name: 'Empresa',
    price_monthly: 49.99,
    price_yearly: 499.99,
    max_listings: -1, // Unlimited
    max_images_per_listing: 50,
    featured_listings: 20,
    analytics_days: 365,
    priority_support: true,
    verified_badge: true,
    whatsapp_button: true,
    auto_renew_listings: true,
    social_share: true,
    stripe_price_id_monthly: process.env.STRIPE_BUSINESS_MONTHLY,
    stripe_price_id_yearly: process.env.STRIPE_BUSINESS_YEARLY,
  },
};

/**
 * Get or create Stripe customer for user
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<string>} Stripe customer ID
 */
export async function getOrCreateStripeCustomer(userId, email) {
  const stripeClient = getStripe();
  if (!stripeClient || !supabase) {
    throw new Error('Stripe or Supabase not configured');
  }

  // Check if customer exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripeClient.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Save to profile
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

/**
 * Create checkout session for subscription
 * @param {Object} options - Checkout options
 * @returns {Promise<Object>} Checkout session
 */
export async function createCheckoutSession({
  userId,
  email,
  plan,
  interval = 'monthly',
  successUrl,
  cancelUrl,
}) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    throw new Error('Stripe not configured');
  }

  const planConfig = PLAN_CONFIGS[plan];
  if (!planConfig) {
    throw new Error('Invalid plan');
  }

  const priceId = interval === 'yearly' 
    ? planConfig.stripe_price_id_yearly 
    : planConfig.stripe_price_id_monthly;

  if (!priceId) {
    throw new Error('Plan price not configured');
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plan,
      },
    },
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Create portal session for subscription management
 * @param {string} userId - User ID
 * @param {string} returnUrl - URL to return to after portal
 * @returns {Promise<Object>} Portal session
 */
export async function createPortalSession(userId, returnUrl) {
  const stripeClient = getStripe();
  if (!stripeClient || !supabase) {
    throw new Error('Stripe or Supabase not configured');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const session = await stripeClient.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

/**
 * Handle Stripe webhook events
 * @param {string} rawBody - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Promise<Object>} Event processing result
 */
export async function handleWebhook(rawBody, signature) {
  const stripeClient = getStripe();
  if (!stripeClient || !supabase) {
    throw new Error('Stripe or Supabase not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Webhook secret not configured');
  }

  const event = stripeClient.webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret
  );

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true, type: event.type };
}

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;

  if (!userId || !plan) return;

  // Create subscription record
  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      stripe_subscription_id: session.subscription,
      stripe_customer_id: session.customer,
      plan,
      status: 'active',
    });

  if (error) {
    console.error('Error creating subscription:', error);
  }

  // Update profile
  await supabase
    .from('profiles')
    .update({
      subscription_tier: plan,
      stripe_customer_id: session.customer,
    })
    .eq('id', userId);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // Try to find by customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (!profile) return;
  }

  const plan = subscription.metadata?.plan || 'basic';
  const status = subscription.status === 'active' ? 'active' 
    : subscription.status === 'canceled' ? 'canceled'
    : subscription.status === 'past_due' ? 'past_due'
    : 'inactive';

  await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      user_id: userId,
      plan,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'stripe_subscription_id',
    });

  // Update profile tier
  await supabase
    .from('profiles')
    .update({
      subscription_tier: status === 'active' ? plan : 'free',
    })
    .eq('stripe_customer_id', subscription.customer);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);

  // Downgrade to free
  await supabase
    .from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('stripe_customer_id', subscription.customer);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      last_payment_date: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      payment_failed_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription);
}

/**
 * Get user's current subscription
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getUserSubscription(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    return null;
  }

  const planConfig = PLAN_CONFIGS[subscription.plan] || PLAN_CONFIGS.free;

  return {
    ...subscription,
    limits: planConfig,
  };
}

/**
 * Check if user can perform action based on plan limits
 * @param {string} userId - User ID
 * @param {string} action - Action to check
 * @param {Object} context - Additional context
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkPlanLimit(userId, action, context = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const limits = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free;

  switch (action) {
    case 'create_listing': {
      if (limits.max_listings === -1) {
        return { allowed: true };
      }

      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);

      if ((count || 0) >= limits.max_listings) {
        return {
          allowed: false,
          reason: `Has alcanzado el límite de ${limits.max_listings} anuncios para tu plan ${limits.name}`,
          limit: limits.max_listings,
          current: count,
        };
      }
      return { allowed: true };
    }

    case 'upload_images': {
      const imageCount = context.imageCount || 0;
      if (imageCount > limits.max_images_per_listing) {
        return {
          allowed: false,
          reason: `Tu plan permite hasta ${limits.max_images_per_listing} imágenes por anuncio`,
          limit: limits.max_images_per_listing,
        };
      }
      return { allowed: true };
    }

    case 'feature_listing': {
      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('is_featured', true);

      if ((count || 0) >= limits.featured_listings) {
        return {
          allowed: false,
          reason: `Tu plan permite hasta ${limits.featured_listings} anuncios destacados`,
          limit: limits.featured_listings,
          current: count,
        };
      }
      return { allowed: true };
    }

    case 'view_analytics': {
      return {
        allowed: true,
        days: limits.analytics_days,
      };
    }

    case 'use_whatsapp': {
      if (!limits.whatsapp_button) {
        return {
          allowed: false,
          reason: 'Actualiza tu plan para usar el botón de WhatsApp',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Get plan comparison for upgrade prompts
 * @returns {Object}
 */
export function getPlanComparison() {
  return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
    id: key,
    ...config,
    isPopular: key === 'pro',
  }));
}

/**
 * Cancel subscription
 * @param {string} userId - User ID
 * @param {boolean} immediately - Cancel immediately or at period end
 * @returns {Promise<Object>}
 */
export async function cancelSubscription(userId, immediately = false) {
  const stripeClient = getStripe();
  if (!stripeClient || !supabase) {
    throw new Error('Stripe or Supabase not configured');
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  if (immediately) {
    await stripeClient.subscriptions.cancel(subscription.stripe_subscription_id);
  } else {
    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  return { success: true };
}

export default {
  PLAN_CONFIGS,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getUserSubscription,
  checkPlanLimit,
  getPlanComparison,
  cancelSubscription,
};
