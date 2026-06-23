-- Reduce delivery_distance_band from {near,medium,far} to {near,far}.
-- Backfills medium -> far (decisión conservadora para Tindivo),
-- y siembra app_settings.delivery_distance_commissions con los montos
-- por banda. La comisión por pedido ahora se determina al pickup según
-- la banda declarada por el motorizado, reemplazando el valor fijo de
-- restaurants.commission_per_order.

-- 1) Backfill: pedidos 'medium' pasan a 'far'.
update public.orders
  set delivery_distance_band = 'far'
  where delivery_distance_band = 'medium';

-- 2) Renombrar enum viejo (Postgres no permite remover valores in-place).
alter type public.delivery_distance_band rename to delivery_distance_band_old;

-- 3) Crear enum nuevo con 2 opciones.
create type public.delivery_distance_band as enum ('near', 'far');

-- 4) Migrar la columna al nuevo tipo (cast via text).
alter table public.orders
  alter column delivery_distance_band type public.delivery_distance_band
  using delivery_distance_band::text::public.delivery_distance_band;

-- 5) Drop enum viejo.
drop type public.delivery_distance_band_old;

-- 6) Seed comisiones en app_settings (idempotente).
insert into public.app_settings (key, value)
  values ('delivery_distance_commissions', '{"near": 3.00, "far": 3.50}')
  on conflict (key) do nothing;

-- 7) Marcar commission_per_order como deprecated (no eliminar).
comment on column public.restaurants.commission_per_order is
  'DEPRECATED desde 2026-05-23. La comisión real ahora depende de la distancia declarada al pickup (ver app_settings.delivery_distance_commissions). Se mantiene la columna para no romper schemas/reportes legacy pero ya no se lee al crear pedidos.';
