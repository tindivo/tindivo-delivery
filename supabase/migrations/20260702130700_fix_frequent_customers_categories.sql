CREATE OR REPLACE FUNCTION public.get_frequent_customers(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_min_orders integer,
  p_include_suspicious boolean,
  p_search text,
  p_sort_by text,
  p_sort_dir text,
  p_limit integer,
  p_offset integer
)
RETURNS TABLE (
  client_phone text,
  client_name text,
  order_count bigint,
  total_spent numeric,
  avg_ticket numeric,
  first_order_in_range timestamptz,
  last_order_in_range timestamptz,
  days_since_last_order double precision,
  category text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT o.client_phone, o.client_name, o.order_amount, o.created_at
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND o.status = 'delivered'
      AND o.client_phone IS NOT NULL
      AND o.created_at >= p_from
      AND o.created_at < p_to
      AND (
        p_include_suspicious = true
        OR (
          length(o.client_phone) = 9
          AND o.client_phone !~ '^(\d)\1{8}$'
          AND o.client_phone NOT IN ('987654321', '123456789', '912345678')
        )
      )
      AND (
        p_search IS NULL OR p_search = ''
        OR o.client_phone ILIKE '%' || p_search || '%'
        OR o.client_name ILIKE '%' || p_search || '%'
      )
  ),
  aggregated AS (
    SELECT 
      fo.client_phone as agg_phone,
      (SELECT fo2.client_name FROM filtered_orders fo2 
       WHERE fo2.client_phone = fo.client_phone 
       ORDER BY fo2.created_at DESC LIMIT 1) as agg_name,
      COUNT(*) as agg_order_count,
      SUM(fo.order_amount) as agg_total_spent,
      ROUND(AVG(fo.order_amount), 2) as agg_avg_ticket,
      MIN(fo.created_at) as agg_first_order,
      MAX(fo.created_at) as agg_last_order,
      (EXTRACT(EPOCH FROM (now() - MAX(fo.created_at))) / 86400)::double precision as agg_days_since
    FROM filtered_orders fo
    GROUP BY fo.client_phone
    HAVING COUNT(*) >= p_min_orders
  ),
  categorized AS (
    SELECT 
      agg_phone,
      agg_name,
      agg_order_count,
      agg_total_spent,
      agg_avg_ticket,
      agg_first_order,
      agg_last_order,
      agg_days_since,
      CASE
        WHEN agg_order_count >= 5 AND agg_days_since <= 30 THEN 'vip'
        WHEN agg_order_count >= 2 AND agg_days_since <= 60 THEN 'active'
        WHEN agg_order_count >= 2 AND agg_days_since > 60 THEN 'dormant'
        ELSE NULL
      END as agg_category
    FROM aggregated
  ),
  sorted AS (
    SELECT *,
      COUNT(*) OVER() as full_count
    FROM categorized
    ORDER BY
      CASE WHEN p_sort_dir = 'asc' THEN
        CASE 
          WHEN p_sort_by = 'order_count' THEN agg_order_count::numeric
          WHEN p_sort_by = 'total_spent' THEN agg_total_spent
          WHEN p_sort_by = 'last_order' THEN EXTRACT(EPOCH FROM agg_last_order)::numeric
          ELSE agg_order_count::numeric
        END
      END ASC,
      CASE WHEN p_sort_dir = 'desc' THEN
        CASE 
          WHEN p_sort_by = 'order_count' THEN agg_order_count::numeric
          WHEN p_sort_by = 'total_spent' THEN agg_total_spent
          WHEN p_sort_by = 'last_order' THEN EXTRACT(EPOCH FROM agg_last_order)::numeric
          ELSE agg_order_count::numeric
        END
      END DESC,
      agg_phone ASC
  )
  SELECT 
    s.agg_phone::text,
    s.agg_name::text,
    s.agg_order_count,
    s.agg_total_spent,
    s.agg_avg_ticket,
    s.agg_first_order,
    s.agg_last_order,
    s.agg_days_since,
    s.agg_category::text,
    s.full_count
  FROM sorted s
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Permisos explícitos para la función
REVOKE EXECUTE ON FUNCTION public.get_frequent_customers(uuid, timestamptz, timestamptz, integer, boolean, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_frequent_customers(uuid, timestamptz, timestamptz, integer, boolean, text, text, text, integer, integer) TO authenticated;


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
    WHEN v_order_count >= 2 AND v_days_since > 60 THEN 'dormant'
    ELSE NULL
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
