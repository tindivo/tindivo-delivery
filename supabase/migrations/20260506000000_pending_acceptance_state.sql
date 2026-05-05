-- Nuevo estado pending_acceptance para pedidos creados desde la PWA cliente
-- (source='customer_pwa') que necesitan que el restaurante acepte y defina
-- el prep_time real antes de pasar al flujo normal de asignación.
--
-- Pedidos restaurant_pwa NO pasan por este estado: el restaurante ya eligió
-- el prep_time al crear desde su propio form.
--
-- Flujo nuevo (solo customer_pwa):
--   created → pending_acceptance → waiting_driver → heading_to_restaurant → ...
--
-- Flujo existente (restaurant_pwa, sin cambios):
--   created → waiting_driver → heading_to_restaurant → ...

-- 1) Añadir nuevo valor al enum (debe ir antes de los demás para que el
--    orden alfabético/sort no interfiera con triggers que ordenan por status)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_acceptance' BEFORE 'waiting_driver';

-- 2) Columnas de auditoría de la aceptación
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pending_acceptance_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restaurant_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restaurant_accepted_prep_minutes INTEGER;

COMMENT ON COLUMN public.orders.pending_acceptance_at IS
  'Timestamp en que el pedido entró en pending_acceptance. Usado por el cron auto-cancel para identificar pedidos huérfanos > 5 min.';
COMMENT ON COLUMN public.orders.restaurant_accepted_at IS
  'Cuándo el restaurante hizo click "Aceptar pedido". NULL si fue creado vía restaurant_pwa (no requiere aceptación).';
COMMENT ON COLUMN public.orders.restaurant_accepted_prep_minutes IS
  'Prep_minutes que el restaurante eligió al aceptar. Puede diferir del prep_time estimado al crear (max(items.prep_minutes)).';

-- 3) Índice parcial para el cron auto-cancel (eficiente porque solo cubre
--    pedidos en pending_acceptance, que son siempre pocos a la vez).
CREATE INDEX IF NOT EXISTS idx_orders_pending_acceptance
  ON public.orders(pending_acceptance_at)
  WHERE status = 'pending_acceptance';
