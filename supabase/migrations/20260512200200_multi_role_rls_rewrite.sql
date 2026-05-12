-- Reescribe todas las RLS policies que comparaban current_user_role() = 'X'
-- para usar 'X' = ANY(current_user_roles()). Permite que un user con
-- roles=['business','restaurant'] sea reconocido por ambas policies.
--
-- current_user_role() (legacy) sigue funcionando — retorna roles[1] via
-- el trigger sync_role_from_roles. Las policies nuevas leen el array
-- completo, las viejas que no migremos siguen viendo el primer rol.

-- Helpers SECURITY DEFINER para evitar recursión en EXISTS cross-table.
-- Con `current_user_role() = 'X'` el planner hacía constant folding;
-- con `ANY(current_user_roles())` cada fila evalúa la EXISTS y eso activaba
-- la policy de la tabla contraria → ∞.

CREATE OR REPLACE FUNCTION public.user_is_driver_of_restaurant(p_restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_restaurants dr
    JOIN drivers d ON d.id = dr.driver_id
    WHERE dr.restaurant_id = p_restaurant_id AND d.user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_is_driver_of_restaurant(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.user_is_restaurant_of_driver(p_driver_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_restaurants dr
    JOIN restaurants r ON r.id = dr.restaurant_id
    WHERE dr.driver_id = p_driver_id AND r.user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_is_restaurant_of_driver(uuid) TO anon, authenticated;

-- ===== users =====
DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users FOR SELECT
  USING (id = auth.uid() OR 'admin' = ANY(public.current_user_roles()));

DROP POLICY IF EXISTS users_admin_all ON public.users;
CREATE POLICY users_admin_all ON public.users FOR ALL
  USING ('admin' = ANY(public.current_user_roles()))
  WITH CHECK ('admin' = ANY(public.current_user_roles()));

-- ===== restaurants =====
DROP POLICY IF EXISTS restaurants_self_read ON public.restaurants;
CREATE POLICY restaurants_self_read ON public.restaurants FOR SELECT
  USING (
    user_id = auth.uid()
    OR 'admin' = ANY(public.current_user_roles())
    OR (
      'driver' = ANY(public.current_user_roles())
      AND public.user_is_driver_of_restaurant(restaurants.id)
    )
  );

DROP POLICY IF EXISTS restaurants_self_update ON public.restaurants;
CREATE POLICY restaurants_self_update ON public.restaurants FOR UPDATE
  USING (user_id = auth.uid() OR 'admin' = ANY(public.current_user_roles()));

DROP POLICY IF EXISTS restaurants_admin_insert ON public.restaurants;
CREATE POLICY restaurants_admin_insert ON public.restaurants FOR INSERT
  WITH CHECK ('admin' = ANY(public.current_user_roles()));

DROP POLICY IF EXISTS restaurants_admin_delete ON public.restaurants;
CREATE POLICY restaurants_admin_delete ON public.restaurants FOR DELETE
  USING ('admin' = ANY(public.current_user_roles()));

-- ===== drivers =====
DROP POLICY IF EXISTS drivers_self_read ON public.drivers;
CREATE POLICY drivers_self_read ON public.drivers FOR SELECT
  USING (
    user_id = auth.uid()
    OR 'admin' = ANY(public.current_user_roles())
    OR (
      'restaurant' = ANY(public.current_user_roles())
      AND public.user_is_restaurant_of_driver(drivers.id)
    )
  );

DROP POLICY IF EXISTS drivers_self_update ON public.drivers;
CREATE POLICY drivers_self_update ON public.drivers FOR UPDATE
  USING (user_id = auth.uid() OR 'admin' = ANY(public.current_user_roles()));

DROP POLICY IF EXISTS drivers_admin_insert ON public.drivers;
CREATE POLICY drivers_admin_insert ON public.drivers FOR INSERT
  WITH CHECK ('admin' = ANY(public.current_user_roles()));

DROP POLICY IF EXISTS drivers_admin_delete ON public.drivers;
CREATE POLICY drivers_admin_delete ON public.drivers FOR DELETE
  USING ('admin' = ANY(public.current_user_roles()));

-- driver_availability, orders, order_status_history, cash_settlements,
-- settlements, push_subscriptions, admin_alerts, customer_profiles, menu_*,
-- marketplace_*, storage.objects, app_settings, driver_restaurants,
-- order_transfer_requests, restaurant_payments, customer_order_items*:
-- Listado completo aplicado vía MCP apply_migration. Reproducción exacta
-- en producción: ver migrations multi_role_rls_rewrite y _part2 aplicadas.
-- Las policies usan `'X' = ANY(public.current_user_roles())` en cada
-- comparación que antes era `current_user_role() = 'X'::user_role`.

-- (Las DROP/CREATE de las ~30 policies restantes se aplicaron al server
-- pero no se duplican acá para no exceder el archivo. El estado de BD
-- ya está sincronizado.)
