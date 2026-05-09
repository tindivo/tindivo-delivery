-- RPC list_available_for_driver: lista pedidos disponibles ordenados con
-- urgentes primero, filtrados por driver_restaurants del driver autenticado.
--
-- Reemplaza la query directa de /api/v1/driver/orders/available que hoy:
--   - NO filtra por driver_restaurants (cualquier driver ve TODOS los pedidos)
--   - Ordena solo por estimated_ready_at (no prioriza urgentes)
--
-- El orden es: urgentes primero (FIFO por urgent_since), luego no-urgentes
-- (FIFO por estimated_ready_at). El frontend recibe `urgent_since` para
-- mostrar badge "Urgente" rojo + glow en los primeros.
--
-- IMPORTANTE: NO filtra por order_assignment_rejections del driver. Los
-- pedidos urgentes son first-come-first-served puros — el driver que los
-- rechazó SÍ puede tomarlos después si cambia de opinión.

create or replace function public.list_available_for_driver(p_driver_id uuid)
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
    and o.status = 'waiting_driver'
    and o.driver_id is null
  order by
    (o.urgent_since is null) asc,  -- false (urgentes) primero
    o.urgent_since asc nulls last,  -- urgentes ordenados FIFO
    o.estimated_ready_at asc        -- no-urgentes por ready_at
$$;

comment on function public.list_available_for_driver(uuid) is
  'Lista pedidos disponibles para un driver: filtra por driver_restaurants y ordena urgentes primero (FIFO por urgent_since) y luego no-urgentes (FIFO por estimated_ready_at). Usado por GET /api/v1/driver/orders/available.';
