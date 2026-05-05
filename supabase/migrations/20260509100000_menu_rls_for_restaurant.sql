-- RLS: el restaurante puede gestionar SU propio catálogo (categorías, items,
-- modificadores y opciones). El cliente público mantiene su SELECT con
-- is_active=true ya definido en la migration original 20260504120000.
--
-- Patron: restaurant_id = current_restaurant_id() para todas las tablas
-- relacionadas. Para menu_modifier_groups y menu_modifier_options la
-- relación con el restaurant es vía menu_items (FK menu_item_id).

-- ─────────────────────────────────────────────────────────────────────────
-- menu_categories
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS menu_categories_restaurant_all ON public.menu_categories;
CREATE POLICY menu_categories_restaurant_all ON public.menu_categories
  FOR ALL
  USING (
    public.current_user_role() = 'restaurant'::public.user_role
    AND restaurant_id = public.current_restaurant_id()
  )
  WITH CHECK (
    public.current_user_role() = 'restaurant'::public.user_role
    AND restaurant_id = public.current_restaurant_id()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- menu_items
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS menu_items_restaurant_all ON public.menu_items;
CREATE POLICY menu_items_restaurant_all ON public.menu_items
  FOR ALL
  USING (
    public.current_user_role() = 'restaurant'::public.user_role
    AND restaurant_id = public.current_restaurant_id()
  )
  WITH CHECK (
    public.current_user_role() = 'restaurant'::public.user_role
    AND restaurant_id = public.current_restaurant_id()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- menu_modifier_groups (FK a menu_items.id; menu_items tiene restaurant_id)
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS menu_modifier_groups_restaurant_all ON public.menu_modifier_groups;
CREATE POLICY menu_modifier_groups_restaurant_all ON public.menu_modifier_groups
  FOR ALL
  USING (
    public.current_user_role() = 'restaurant'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_modifier_groups.menu_item_id
        AND mi.restaurant_id = public.current_restaurant_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'restaurant'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_modifier_groups.menu_item_id
        AND mi.restaurant_id = public.current_restaurant_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- menu_modifier_options (FK a menu_modifier_groups.id)
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS menu_modifier_options_restaurant_all ON public.menu_modifier_options;
CREATE POLICY menu_modifier_options_restaurant_all ON public.menu_modifier_options
  FOR ALL
  USING (
    public.current_user_role() = 'restaurant'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.menu_modifier_groups g
      JOIN public.menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = menu_modifier_options.group_id
        AND mi.restaurant_id = public.current_restaurant_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'restaurant'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.menu_modifier_groups g
      JOIN public.menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = menu_modifier_options.group_id
        AND mi.restaurant_id = public.current_restaurant_id()
    )
  );
