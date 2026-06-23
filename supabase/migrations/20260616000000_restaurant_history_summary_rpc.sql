-- ═══════════════════════════════════════════════════════════════════
-- 20260616_000000 — RPC: resumen del historial del restaurante
-- ═══════════════════════════════════════════════════════════════════
-- Devuelve, para un rango [p_from, p_to), el número de pedidos entregados y
-- la comisión total (suma de delivery_fee) que el restaurante debe a Tindivo.
-- El SUM se hace en SQL ⇒ es exacto a cualquier escala (no depende del tope
-- de filas que PostgREST devuelve al cliente). Lo consume
-- GET /api/v1/restaurant/history para el card de resumen del periodo.
--
-- security invoker: la función corre con el rol del llamante (JWT del
-- restaurante), por lo que RLS sobre `orders` ya restringe a sus pedidos.
-- Filtramos además por p_restaurant_id como defensa en profundidad.

create or replace function public.get_restaurant_history_summary(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to   timestamptz
) returns table (delivered_count integer, total_commission numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where status = 'delivered')::int as delivered_count,
    coalesce(sum(delivery_fee) filter (where status = 'delivered'), 0) as total_commission
  from public.orders
  where restaurant_id = p_restaurant_id
    and status in ('delivered', 'cancelled')
    and created_at >= p_from
    and created_at <  p_to;
$$;

grant execute on function public.get_restaurant_history_summary(uuid, timestamptz, timestamptz)
  to authenticated;
