-- ═══════════════════════════════════════════════════════════════════
-- 20260623_123200 — Agenda de direcciones de clientes e instrumentación
-- ═══════════════════════════════════════════════════════════════════

-- 1. Crear tablas
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  phone text NOT NULL CHECK (phone ~ '^9\d{8}$'),
  address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  lat double precision,
  lng double precision,
  reference text,
  accuracy_m double precision,
  source text NOT NULL CHECK (source IN ('driver_verified', 'admin_curated', 'backfill')),
  is_default boolean NOT NULL DEFAULT false,
  last_used_at timestamp with time zone,
  times_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (phone, address_id)
);

CREATE TABLE IF NOT EXISTS public.address_capture_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  driver_id uuid REFERENCES public.drivers(id),
  phone text,
  action text NOT NULL CHECK (action IN (
    'shown', 'confirmed', 'dragged', 'omitted', 
    'navigate_clicked', 'admin_captured', 'admin_edited'
  )),
  accuracy_reported double precision,
  distance_dragged_m double precision,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT address_capture_events_pkey PRIMARY KEY (id)
);

-- 2. Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_default_unique 
  ON public.customer_addresses (phone) 
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS customer_addresses_phone_idx ON public.customer_addresses (phone);

CREATE INDEX IF NOT EXISTS address_capture_events_phone_idx ON public.address_capture_events (phone);
CREATE INDEX IF NOT EXISTS address_capture_events_created_at_idx ON public.address_capture_events (created_at DESC);

-- 3. Crear trigger para updated_at en customer_addresses
CREATE OR REPLACE FUNCTION public.update_customer_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_addresses_updated_at();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_capture_events ENABLE ROW LEVEL SECURITY;

-- 5. Crear RLS Policies para customer_addresses
DROP POLICY IF EXISTS customer_addresses_select ON public.customer_addresses;
CREATE POLICY customer_addresses_select ON public.customer_addresses
  FOR SELECT
  USING (
    'admin' = ANY(public.current_user_roles())
    OR 'restaurant' = ANY(public.current_user_roles())
    OR 'driver' = ANY(public.current_user_roles())
  );

DROP POLICY IF EXISTS customer_addresses_insert ON public.customer_addresses;
CREATE POLICY customer_addresses_insert ON public.customer_addresses
  FOR INSERT
  WITH CHECK (
    'admin' = ANY(public.current_user_roles())
    OR 'driver' = ANY(public.current_user_roles())
  );

DROP POLICY IF EXISTS customer_addresses_update ON public.customer_addresses;
CREATE POLICY customer_addresses_update ON public.customer_addresses
  FOR UPDATE
  USING (
    'admin' = ANY(public.current_user_roles())
    OR 'driver' = ANY(public.current_user_roles())
  )
  WITH CHECK (
    'admin' = ANY(public.current_user_roles())
    OR 'driver' = ANY(public.current_user_roles())
  );

DROP POLICY IF EXISTS customer_addresses_delete ON public.customer_addresses;
CREATE POLICY customer_addresses_delete ON public.customer_addresses
  FOR DELETE
  USING ('admin' = ANY(public.current_user_roles()));

-- 6. Crear RLS Policies para address_capture_events
DROP POLICY IF EXISTS address_capture_events_insert ON public.address_capture_events;
CREATE POLICY address_capture_events_insert ON public.address_capture_events
  FOR INSERT
  WITH CHECK (
    'admin' = ANY(public.current_user_roles())
    OR 'restaurant' = ANY(public.current_user_roles())
    OR 'driver' = ANY(public.current_user_roles())
  );

DROP POLICY IF EXISTS address_capture_events_select ON public.address_capture_events;
CREATE POLICY address_capture_events_select ON public.address_capture_events
  FOR SELECT
  USING ('admin' = ANY(public.current_user_roles()));

-- 7. Ejecutar backfill de datos históricos (seed)
WITH base AS (
  SELECT 
    COALESCE(client_phone, customer_phone) AS phone,
    delivery_reference AS reference,
    delivered_at,
    length(trim(delivery_reference)) AS ref_length
  FROM public.orders
  WHERE COALESCE(client_phone, customer_phone) IS NOT NULL
    AND COALESCE(client_phone, customer_phone) ~ '^9\d{8}$'
    AND COALESCE(client_phone, customer_phone) NOT IN (
      '999999999', '987654321', '912345678', '955555555', 
      '900000000', '911111111', '923456789'
    )
    AND delivered_at IS NOT NULL
    AND delivered_at >= NOW() - INTERVAL '60 days'
    AND delivery_reference IS NOT NULL
    AND length(trim(delivery_reference)) >= 10
    AND lower(trim(delivery_reference)) NOT IN (
      'hola', 'ubicación, tiempo real', 'ubicacion, tiempo real',
      'prueba', 'test', 'xxx', 'sin direccion', 'sin dirección'
    )
),
best_per_phone AS (
  SELECT DISTINCT ON (phone)
    phone,
    reference,
    delivered_at
  FROM (
    SELECT 
      phone, 
      reference, 
      delivered_at, 
      ref_length,
      ROW_NUMBER() OVER (PARTITION BY phone ORDER BY delivered_at DESC) AS recency_rank
    FROM base
  ) ranked
  WHERE recency_rank <= 3
  ORDER BY phone, ref_length DESC, delivered_at DESC
),
phone_stats AS (
  SELECT 
    COALESCE(client_phone, customer_phone) AS phone,
    COUNT(*) AS times_used,
    MAX(delivered_at) AS last_used_at
  FROM public.orders
  WHERE COALESCE(client_phone, customer_phone) IS NOT NULL
    AND delivered_at IS NOT NULL
    AND delivered_at >= NOW() - INTERVAL '60 days'
  GROUP BY COALESCE(client_phone, customer_phone)
)
INSERT INTO public.customer_addresses (
  phone, lat, lng, reference, accuracy_m, source, 
  is_default, last_used_at, times_used
)
SELECT 
  b.phone,
  NULL AS lat,
  NULL AS lng,
  b.reference,
  NULL AS accuracy_m,
  'backfill' AS source,
  true AS is_default,
  s.last_used_at,
  s.times_used
FROM best_per_phone b
JOIN phone_stats s ON s.phone = b.phone
ON CONFLICT (phone, address_id) DO NOTHING;
