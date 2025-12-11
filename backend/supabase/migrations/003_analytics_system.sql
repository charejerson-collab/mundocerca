-- =============================================================================
-- MundoCerca - Migration 003: Analytics & Views Tracking
-- =============================================================================
-- Track listing views, unique visitors, and engagement metrics
-- =============================================================================

-- =============================================================================
-- LISTING VIEWS TABLE
-- =============================================================================

CREATE TABLE public.listing_views (
  id BIGSERIAL PRIMARY KEY,
  
  -- What was viewed
  listing_id BIGINT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Who viewed (optional - can be anonymous)
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Anonymous visitor tracking (hashed fingerprint)
  visitor_hash TEXT NOT NULL,
  
  -- Session tracking
  session_id TEXT,
  
  -- Referrer and source tracking
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Device and location info
  user_agent TEXT,
  ip_country TEXT,
  ip_city TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  
  -- Engagement metrics
  duration_seconds INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0 CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
  clicked_contact BOOLEAN DEFAULT false,
  clicked_whatsapp BOOLEAN DEFAULT false,
  added_favorite BOOLEAN DEFAULT false,
  
  -- Timestamp
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR ANALYTICS QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_views_listing ON public.listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_views_viewer ON public.listing_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_views_visitor ON public.listing_views(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_views_date ON public.listing_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_views_listing_date ON public.listing_views(listing_id, viewed_at DESC);

-- Composite index for unique visitor counting
CREATE INDEX IF NOT EXISTS idx_views_unique ON public.listing_views(listing_id, visitor_hash, DATE(viewed_at));

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listing owners can view analytics" ON public.listing_views;
DROP POLICY IF EXISTS "Anyone can insert views" ON public.listing_views;

-- Listing owners can view analytics for their listings
CREATE POLICY "Listing owners can view analytics" ON public.listing_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_views.listing_id
      AND owner_id = auth.uid()
    )
  );

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can insert views" ON public.listing_views
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- DAILY ANALYTICS AGGREGATION TABLE
-- =============================================================================

CREATE TABLE public.listing_analytics_daily (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- View metrics
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement metrics
  total_duration_seconds BIGINT DEFAULT 0,
  avg_scroll_depth INTEGER DEFAULT 0,
  
  -- Conversion metrics
  contact_clicks INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  favorites_added INTEGER DEFAULT 0,
  inquiries_sent INTEGER DEFAULT 0,
  
  -- Device breakdown
  desktop_views INTEGER DEFAULT 0,
  mobile_views INTEGER DEFAULT 0,
  tablet_views INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(listing_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_listing ON public.listing_analytics_daily(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.listing_analytics_daily(date DESC);

ALTER TABLE public.listing_analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view daily analytics" ON public.listing_analytics_daily;

CREATE POLICY "Owners can view daily analytics" ON public.listing_analytics_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_analytics_daily.listing_id
      AND owner_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTION: Record a listing view
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_listing_view(
  p_listing_id BIGINT,
  p_visitor_hash TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_viewer_id UUID DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown'
)
RETURNS BOOLEAN AS $$
DECLARE
  is_new_view BOOLEAN := false;
BEGIN
  -- Check if this is a unique view (same visitor, same listing, within 24 hours)
  IF NOT EXISTS (
    SELECT 1 FROM public.listing_views
    WHERE listing_id = p_listing_id
      AND visitor_hash = p_visitor_hash
      AND viewed_at > NOW() - INTERVAL '24 hours'
  ) THEN
    is_new_view := true;
  END IF;
  
  -- Insert the view record
  INSERT INTO public.listing_views (
    listing_id,
    viewer_id,
    visitor_hash,
    session_id,
    referrer,
    user_agent,
    device_type
  ) VALUES (
    p_listing_id,
    p_viewer_id,
    p_visitor_hash,
    p_session_id,
    p_referrer,
    p_user_agent,
    p_device_type
  );
  
  -- Update denormalized view count on listing
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = p_listing_id;
  
  RETURN is_new_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Update view engagement (duration, scroll, clicks)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_view_engagement(
  p_listing_id BIGINT,
  p_visitor_hash TEXT,
  p_session_id TEXT,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_scroll_depth INTEGER DEFAULT NULL,
  p_clicked_contact BOOLEAN DEFAULT NULL,
  p_clicked_whatsapp BOOLEAN DEFAULT NULL,
  p_added_favorite BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.listing_views
  SET
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
    scroll_depth = GREATEST(COALESCE(p_scroll_depth, scroll_depth), scroll_depth),
    clicked_contact = clicked_contact OR COALESCE(p_clicked_contact, false),
    clicked_whatsapp = clicked_whatsapp OR COALESCE(p_clicked_whatsapp, false),
    added_favorite = added_favorite OR COALESCE(p_added_favorite, false)
  WHERE listing_id = p_listing_id
    AND visitor_hash = p_visitor_hash
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND viewed_at > NOW() - INTERVAL '24 hours'
  ORDER BY viewed_at DESC
  LIMIT 1;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Get listing analytics summary
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_listing_analytics(
  p_listing_id BIGINT,
  p_period TEXT DEFAULT '30d'
)
RETURNS TABLE (
  total_views BIGINT,
  unique_visitors BIGINT,
  avg_duration_seconds NUMERIC,
  avg_scroll_depth NUMERIC,
  contact_rate NUMERIC,
  whatsapp_rate NUMERIC,
  favorite_rate NUMERIC,
  desktop_pct NUMERIC,
  mobile_pct NUMERIC
) AS $$
DECLARE
  interval_val INTERVAL;
BEGIN
  -- Parse period
  interval_val := CASE p_period
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    WHEN '90d' THEN INTERVAL '90 days'
    WHEN 'all' THEN INTERVAL '100 years'
    ELSE INTERVAL '30 days'
  END;
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_views,
    COUNT(DISTINCT visitor_hash)::BIGINT as unique_visitors,
    ROUND(AVG(lv.duration_seconds)::NUMERIC, 1) as avg_duration_seconds,
    ROUND(AVG(lv.scroll_depth)::NUMERIC, 1) as avg_scroll_depth,
    ROUND((COUNT(*) FILTER (WHERE lv.clicked_contact)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2) as contact_rate,
    ROUND((COUNT(*) FILTER (WHERE lv.clicked_whatsapp)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2) as whatsapp_rate,
    ROUND((COUNT(*) FILTER (WHERE lv.added_favorite)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2) as favorite_rate,
    ROUND((COUNT(*) FILTER (WHERE lv.device_type = 'desktop')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1) as desktop_pct,
    ROUND((COUNT(*) FILTER (WHERE lv.device_type = 'mobile')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1) as mobile_pct
  FROM public.listing_views lv
  WHERE lv.listing_id = p_listing_id
    AND lv.viewed_at > NOW() - interval_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Get daily analytics for charts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_listing_analytics_daily(
  p_listing_id BIGINT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  views INTEGER,
  unique_visitors INTEGER,
  contact_clicks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as d
  )
  SELECT
    ds.d as date,
    COALESCE(COUNT(lv.id), 0)::INTEGER as views,
    COALESCE(COUNT(DISTINCT lv.visitor_hash), 0)::INTEGER as unique_visitors,
    COALESCE(COUNT(*) FILTER (WHERE lv.clicked_contact OR lv.clicked_whatsapp), 0)::INTEGER as contact_clicks
  FROM date_series ds
  LEFT JOIN public.listing_views lv ON DATE(lv.viewed_at) = ds.d AND lv.listing_id = p_listing_id
  GROUP BY ds.d
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Get seller dashboard summary
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_seller_dashboard(p_seller_id UUID)
RETURNS TABLE (
  total_listings BIGINT,
  active_listings BIGINT,
  total_views BIGINT,
  total_unique_visitors BIGINT,
  total_inquiries BIGINT,
  total_favorites BIGINT,
  views_this_month BIGINT,
  views_change_pct NUMERIC
) AS $$
DECLARE
  views_last_month BIGINT;
  views_this_month_val BIGINT;
BEGIN
  -- Get basic counts
  SELECT INTO total_listings COUNT(*) FROM public.listings WHERE owner_id = p_seller_id;
  SELECT INTO active_listings COUNT(*) FROM public.listings WHERE owner_id = p_seller_id AND status = 'active';
  
  -- Get total views
  SELECT INTO total_views COALESCE(SUM(views_count), 0) FROM public.listings WHERE owner_id = p_seller_id;
  
  -- Get unique visitors (approximation from views table)
  SELECT INTO total_unique_visitors COUNT(DISTINCT visitor_hash)
  FROM public.listing_views lv
  JOIN public.listings l ON l.id = lv.listing_id
  WHERE l.owner_id = p_seller_id;
  
  -- Get inquiry and favorites counts
  SELECT INTO total_inquiries COALESCE(SUM(inquiries_count), 0) FROM public.listings WHERE owner_id = p_seller_id;
  SELECT INTO total_favorites COALESCE(SUM(favorites_count), 0) FROM public.listings WHERE owner_id = p_seller_id;
  
  -- Calculate month-over-month change
  SELECT INTO views_this_month_val COUNT(*)
  FROM public.listing_views lv
  JOIN public.listings l ON l.id = lv.listing_id
  WHERE l.owner_id = p_seller_id
    AND lv.viewed_at >= DATE_TRUNC('month', CURRENT_DATE);
  
  SELECT INTO views_last_month COUNT(*)
  FROM public.listing_views lv
  JOIN public.listings l ON l.id = lv.listing_id
  WHERE l.owner_id = p_seller_id
    AND lv.viewed_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND lv.viewed_at < DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN QUERY SELECT
    total_listings,
    active_listings,
    total_views,
    total_unique_visitors,
    total_inquiries,
    total_favorites,
    views_this_month_val as views_this_month,
    CASE 
      WHEN views_last_month = 0 THEN 100.0
      ELSE ROUND(((views_this_month_val - views_last_month)::NUMERIC / views_last_month::NUMERIC) * 100, 1)
    END as views_change_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.listing_views IS 'Tracks all listing views with engagement metrics';
COMMENT ON TABLE public.listing_analytics_daily IS 'Aggregated daily analytics for faster dashboard queries';
