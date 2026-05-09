-- RPC list_team_orders: lista pedidos activos de OTROS drivers en restaurantes
-- que el driver autenticado atiende. Usada por GET /api/v1/driver/team/orders.
--
-- Incluye:
--   - waiting_driver con driver_id != self (pre-asignados a otros)
--   - heading_to_restaurant, waiting_at_restaurant, picked_up
--
-- Excluye:
--   - delivered, cancelled (terminales)
--   - waiting_driver SIN driver_id (esos van en pestaña "En espera")
--   - los del propio driver (esos van en "Mis pedidos")
--
-- El endpoint enriquece el resultado con embeds de restaurants y drivers
-- haciendo un SELECT por los IDs devueltos.

create or replace function public.list_team_orders(p_driver_id uuid)
returns setof public.orders
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.*
  from public.orders o
  join public.driver_restaurants dr on dr.restaurant_id = o.restaurant_id
  where dr.driver_id = p_driver_id
    and o.status in (
      'waiting_driver',
      'heading_to_restaurant',
      'waiting_at_restaurant',
      'picked_up'
    )
    and o.driver_id is not null     -- solo asignados (sin pre-asignación = "En espera")
    and o.driver_id != p_driver_id  -- solo de OTROS drivers
  order by o.created_at desc
$$;

comment on function public.list_team_orders(uuid) is
  'Pedidos activos de OTROS drivers en restaurantes que p_driver_id atiende. Incluye pre-asignados (waiting_driver con driver_id) + activos (heading/waiting_at/picked_up). Usada por la pestaña Equipo.';
