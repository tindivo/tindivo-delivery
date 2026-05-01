-- ═══════════════════════════════════════════════════════════════════
-- 20260430_000 — Añadir delivery_reference a orders
-- ═══════════════════════════════════════════════════════════════════
--
-- Texto libre que el driver puede escribir en lugar de (o además de)
-- marcar el pin en el mapa interactivo cuando captura los datos del
-- cliente durante waiting_at_restaurant. Resuelve el caso real de drivers
-- que se estresan y se confunden tratando de ubicar la dirección exacta
-- en el mapa con tiempo en contra: ahora pueden simplemente escribir
-- "Av. Paseo de la República 3500, dpto 502, a una cuadra del metro".
--
-- Regla de negocio (validada en el dominio, no aquí): al guardar
-- customer-data, debe haber al menos uno entre delivery_coordinates y
-- delivery_reference. Phone sigue siendo obligatorio aparte.

ALTER TABLE public.orders
  ADD COLUMN delivery_reference text
  CHECK (delivery_reference IS NULL OR char_length(delivery_reference) <= 500);

COMMENT ON COLUMN public.orders.delivery_reference IS
  'Referencia textual escrita por el driver para ubicar el destino cuando '
  'no logra (o no quiere) marcar las coords en el mapa. Max 500 chars. '
  'Al menos uno entre delivery_coordinates y delivery_reference debe estar '
  'presente al guardar customer-data (validado en el agregado Order).';
