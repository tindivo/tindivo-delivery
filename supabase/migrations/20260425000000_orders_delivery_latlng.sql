-- ═══════════════════════════════════════════════════════════════════
-- 20260425_000 — Columnas generadas delivery_lat / delivery_lng en orders
--
-- `delivery_coordinates` es geography(point, 4326) y PostgREST la
-- serializa como WKB hex (`"0101000020E6100000..."`), inservible para
-- el frontend. Agregamos dos columnas double precision GENERATED
-- ALWAYS STORED derivadas de la geography para lectura simple desde
-- el cliente (driver, admin, tracking).
--
-- STORED garantiza que se recalculen automáticamente al INSERT/UPDATE
-- de delivery_coordinates, sin tocar use-cases ni triggers.
-- ═══════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists delivery_lat double precision
    generated always as (st_y(delivery_coordinates::geometry)) stored,
  add column if not exists delivery_lng double precision
    generated always as (st_x(delivery_coordinates::geometry)) stored;

comment on column public.orders.delivery_lat is
  'Latitud derivada de delivery_coordinates (geography PostGIS). Lectura simple desde frontend (driver/admin).';
comment on column public.orders.delivery_lng is
  'Longitud derivada de delivery_coordinates (geography PostGIS). Lectura simple desde frontend (driver/admin).';
