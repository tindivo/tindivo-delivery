CREATE OR REPLACE FUNCTION public.get_frequent_customer_detail(
  p_restaurant_id uuid,
  p_client_phone text,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  client_phone text,
  client_name text,
  category text,
  order_count bigint,
  total_spent numeric,
  avg_ticket numeric,
  first_order_in_range timestamptz,
  last_order_in_range timestamptz,
  days_since_last_order double precision,
  avg_days_between_orders double precision,
  favorite_day_of_week text,
  favorite_day_count bigint,
  favorite_time_range text,
  favorite_time_range_count bigint,
  restaurant_avg_ticket numeric,
  ticket_vs_restaurant text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_name text;
  v_order_count bigint;
  v_total_spent numeric;
  v_avg_ticket numeric;
  v_first_order timestamptz;
  v_last_order timestamptz;
  v_days_since double precision;
  v_avg_days_between double precision;
  v_category text;
  
  v_fav_day text;
  v_fav_day_count bigint;
  v_fav_time text;
  v_fav_time_count bigint;
  
  v_rest_avg numeric;
  v_ticket_vs_rest text;
BEGIN
  -- 1. Base client stats in range
  SELECT 
    (SELECT o2.client_name FROM public.orders o2 
     WHERE o2.client_phone = p_client_phone AND o2.restaurant_id = p_restaurant_id AND o2.status = 'delivered'
     ORDER BY o2.created_at DESC LIMIT 1),
    COUNT(*),
    COALESCE(SUM(o.order_amount), 0),
    COALESCE(AVG(o.order_amount), 0),
    MIN(o.created_at),
    MAX(o.created_at),
    (EXTRACT(EPOCH FROM (now() - MAX(o.created_at))) / 86400)::double precision,
    CASE 
      WHEN COUNT(*) > 1 THEN (EXTRACT(EPOCH FROM (MAX(o.created_at) - MIN(o.created_at))) / 86400.0 / (COUNT(*) - 1))::double precision
      ELSE NULL
    END
  INTO
    v_client_name,
    v_order_count,
    v_total_spent,
    v_avg_ticket,
    v_first_order,
    v_last_order,
    v_days_since,
    v_avg_days_between
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.client_phone = p_client_phone
    AND o.status = 'delivered'
    AND o.created_at >= p_from
    AND o.created_at < p_to;

  IF v_order_count = 0 THEN
    RETURN;
  END IF;

  -- Categorización
  v_category := CASE
    WHEN v_order_count >= 5 AND v_days_since <= 30 THEN 'vip'
    WHEN v_order_count >= 2 AND v_days_since <= 60 THEN 'active'
    ELSE 'dormant'
  END;

  -- 2. Favorite Day of Week
  WITH day_counts AS (
    SELECT 
      TRIM(LOWER(TO_CHAR(o.created_at AT TIME ZONE 'America/Lima', 'day'))) as dow,
      COUNT(*) as cnt
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND o.client_phone = p_client_phone
      AND o.status = 'delivered'
      AND o.created_at >= p_from
      AND o.created_at < p_to
    GROUP BY 1
    ORDER BY 2 DESC, 1 ASC
    LIMIT 1
  )
  SELECT dow, cnt INTO v_fav_day, v_fav_day_count FROM day_counts;

  -- 3. Favorite Time Range
  -- morning (5-11), noon (11-15), afternoon (15-19), evening (19-23), night (23-5)
  WITH time_ranges AS (
    SELECT 
      CASE 
        WHEN hour >= 5 AND hour < 11 THEN 'morning'
        WHEN hour >= 11 AND hour < 15 THEN 'noon'
        WHEN hour >= 15 AND hour < 19 THEN 'afternoon'
        WHEN hour >= 19 AND hour < 23 THEN 'evening'
        ELSE 'night'
      END as tr,
      COUNT(*) as cnt
    FROM (
      SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'America/Lima') as hour
      FROM public.orders o
      WHERE o.restaurant_id = p_restaurant_id
        AND o.client_phone = p_client_phone
        AND o.status = 'delivered'
        AND o.created_at >= p_from
        AND o.created_at < p_to
    ) h
    GROUP BY 1
    ORDER BY 2 DESC, 1 ASC
    LIMIT 1
  )
  SELECT tr, cnt INTO v_fav_time, v_fav_time_count FROM time_ranges;

  -- 4. Restaurant average ticket in same range
  SELECT COALESCE(AVG(o.order_amount), 0)
  INTO v_rest_avg
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'delivered'
    AND o.created_at >= p_from
    AND o.created_at < p_to;

  -- Compare ticket
  v_ticket_vs_rest := CASE
    WHEN v_avg_ticket > v_rest_avg * 1.15 THEN 'above'
    WHEN v_avg_ticket < v_rest_avg * 0.85 THEN 'below'
    ELSE 'similar'
  END;

  RETURN QUERY SELECT
    p_client_phone,
    v_client_name,
    v_category,
    v_order_count,
    ROUND(v_total_spent, 2),
    ROUND(v_avg_ticket, 2),
    v_first_order,
    v_last_order,
    v_days_since,
    v_avg_days_between,
    v_fav_day,
    v_fav_day_count,
    v_fav_time,
    v_fav_time_count,
    ROUND(v_rest_avg, 2),
    v_ticket_vs_rest;
END;
$$;

-- Permisos explícitos para la función de detalle
REVOKE EXECUTE ON FUNCTION public.get_frequent_customer_detail(uuid, text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_frequent_customer_detail(uuid, text, timestamptz, timestamptz) TO authenticated;
