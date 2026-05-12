-- Public marketplace businesses for tindivo.com.
--
-- This is intentionally separate from public.restaurants, which remains the
-- delivery operations aggregate used by delivery.tindivo.com.

CREATE TABLE IF NOT EXISTS public.marketplace_businesses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone                  TEXT NOT NULL CHECK (phone ~ '^9\d{8}$'),
  address                TEXT NOT NULL CHECK (char_length(address) BETWEEN 5 AND 220),
  description            TEXT,
  accent_color           CHAR(6) NOT NULL DEFAULT 'FF6B35' CHECK (accent_color ~ '^[0-9a-fA-F]{6}$'),
  coordinates            GEOGRAPHY(point, 4326),
  delivery_restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  is_published           BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_businesses_public
  ON public.marketplace_businesses (is_active, is_published, name);

CREATE INDEX IF NOT EXISTS idx_marketplace_businesses_user
  ON public.marketplace_businesses (user_id);

COMMENT ON TABLE public.marketplace_businesses IS
  'Negocios que se registran desde tindivo.com para aparecer en el marketplace publico. No implica servicio de delivery.';
COMMENT ON COLUMN public.marketplace_businesses.delivery_restaurant_id IS
  'Link opcional a public.restaurants cuando el negocio tambien usa delivery Tindivo.';

CREATE TABLE IF NOT EXISTS public.marketplace_menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.marketplace_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_menu_categories_business
  ON public.marketplace_menu_categories (business_id, is_active, sort_order, name);

CREATE TABLE IF NOT EXISTS public.marketplace_menu_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.marketplace_businesses(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES public.marketplace_menu_categories(id) ON DELETE SET NULL,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description    TEXT,
  price          NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url      TEXT,
  prep_minutes   INT CHECK (prep_minutes IS NULL OR prep_minutes BETWEEN 5 AND 120),
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_menu_items_business
  ON public.marketplace_menu_items (business_id, is_available, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_marketplace_menu_items_category
  ON public.marketplace_menu_items (category_id, is_available, sort_order, name);

CREATE TABLE IF NOT EXISTS public.marketplace_menu_modifier_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.marketplace_menu_items(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  min_selected INT NOT NULL DEFAULT 0 CHECK (min_selected >= 0),
  max_selected INT NOT NULL DEFAULT 1 CHECK (max_selected >= 1),
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_selected >= min_selected)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_menu_modifier_groups_item
  ON public.marketplace_menu_modifier_groups (menu_item_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.marketplace_menu_modifier_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.marketplace_menu_modifier_groups(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  price_delta  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_delta >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_menu_modifier_options_group
  ON public.marketplace_menu_modifier_options (group_id, is_available, sort_order, name);

GRANT SELECT ON TABLE
  public.marketplace_businesses,
  public.marketplace_menu_categories,
  public.marketplace_menu_items,
  public.marketplace_menu_modifier_groups,
  public.marketplace_menu_modifier_options
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.marketplace_businesses,
  public.marketplace_menu_categories,
  public.marketplace_menu_items,
  public.marketplace_menu_modifier_groups,
  public.marketplace_menu_modifier_options
TO authenticated;

GRANT ALL ON TABLE
  public.marketplace_businesses,
  public.marketplace_menu_categories,
  public.marketplace_menu_items,
  public.marketplace_menu_modifier_groups,
  public.marketplace_menu_modifier_options
TO service_role;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.marketplace_businesses WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION private.current_business_id() TO authenticated, service_role;

ALTER TABLE public.marketplace_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_menu_modifier_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketplace_businesses_public_read ON public.marketplace_businesses
  FOR SELECT USING (is_active = TRUE AND is_published = TRUE);

CREATE POLICY marketplace_businesses_business_all ON public.marketplace_businesses
  FOR ALL
  USING (public.current_user_role() = 'business'::public.user_role AND user_id = auth.uid())
  WITH CHECK (public.current_user_role() = 'business'::public.user_role AND user_id = auth.uid());

CREATE POLICY marketplace_businesses_admin_all ON public.marketplace_businesses
  FOR ALL
  USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE POLICY marketplace_categories_public_read ON public.marketplace_menu_categories
  FOR SELECT USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.marketplace_businesses b
      WHERE b.id = marketplace_menu_categories.business_id
        AND b.is_active = TRUE
        AND b.is_published = TRUE
    )
  );

CREATE POLICY marketplace_items_public_read ON public.marketplace_menu_items
  FOR SELECT USING (
    is_available = TRUE
    AND EXISTS (
      SELECT 1 FROM public.marketplace_businesses b
      WHERE b.id = marketplace_menu_items.business_id
        AND b.is_active = TRUE
        AND b.is_published = TRUE
    )
  );

CREATE POLICY marketplace_groups_public_read ON public.marketplace_menu_modifier_groups
  FOR SELECT USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.marketplace_menu_items mi
      JOIN public.marketplace_businesses b ON b.id = mi.business_id
      WHERE mi.id = marketplace_menu_modifier_groups.menu_item_id
        AND mi.is_available = TRUE
        AND b.is_active = TRUE
        AND b.is_published = TRUE
    )
  );

CREATE POLICY marketplace_options_public_read ON public.marketplace_menu_modifier_options
  FOR SELECT USING (
    is_available = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.marketplace_menu_modifier_groups g
      JOIN public.marketplace_menu_items mi ON mi.id = g.menu_item_id
      JOIN public.marketplace_businesses b ON b.id = mi.business_id
      WHERE g.id = marketplace_menu_modifier_options.group_id
        AND g.is_active = TRUE
        AND mi.is_available = TRUE
        AND b.is_active = TRUE
        AND b.is_published = TRUE
    )
  );

CREATE POLICY marketplace_categories_business_all ON public.marketplace_menu_categories
  FOR ALL
  USING (
    public.current_user_role() = 'business'::public.user_role
    AND business_id = private.current_business_id()
  )
  WITH CHECK (
    public.current_user_role() = 'business'::public.user_role
    AND business_id = private.current_business_id()
  );

CREATE POLICY marketplace_items_business_all ON public.marketplace_menu_items
  FOR ALL
  USING (
    public.current_user_role() = 'business'::public.user_role
    AND business_id = private.current_business_id()
  )
  WITH CHECK (
    public.current_user_role() = 'business'::public.user_role
    AND business_id = private.current_business_id()
  );

CREATE POLICY marketplace_groups_business_all ON public.marketplace_menu_modifier_groups
  FOR ALL
  USING (
    public.current_user_role() = 'business'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.marketplace_menu_items mi
      WHERE mi.id = marketplace_menu_modifier_groups.menu_item_id
        AND mi.business_id = private.current_business_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'business'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.marketplace_menu_items mi
      WHERE mi.id = marketplace_menu_modifier_groups.menu_item_id
        AND mi.business_id = private.current_business_id()
    )
  );

CREATE POLICY marketplace_options_business_all ON public.marketplace_menu_modifier_options
  FOR ALL
  USING (
    public.current_user_role() = 'business'::public.user_role
    AND EXISTS (
      SELECT 1
      FROM public.marketplace_menu_modifier_groups g
      JOIN public.marketplace_menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = marketplace_menu_modifier_options.group_id
        AND mi.business_id = private.current_business_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'business'::public.user_role
    AND EXISTS (
      SELECT 1
      FROM public.marketplace_menu_modifier_groups g
      JOIN public.marketplace_menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = marketplace_menu_modifier_options.group_id
        AND mi.business_id = private.current_business_id()
    )
  );

CREATE POLICY marketplace_categories_admin_all ON public.marketplace_menu_categories
  FOR ALL USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);
CREATE POLICY marketplace_items_admin_all ON public.marketplace_menu_items
  FOR ALL USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);
CREATE POLICY marketplace_groups_admin_all ON public.marketplace_menu_modifier_groups
  FOR ALL USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);
CREATE POLICY marketplace_options_admin_all ON public.marketplace_menu_modifier_options
  FOR ALL USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE TRIGGER set_updated_at_marketplace_businesses
  BEFORE UPDATE ON public.marketplace_businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_marketplace_categories
  BEFORE UPDATE ON public.marketplace_menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_marketplace_items
  BEFORE UPDATE ON public.marketplace_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_marketplace_groups
  BEFORE UPDATE ON public.marketplace_menu_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_marketplace_options
  BEFORE UPDATE ON public.marketplace_menu_modifier_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-menu-images',
  'business-menu-images',
  TRUE,
  3 * 1024 * 1024,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY business_menu_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'business-menu-images');

CREATE POLICY business_menu_images_business_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-menu-images'
    AND public.current_user_role() = 'business'::public.user_role
    AND (storage.foldername(name))[1] = 'businesses'
    AND (storage.foldername(name))[2] = private.current_business_id()::TEXT
  );

CREATE POLICY business_menu_images_business_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'business-menu-images'
    AND public.current_user_role() = 'business'::public.user_role
    AND (storage.foldername(name))[1] = 'businesses'
    AND (storage.foldername(name))[2] = private.current_business_id()::TEXT
  );

CREATE POLICY business_menu_images_business_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'business-menu-images'
    AND public.current_user_role() = 'business'::public.user_role
    AND (storage.foldername(name))[1] = 'businesses'
    AND (storage.foldername(name))[2] = private.current_business_id()::TEXT
  );
