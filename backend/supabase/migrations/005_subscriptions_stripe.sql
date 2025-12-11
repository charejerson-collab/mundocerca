-- =============================================================================
-- MundoCerca - Migration 005: Enhanced Subscriptions with Stripe
-- =============================================================================
-- Production-grade subscription management with Stripe integration
-- =============================================================================

-- =============================================================================
-- SUBSCRIPTIONS TABLE (Enhanced)
-- =============================================================================

DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id BIGSERIAL PRIMARY KEY,
  
  -- User reference
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Plan info
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro', 'business')),
  
  -- Status management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Currently active
    'trialing',    -- In trial period
    'past_due',    -- Payment failed but grace period
    'canceled',    -- User canceled (may still be active until period end)
    'expired',     -- Subscription ended
    'paused'       -- Temporarily paused
  )),
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  has_used_trial BOOLEAN DEFAULT false,
  
  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  
  -- Payment metadata
  last_payment_at TIMESTAMPTZ,
  last_payment_amount INTEGER,
  last_payment_currency TEXT DEFAULT 'mxn',
  next_payment_at TIMESTAMPTZ,
  
  -- Feature flags (can override plan defaults)
  max_listings INTEGER,
  features_override JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id, status) WHERE status IN ('active', 'trialing');

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE should be done via service role (backend/webhooks)
-- No policies for write operations = only service role can write

-- =============================================================================
-- PAYMENT HISTORY TABLE
-- =============================================================================

CREATE TABLE public.payment_history (
  id BIGSERIAL PRIMARY KEY,
  
  -- User reference
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id BIGINT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe references
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  
  -- Payment details
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'mxn',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed')),
  
  -- Description
  description TEXT,
  
  -- Metadata
  payment_method_type TEXT,
  payment_method_last4 TEXT,
  receipt_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON public.payment_history(stripe_payment_intent_id);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- PLAN FEATURES TABLE (for feature gating)
-- =============================================================================

CREATE TABLE public.plan_features (
  id SERIAL PRIMARY KEY,
  plan TEXT NOT NULL UNIQUE CHECK (plan IN ('free', 'basic', 'pro', 'business')),
  
  -- Listing limits
  max_listings INTEGER NOT NULL,
  max_images_per_listing INTEGER DEFAULT 5,
  
  -- Feature flags
  can_feature_listing BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  can_use_api BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  
  -- Pricing (for display)
  price_monthly_mxn INTEGER,
  price_monthly_usd INTEGER,
  
  -- Metadata
  display_name TEXT NOT NULL,
  description TEXT,
  badge_color TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plan features
INSERT INTO public.plan_features (plan, max_listings, max_images_per_listing, can_feature_listing, can_view_analytics, can_export_data, can_use_api, priority_support, custom_branding, price_monthly_mxn, price_monthly_usd, display_name, description, badge_color)
VALUES
  ('free', 1, 3, false, false, false, false, false, false, 0, 0, 'Free', 'Get started with basic features', NULL),
  ('basic', 2, 5, false, false, false, false, false, false, 199, 12, 'Basic', 'Perfect for individual landlords', 'blue'),
  ('pro', 10, 10, true, true, true, false, true, false, 399, 25, 'Pro', 'For growing rental businesses', 'purple'),
  ('business', 100, 20, true, true, true, true, true, true, 699, 45, 'Business', 'Enterprise features for agencies', 'gold')
ON CONFLICT (plan) DO UPDATE SET
  max_listings = EXCLUDED.max_listings,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn,
  display_name = EXCLUDED.display_name;

-- Public read for plan features
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plan features" ON public.plan_features FOR SELECT USING (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id BIGINT,
  plan TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  max_listings INTEGER,
  can_feature_listing BOOLEAN,
  can_view_analytics BOOLEAN
) AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.plan,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    COALESCE(s.max_listings, pf.max_listings) as max_listings,
    pf.can_feature_listing,
    pf.can_view_analytics
  FROM public.subscriptions s
  JOIN public.plan_features pf ON pf.plan = s.plan
  WHERE s.user_id = v_user_id
    AND s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create listing
CREATE OR REPLACE FUNCTION public.can_create_listing(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_max_listings INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get max listings for user's plan
  SELECT COALESCE(s.max_listings, pf.max_listings) INTO v_max_listings
  FROM public.profiles pr
  LEFT JOIN public.subscriptions s ON s.user_id = pr.id AND s.status IN ('active', 'trialing')
  LEFT JOIN public.plan_features pf ON pf.plan = COALESCE(s.plan, pr.subscription_status)
  WHERE pr.id = v_user_id
  ORDER BY s.created_at DESC NULLS LAST
  LIMIT 1;
  
  -- Default to 1 if no plan found
  v_max_listings := COALESCE(v_max_listings, 1);
  
  -- Count current active listings
  SELECT COUNT(*) INTO v_current_count
  FROM public.listings
  WHERE owner_id = v_user_id
    AND status NOT IN ('archived', 'sold', 'rented');
  
  RETURN v_current_count < v_max_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync profile subscription status from subscriptions table
CREATE OR REPLACE FUNCTION public.sync_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile's subscription_status based on subscription
  UPDATE public.profiles
  SET
    subscription_status = CASE
      WHEN NEW.status IN ('active', 'trialing') THEN NEW.plan
      ELSE 'free'
    END,
    subscription_expires_at = NEW.current_period_end,
    stripe_customer_id = NEW.stripe_customer_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_profile_subscription_trigger ON public.subscriptions;
CREATE TRIGGER sync_profile_subscription_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_subscription();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.subscriptions IS 'User subscription records with Stripe integration';
COMMENT ON TABLE public.payment_history IS 'Payment transaction history';
COMMENT ON TABLE public.plan_features IS 'Plan feature configurations and limits';
