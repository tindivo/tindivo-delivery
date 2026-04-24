-- ═══════════════════════════════════════════════════════════════════
-- 20260424_000 — Coordenadas simples lat/lng para restaurants
--
-- El admin ubica el restaurante en el mapa (Leaflet) al crearlo. La
-- columna `coordinates geography(point, 4326)` existente en restaurants
-- no se está usando en los flujos actuales y supabase-js no mapea bien
-- PostGIS a { lat, lng }. Agregamos dos columnas double precision
-- simples que se persisten y leen directamente desde el cliente.
-- La columna geography se deja intacta para geoqueries futuras.
-- ═══════════════════════════════════════════════════════════════════

alter table public.restaurants
  add column if not exists coordinates_lat double precision,
  add column if not exists coordinates_lng double precision;

comment on column public.restaurants.coordinates_lat is 'Latitud seleccionada en el mapa (Leaflet click/drag) al crear/editar.';
comment on column public.restaurants.coordinates_lng is 'Longitud seleccionada en el mapa (Leaflet click/drag) al crear/editar.';
