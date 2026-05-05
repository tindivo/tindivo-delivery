-- Tabla customer_profiles: perfil del cliente final que se registra en
-- tindivo.com. Guarda nombre, teléfono, dirección y ubicación por defecto
-- para precargar el checkout en futuros pedidos. Vinculada 1:1 con
-- public.users vía user_id (cascade delete cuando se elimina la cuenta).
--
-- El rol 'customer' (enum user_role) ya fue añadido en
-- 20260508000000_customer_role_enum.sql; esta migration solo añade datos
-- y RLS por separado para evitar el error "new enum value not committed".

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id                     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name                   TEXT NOT NULL,
  phone                       TEXT,
  default_address             TEXT,
  default_reference           TEXT,
  default_coordinates         GEOGRAPHY(point, 4326),
  default_location_accuracy_m DOUBLE PRECISION,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(full_name) BETWEEN 2 AND 80),
  CHECK (phone IS NULL OR phone ~ '^9\d{8}$')
);

COMMENT ON TABLE public.customer_profiles IS
  'Perfil del cliente final registrado en tindivo.com. Datos precargados al checkout.';

-- Updated_at automático
CREATE OR REPLACE FUNCTION public.set_customer_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_customer_profiles_updated_at();

-- RLS
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_profiles_self_read ON public.customer_profiles;
CREATE POLICY customer_profiles_self_read ON public.customer_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_self_insert ON public.customer_profiles;
CREATE POLICY customer_profiles_self_insert ON public.customer_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_self_update ON public.customer_profiles;
CREATE POLICY customer_profiles_self_update ON public.customer_profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_admin_all ON public.customer_profiles;
CREATE POLICY customer_profiles_admin_all ON public.customer_profiles
  FOR ALL USING (public.current_user_role() = 'admin'::public.user_role)
  WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

-- Helper SQL: id del usuario customer autenticado o NULL
CREATE OR REPLACE FUNCTION public.current_customer_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.users
  WHERE id = auth.uid() AND role = 'customer'::public.user_role AND is_active = true;
$$;

-- Vincular orders al user customer (NULL para invitados — flujo actual)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_user
  ON public.orders(customer_user_id)
  WHERE customer_user_id IS NOT NULL;

COMMENT ON COLUMN public.orders.customer_user_id IS
  'Usuario customer (rol=customer) que hizo este pedido. NULL para pedidos de invitado o de restaurant_pwa.';

-- RLS extra: customer puede leer sus propios pedidos
DROP POLICY IF EXISTS orders_customer_self_read ON public.orders;
CREATE POLICY orders_customer_self_read ON public.orders
  FOR SELECT USING (customer_user_id = auth.uid());
