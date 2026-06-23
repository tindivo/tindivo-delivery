-- ═══════════════════════════════════════════════════════════════════
-- 20260623191500_add_customer_name_to_customer_addresses.sql
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.customer_addresses 
  ADD COLUMN IF NOT EXISTS customer_name text;

-- Backfill de nombres históricos a partir de pedidos de los últimos 60 días
WITH base AS (
  SELECT 
    COALESCE(client_phone, customer_phone) AS phone,
    client_name,
    delivered_at
  FROM public.orders
  WHERE COALESCE(client_phone, customer_phone) IS NOT NULL
    AND COALESCE(client_phone, customer_phone) ~ '^9\d{8}$'
    AND delivered_at IS NOT NULL
    AND delivered_at >= NOW() - INTERVAL '60 days'
    AND client_name IS NOT NULL
    AND length(trim(client_name)) >= 3
),
latest_name_per_phone AS (
  SELECT DISTINCT ON (phone)
    phone,
    trim(client_name) AS customer_name
  FROM base
  ORDER BY phone, delivered_at DESC
)
UPDATE public.customer_addresses ca
SET customer_name = l.customer_name, updated_at = now()
FROM latest_name_per_phone l
WHERE ca.phone = l.phone AND ca.is_default = true;
