-- Despues de la unificacion, los negocios SON restaurants (con flags),
-- pero sus dueños pueden tener solo el rol 'business' (sin 'restaurant').
-- Las RLS de menu_* solo aceptaban 'restaurant' como rol con acceso de
-- escritura sobre su propio restaurant. Extender para aceptar 'business'
-- tambien, manteniendo el mismo filtro por current_restaurant_id().

-- menu_categories
DROP POLICY IF EXISTS menu_categories_restaurant_all ON public.menu_categories;
CREATE POLICY menu_categories_restaurant_all ON public.menu_categories
  FOR ALL
  USING (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND restaurant_id = current_restaurant_id()
  )
  WITH CHECK (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND restaurant_id = current_restaurant_id()
  );

-- menu_items
DROP POLICY IF EXISTS menu_items_restaurant_all ON public.menu_items;
CREATE POLICY menu_items_restaurant_all ON public.menu_items
  FOR ALL
  USING (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND restaurant_id = current_restaurant_id()
  )
  WITH CHECK (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND restaurant_id = current_restaurant_id()
  );

-- menu_modifier_groups
DROP POLICY IF EXISTS menu_modifier_groups_restaurant_all ON public.menu_modifier_groups;
CREATE POLICY menu_modifier_groups_restaurant_all ON public.menu_modifier_groups
  FOR ALL
  USING (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_modifier_groups.menu_item_id
        AND mi.restaurant_id = current_restaurant_id()
    )
  )
  WITH CHECK (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_modifier_groups.menu_item_id
        AND mi.restaurant_id = current_restaurant_id()
    )
  );

-- menu_modifier_options
DROP POLICY IF EXISTS menu_modifier_options_restaurant_all ON public.menu_modifier_options;
CREATE POLICY menu_modifier_options_restaurant_all ON public.menu_modifier_options
  FOR ALL
  USING (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND EXISTS (
      SELECT 1 FROM public.menu_modifier_groups g
      JOIN public.menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = menu_modifier_options.group_id
        AND mi.restaurant_id = current_restaurant_id()
    )
  )
  WITH CHECK (
    (('restaurant'::text = ANY (current_user_roles())) OR ('business'::text = ANY (current_user_roles())))
    AND EXISTS (
      SELECT 1 FROM public.menu_modifier_groups g
      JOIN public.menu_items mi ON mi.id = g.menu_item_id
      WHERE g.id = menu_modifier_options.group_id
        AND mi.restaurant_id = current_restaurant_id()
    )
  );
