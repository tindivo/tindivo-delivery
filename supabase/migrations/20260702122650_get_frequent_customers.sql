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
        ELSE 'dormant'
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
