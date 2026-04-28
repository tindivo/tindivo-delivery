-- ═══════════════════════════════════════════════════════════════════
-- 20260428_001 — Añadir client_name a orders
-- ═══════════════════════════════════════════════════════════════════
--
-- Captura el nombre del cliente al crear el pedido (form del restaurante).
-- Reemplaza el `#shortId` como label principal en cards. Nullable para
-- pedidos legacy y para el caso en que el restaurante decida no ingresarlo
-- (campo opcional en el form).

ALTER TABLE public.orders ADD COLUMN client_name text;

COMMENT ON COLUMN public.orders.client_name IS
  'Nombre del cliente capturado opcionalmente por el restaurante al crear el pedido. '
  'Nullable para compatibilidad con pedidos legacy y casos donde no se ingresó.';
