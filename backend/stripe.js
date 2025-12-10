// =============================================================================
// MundoCerca Stripe Payment Integration
// =============================================================================

import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan configurations with Stripe Price IDs
// You need to create these products/prices in Stripe Dashboard
const PLANS = {
  basic: {
    name: 'Basic Plan',
    priceMonthly: 299, // $2.99 USD in cents
    priceMXN: 49, // MXN pesos
    features: ['1 active listing', 'Basic support', '30-day free trial'],
    stripePriceId: process.env.STRIPE_PRICE_ID_BASIC || 'price_basic'
  },
  pro: {
    name: 'Pro Plan', 
    priceMonthly: 999, // $9.99 USD in cents
    priceMXN: 149,
    features: ['5 active listings', 'Priority support', 'Featured listings', '30-day free trial'],
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO || 'price_pro'
  },
  business: {
    name: 'Business Plan',
    priceMonthly: 2499, // $24.99 USD in cents
    priceMXN: 399,
    features: ['Unlimited listings', '24/7 support', 'Featured + highlighted', 'Analytics dashboard', '30-day free trial'],
    stripePriceId: process.env.STRIPE_PRICE_ID_BUSINESS || 'price_business'
  }
};

export { stripe, PLANS };

// =============================================================================
// Stripe Checkout Session
// =============================================================================

export async function createCheckoutSession(req, res) {
  const { plan } = req.body;
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    const planConfig = PLANS[plan];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30, // 30-day free trial
        metadata: {
          userId: userId,
          plan: plan,
        },
      },
      metadata: {
        userId: userId,
        plan: plan,
      },
      success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/plans?canceled=true`,
      allow_promotion_codes: true,
    });

    res.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// =============================================================================
// Stripe Customer Portal (for managing subscription)
// =============================================================================

export async function createPortalSession(req, res) {
  const userId = req.user?.id;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    // Get user's Stripe customer ID from database
    const { supabase, db } = await import('./server.js');
    
    let stripeCustomerId;
    
    if (supabase) {
      const { data } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      stripeCustomerId = data?.stripe_customer_id;
    } else if (db) {
      const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(userId);
      stripeCustomerId = user?.stripe_customer_id;
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal session error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

// =============================================================================
// Stripe Webhook Handler
// =============================================================================

export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Import database connection
  const { supabase, db } = await import('./server.js');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        console.log(`✅ Checkout completed for user ${userId}, plan: ${plan}`);

        if (supabase) {
          // Update user with Stripe customer ID
          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);

          // Create/update subscription record
          await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan: plan,
              status: 'active',
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              start_date: new Date().toISOString(),
              free_month_ends: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: 'user_id' });
        } else if (db) {
          // SQLite fallback
          db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, userId);
          
          const freeMonthEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          db.prepare(`
            INSERT OR REPLACE INTO subscriptions 
            (user_id, plan, status, stripe_subscription_id, stripe_customer_id, start_date, free_month_ends)
            VALUES (?, ?, 'active', ?, ?, datetime('now'), ?)
          `).run(userId, plan, subscriptionId, customerId, freeMonthEnds);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status;

        console.log(`📝 Subscription updated: ${subscription.id}, status: ${status}`);

        if (supabase) {
          await supabase
            .from('subscriptions')
            .update({ status: status === 'active' ? 'active' : 'cancelled' })
            .eq('stripe_subscription_id', subscription.id);
        } else if (db) {
          db.prepare('UPDATE subscriptions SET status = ? WHERE stripe_subscription_id = ?')
            .run(status === 'active' ? 'active' : 'cancelled', subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        console.log(`❌ Subscription cancelled: ${subscription.id}`);

        if (supabase) {
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('stripe_subscription_id', subscription.id);
        } else if (db) {
          db.prepare('UPDATE subscriptions SET status = ? WHERE stripe_subscription_id = ?')
            .run('cancelled', subscription.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed for invoice: ${invoice.id}`);
        // Could send email notification here
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`💰 Payment succeeded for invoice: ${invoice.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// =============================================================================
// Get Subscription Status
// =============================================================================

export async function getSubscriptionStatus(req, res) {
  const userId = req.user?.id;

  try {
    const { supabase, db } = await import('./server.js');
    
    let subscription;
    
    if (supabase) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      subscription = data;
    } else if (db) {
      subscription = db.prepare(`
        SELECT * FROM subscriptions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(userId);
    }

    if (!subscription) {
      return res.json({ hasSubscription: false, subscription: null });
    }

    // Check if subscription is still in trial
    const now = new Date();
    const trialEnds = new Date(subscription.free_month_ends);
    const isInTrial = now < trialEnds;

    res.json({
      hasSubscription: subscription.status === 'active',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        isInTrial,
        trialEndsAt: subscription.free_month_ends,
        startDate: subscription.start_date,
      }
    });
  } catch (err) {
    console.error('Get subscription status error:', err);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
}
