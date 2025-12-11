-- =============================================================================
-- MundoCerca - Migration 002: Enhanced Listings System
-- =============================================================================
-- Production-grade listings with full CRUD, search, and pagination support
-- =============================================================================

-- =============================================================================
-- LISTINGS TABLE (Enhanced)
-- =============================================================================

DROP TABLE IF EXISTS public.listings CASCADE;

CREATE TABLE public.listings (
  id BIGSERIAL PRIMARY KEY,
  
  -- Owner reference
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core listing data
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  slug TEXT UNIQUE,
  description TEXT CHECK (char_length(description) <= 5000),
  
  -- Pricing
  price INTEGER NOT NULL CHECK (price >= 0),
  price_type TEXT DEFAULT 'monthly' CHECK (price_type IN ('monthly', 'weekly', 'daily', 'yearly', 'sale')),
  currency TEXT DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  
  -- Category and type
  category TEXT NOT NULL CHECK (category IN ('house', 'apartment', 'room', 'business', 'land', 'office')),
  property_type TEXT DEFAULT 'rent' CHECK (property_type IN ('rent', 'sale', 'lease')),
  
  -- Property details
  bedrooms INTEGER DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms INTEGER DEFAULT 0 CHECK (bathrooms >= 0),
  area_sqm INTEGER CHECK (area_sqm > 0),
  parking_spaces INTEGER DEFAULT 0,
  
  -- Location
  city_id TEXT NOT NULL,
  neighborhood TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Media
  images TEXT[] DEFAULT '{}',
  featured_image TEXT,
  video_url TEXT,
  virtual_tour_url TEXT,
  
  -- Contact
  whatsapp TEXT,
  email TEXT,
  show_phone BOOLEAN DEFAULT true,
  
  -- Features and amenities (JSONB for flexibility)
  amenities JSONB DEFAULT '[]',
  features JSONB DEFAULT '{}',
  
  -- Status management
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'sold', 'rented', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- SEO and metadata
  meta_title TEXT,
  meta_description TEXT,
  
  -- Analytics (denormalized for performance)
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings(city_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_listings_active ON public.listings(status) WHERE status = 'active';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.listings 
  USING gin(to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Geospatial index (if PostGIS is enabled)
-- CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings USING gist(point(longitude, latitude));

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can view all own listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can create listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can delete own listings" ON public.listings;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active listings" ON public.listings
  FOR SELECT
  USING (status = 'active');

-- Owners can view all their listings (including drafts)
CREATE POLICY "Owners can view all own listings" ON public.listings
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Only sellers/landlords can create listings
CREATE POLICY "Sellers can create listings" ON public.listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND public.has_role(auth.uid(), 'seller')
    -- Enforce listing limits based on subscription
    AND (
      SELECT COUNT(*) FROM public.listings 
      WHERE owner_id = auth.uid() AND status NOT IN ('archived', 'sold', 'rented')
    ) < public.get_max_listings(auth.uid())
  );

-- Owners can update their own listings
CREATE POLICY "Owners can update own listings" ON public.listings
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete (archive) their own listings
CREATE POLICY "Owners can delete own listings" ON public.listings
  FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION public.generate_listing_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 80);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.listings WHERE slug = final_slug AND id != COALESCE(NEW.id, 0)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_listing_slug_trigger ON public.listings;
CREATE TRIGGER generate_listing_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON public.listings
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '' OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION public.generate_listing_slug();

-- Set published_at when status changes to active
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_published_at_trigger ON public.listings;
CREATE TRIGGER set_published_at_trigger
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_published_at();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_listings_updated_at ON public.listings;
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FUNCTIONS FOR LISTING OPERATIONS
-- =============================================================================

-- Full-text search function
CREATE OR REPLACE FUNCTION public.search_listings(
  search_query TEXT DEFAULT NULL,
  p_city_id TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  slug TEXT,
  description TEXT,
  price INTEGER,
  category TEXT,
  city_id TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  featured_image TEXT,
  images TEXT[],
  status TEXT,
  is_featured BOOLEAN,
  views_count INTEGER,
  created_at TIMESTAMPTZ,
  owner_name TEXT,
  owner_avatar TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.slug,
    l.description,
    l.price,
    l.category,
    l.city_id,
    l.bedrooms,
    l.bathrooms,
    l.featured_image,
    l.images,
    l.status,
    l.is_featured,
    l.views_count,
    l.created_at,
    p.name AS owner_name,
    p.avatar_url AS owner_avatar,
    CASE 
      WHEN search_query IS NOT NULL THEN
        ts_rank(to_tsvector('spanish', coalesce(l.title, '') || ' ' || coalesce(l.description, '')), 
                plainto_tsquery('spanish', search_query))
      ELSE 1.0
    END AS relevance
  FROM public.listings l
  LEFT JOIN public.profiles p ON l.owner_id = p.id
  WHERE l.status = 'active'
    AND (search_query IS NULL OR 
         to_tsvector('spanish', coalesce(l.title, '') || ' ' || coalesce(l.description, '')) @@ 
         plainto_tsquery('spanish', search_query))
    AND (p_city_id IS NULL OR l.city_id = p_city_id)
    AND (p_category IS NULL OR l.category = p_category)
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    AND (p_bedrooms IS NULL OR l.bedrooms >= p_bedrooms)
  ORDER BY 
    l.is_featured DESC,
    relevance DESC,
    l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get listing count for pagination
CREATE OR REPLACE FUNCTION public.count_listings(
  search_query TEXT DEFAULT NULL,
  p_city_id TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.listings l
    WHERE l.status = 'active'
      AND (search_query IS NULL OR 
           to_tsvector('spanish', coalesce(l.title, '') || ' ' || coalesce(l.description, '')) @@ 
           plainto_tsquery('spanish', search_query))
      AND (p_city_id IS NULL OR l.city_id = p_city_id)
      AND (p_category IS NULL OR l.category = p_category)
      AND (p_min_price IS NULL OR l.price >= p_min_price)
      AND (p_max_price IS NULL OR l.price <= p_max_price)
      AND (p_bedrooms IS NULL OR l.bedrooms >= p_bedrooms)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.listings IS 'Property listings with full CRUD, search, and pagination support';
