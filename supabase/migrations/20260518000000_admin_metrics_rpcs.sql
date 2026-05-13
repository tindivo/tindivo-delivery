-- RPCs de agregación para el dashboard /admin/metricas.
--
-- Todas reciben un rango [p_from, p_to) y devuelven filas tipadas tras
-- regenerar packages/supabase/src/types.gen.ts. Filtran cuentas de test en
-- restaurants y drivers para reflejar solo tráfico de negocio (consistente
-- con apps/api/app/api/v1/admin/daily-summary/route.ts).
--
-- SECURITY INVOKER: heredan el contexto del caller. Las RLS de admin permiten
-- SELECT completo en orders/restaurants/drivers; otros roles obtendrán
-- resultados filtrados (en la práctica el endpoint API valida requireAuth['admin']).
--
-- Hora local: America/Lima (UTC-5, sin DST). Para day/hour/dow se aplica el
-- shift de timezone antes del truncamiento.

-- 1) Serie temporal de ventas/comisión por día (granularidad día Lima)
CREATE OR REPLACE FUNCTION public.admin_sales_timeseries(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  day                 date,
  orders              int,
  delivered           int,
  cancelled           int,
  gmv                 numeric,
  commission          numeric,
  aov                 numeric,
  cash_orders         int,
  yape_orders         int,
  mixed_orders        int,
  prepaid_orders      int,
  marketplace_orders  int,
  restaurant_orders   int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    date_trunc('day', o.created_at AT TIME ZONE 'America/Lima')::date AS day,
    COUNT(*)::int AS orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::int AS delivered,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::int AS cancelled,
    COALESCE(SUM(o.order_amount) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS gmv,
    COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS commission,
    CASE
      WHEN COUNT(*) FILTER (WHERE o.status = 'delivered') > 0 THEN
        ROUND(
          (SUM(o.order_amount) FILTER (WHERE o.status = 'delivered') /
           COUNT(*) FILTER (WHERE o.status = 'delivered'))::numeric,
          2
        )
      ELSE 0::numeric
    END AS aov,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.payment_status = 'pending_cash')::int   AS cash_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.payment_status = 'pending_yape')::int   AS yape_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.payment_status = 'pending_mixed')::int  AS mixed_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.payment_status = 'prepaid')::int        AS prepaid_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.source = 'customer_pwa')::int   AS marketplace_orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered' AND o.source = 'restaurant_pwa')::int AS restaurant_orders
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  LEFT JOIN public.drivers d ON d.id = o.driver_id
  WHERE o.created_at >= p_from
    AND o.created_at <  p_to
    AND r.is_test_account = false
    AND (d.id IS NULL OR d.is_test_account = false)
  GROUP BY 1
  ORDER BY 1 ASC;
$$;

-- 2) Performance por motorizado en el rango
CREATE OR REPLACE FUNCTION public.admin_drivers_performance(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  driver_id                       uuid,
  full_name                       text,
  vehicle_type                    text,
  is_active                       boolean,
  delivered                       int,
  cancelled                       int,
  total_assigned                  int,
  gmv_delivered                   numeric,
  commission_generated            numeric,
  cash_collected                  numeric,
  avg_delivery_minutes            numeric,
  avg_pickup_to_deliver_minutes   numeric,
  rejections_count                int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.id                                                              AS driver_id,
    d.full_name                                                       AS full_name,
    d.vehicle_type::text                                              AS vehicle_type,
    d.is_active                                                       AS is_active,
    COUNT(o.id) FILTER (WHERE o.status = 'delivered')::int            AS delivered,
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::int            AS cancelled,
    COUNT(o.id)::int                                                  AS total_assigned,
    COALESCE(SUM(o.order_amount) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS gmv_delivered,
    COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS commission_generated,
    COALESCE(
      SUM(
        CASE
          WHEN o.payment_status = 'pending_cash'  THEN COALESCE(o.order_amount, 0)
          WHEN o.payment_status = 'pending_mixed' THEN COALESCE(o.cash_amount, 0)
          ELSE 0
        END
      ) FILTER (WHERE o.status = 'delivered'),
      0
    )::numeric AS cash_collected,
    ROUND(
      AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.accepted_at)) / 60) FILTER (
        WHERE o.status = 'delivered' AND o.accepted_at IS NOT NULL
      )::numeric,
      1
    ) AS avg_delivery_minutes,
    ROUND(
      AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at)) / 60) FILTER (
        WHERE o.status = 'delivered' AND o.picked_up_at IS NOT NULL
      )::numeric,
      1
    ) AS avg_pickup_to_deliver_minutes,
    (
      SELECT COUNT(*)::int
      FROM public.order_assignment_rejections r
      WHERE r.driver_id = d.id
        AND r.rejected_at >= p_from
        AND r.rejected_at <  p_to
    ) AS rejections_count
  FROM public.drivers d
  LEFT JOIN public.orders o
    ON o.driver_id = d.id
   AND o.created_at >= p_from
   AND o.created_at <  p_to
  WHERE d.is_test_account = false
  GROUP BY d.id, d.full_name, d.vehicle_type, d.is_active
  ORDER BY delivered DESC, total_assigned DESC;
$$;

-- 3) Performance por restaurante en el rango
CREATE OR REPLACE FUNCTION public.admin_restaurants_performance(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  restaurant_id         uuid,
  name                  text,
  accent_color          text,
  commission_per_order  numeric,
  balance_due           numeric,
  delivered             int,
  cancelled             int,
  total                 int,
  gmv                   numeric,
  commission            numeric,
  aov                   numeric,
  avg_prep_minutes      numeric,
  unique_phones         int,
  repeat_phones         int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH per_phone AS (
    SELECT
      o.restaurant_id,
      COALESCE(o.customer_phone, o.client_phone) AS phone,
      COUNT(*)                                   AS phone_orders
    FROM public.orders o
    WHERE o.created_at >= p_from
      AND o.created_at <  p_to
      AND o.status = 'delivered'
      AND COALESCE(o.customer_phone, o.client_phone) IS NOT NULL
    GROUP BY o.restaurant_id, COALESCE(o.customer_phone, o.client_phone)
  )
  SELECT
    r.id                                AS restaurant_id,
    r.name                              AS name,
    r.accent_color::text                AS accent_color,
    r.commission_per_order              AS commission_per_order,
    r.balance_due                       AS balance_due,
    COUNT(o.id) FILTER (WHERE o.status = 'delivered')::int  AS delivered,
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::int  AS cancelled,
    COUNT(o.id)::int                                        AS total,
    COALESCE(SUM(o.order_amount) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS gmv,
    COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0)::numeric AS commission,
    CASE
      WHEN COUNT(o.id) FILTER (WHERE o.status = 'delivered') > 0 THEN
        ROUND(
          (SUM(o.order_amount) FILTER (WHERE o.status = 'delivered') /
           COUNT(o.id) FILTER (WHERE o.status = 'delivered'))::numeric,
          2
        )
      ELSE 0::numeric
    END AS aov,
    ROUND(AVG(o.prep_minutes) FILTER (WHERE o.status = 'delivered')::numeric, 1) AS avg_prep_minutes,
    COALESCE((SELECT COUNT(*)::int FROM per_phone p WHERE p.restaurant_id = r.id), 0) AS unique_phones,
    COALESCE((SELECT COUNT(*)::int FROM per_phone p WHERE p.restaurant_id = r.id AND p.phone_orders >= 2), 0) AS repeat_phones
  FROM public.restaurants r
  LEFT JOIN public.orders o
    ON o.restaurant_id = r.id
   AND o.created_at >= p_from
   AND o.created_at <  p_to
  WHERE r.is_test_account = false
  GROUP BY r.id, r.name, r.accent_color, r.commission_per_order, r.balance_due
  ORDER BY commission DESC, gmv DESC;
$$;

-- 4) Heatmap día_de_semana (0=domingo) × hora (0-23) en hora Lima
CREATE OR REPLACE FUNCTION public.admin_demand_heatmap(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  dow        smallint,
  hour       smallint,
  orders     int,
  delivered  int,
  cancelled  int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW FROM o.created_at AT TIME ZONE 'America/Lima')::smallint  AS dow,
    EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'America/Lima')::smallint AS hour,
    COUNT(*)::int                                                          AS orders,
    COUNT(*) FILTER (WHERE o.status = 'delivered')::int                    AS delivered,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::int                    AS cancelled
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  LEFT JOIN public.drivers d ON d.id = o.driver_id
  WHERE o.created_at >= p_from
    AND o.created_at <  p_to
    AND r.is_test_account = false
    AND (d.id IS NULL OR d.is_test_account = false)
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- 5) Tiempos del flujo operacional (con percentiles + on-time%)
CREATE OR REPLACE FUNCTION public.admin_operations_funnel(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  total_delivered                int,
  avg_min_to_assign              numeric,
  avg_min_to_accept              numeric,
  avg_min_in_route_to_restaurant numeric,
  avg_min_wait_at_restaurant     numeric,
  avg_min_pickup_to_deliver      numeric,
  avg_min_total                  numeric,
  p50_min_total                  numeric,
  p90_min_total                  numeric,
  p95_min_total                  numeric,
  on_time_count                  int,
  on_time_pct                    numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      o.id,
      EXTRACT(EPOCH FROM (o.assigned_at  - o.created_at))   / 60 AS min_to_assign,
      EXTRACT(EPOCH FROM (o.accepted_at  - o.assigned_at))  / 60 AS min_to_accept,
      EXTRACT(EPOCH FROM (o.waiting_at   - o.heading_at))   / 60 AS min_in_route,
      EXTRACT(EPOCH FROM (o.picked_up_at - o.waiting_at))   / 60 AS min_wait,
      EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at)) / 60 AS min_pickup_deliver,
      EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))   / 60 AS min_total,
      CASE
        WHEN o.estimated_ready_at IS NOT NULL
         AND o.delivered_at <= o.estimated_ready_at + interval '15 minutes'
        THEN 1
        ELSE 0
      END AS on_time
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    LEFT JOIN public.drivers d ON d.id = o.driver_id
    WHERE o.status = 'delivered'
      AND o.delivered_at >= p_from
      AND o.delivered_at <  p_to
      AND r.is_test_account = false
      AND (d.id IS NULL OR d.is_test_account = false)
  )
  SELECT
    COUNT(*)::int,
    ROUND(AVG(min_to_assign)::numeric,      1),
    ROUND(AVG(min_to_accept)::numeric,      1),
    ROUND(AVG(min_in_route)::numeric,       1),
    ROUND(AVG(min_wait)::numeric,           1),
    ROUND(AVG(min_pickup_deliver)::numeric, 1),
    ROUND(AVG(min_total)::numeric,          1),
    ROUND(PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY min_total)::numeric, 1),
    ROUND(PERCENTILE_CONT(0.9)  WITHIN GROUP (ORDER BY min_total)::numeric, 1),
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY min_total)::numeric, 1),
    COALESCE(SUM(on_time), 0)::int,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(on_time), 0)::numeric / COUNT(*)) * 100, 1)
      ELSE NULL
    END
  FROM base;
$$;

-- 6) Motivos de cancelación agrupados
CREATE OR REPLACE FUNCTION public.admin_cancellation_reasons(
  p_from timestamptz,
  p_to   timestamptz
)
RETURNS TABLE (
  cancel_reason_code  text,
  count               int,
  avg_amount_lost     numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(o.cancel_reason_code, ''), 'unspecified') AS cancel_reason_code,
    COUNT(*)::int                                              AS count,
    ROUND(AVG(o.order_amount)::numeric, 2)                     AS avg_amount_lost
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  LEFT JOIN public.drivers d ON d.id = o.driver_id
  WHERE o.status = 'cancelled'
    AND o.cancelled_at >= p_from
    AND o.cancelled_at <  p_to
    AND r.is_test_account = false
    AND (d.id IS NULL OR d.is_test_account = false)
  GROUP BY 1
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_sales_timeseries(timestamptz, timestamptz)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_drivers_performance(timestamptz, timestamptz)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restaurants_performance(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_demand_heatmap(timestamptz, timestamptz)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_operations_funnel(timestamptz, timestamptz)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancellation_reasons(timestamptz, timestamptz)    TO authenticated;
