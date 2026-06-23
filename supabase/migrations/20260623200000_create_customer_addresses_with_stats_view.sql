-- ═══════════════════════════════════════════════════════════════════
-- 20260623200000_create_customer_addresses_with_stats_view.sql
-- ═══════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.customer_addresses_with_stats;

CREATE OR REPLACE VIEW public.customer_addresses_with_stats AS
SELECT 
  ca.phone,
  ca.address_id,
  ca.lat,
  ca.lng,
  ca.reference,
  ca.accuracy_m,
  ca.source,
  ca.is_default,
  ca.last_used_at,
  ca.times_used,
  ca.customer_name,
  ca.created_at,
  ca.updated_at,
  (ca.lat IS NOT NULL) AS has_pin,
  (ca.reference IS NOT NULL AND length(trim(ca.reference)) >= 20) AS has_valid_ref,
  (ca.customer_name IS NOT NULL AND trim(ca.customer_name) <> '') AS has_name,
  (
    ca.lat IS NOT NULL 
    AND ca.reference IS NOT NULL 
    AND length(trim(ca.reference)) >= 5 
    AND ca.customer_name IS NOT NULL 
    AND trim(ca.customer_name) <> ''
  ) AS is_fully_curated
FROM public.customer_addresses ca;

GRANT SELECT ON public.customer_addresses_with_stats TO authenticated;
