-- Banda de distancia declarada al recoger el pedido
--
-- El motorizado declara en el modal de pickup qué tan lejos está el destino
-- del cliente respecto al local: 'near' | 'medium' | 'far'. Tindivo usa este
-- dato para diferenciar comisiones al restaurante (los pedidos lejos cuestan
-- más). Es un dato declarativo: confiamos en el juicio del driver. No se
-- deriva de coords porque (1) muchos pedidos no tienen coords del cliente y
-- (2) la distancia percibida por el driver (que considera tráfico, ruta real)
-- es más justa que la lineal.
--
-- Nullable: pedidos históricos (anteriores a esta migration) quedan en NULL.
-- Pedidos nuevos a partir de ahora: la UI fuerza al driver a elegirlo antes
-- de confirmar el pickup, pero la BD acepta NULL para retro-compat de
-- pedidos en cola que se recogen vía paths viejos (cron, scripts, etc.).
--
-- Los reportes/billing que consuman esta columna deben tratar NULL como
-- "sin clasificar" o usar el default 'near' a su criterio.

-- 1) Enum tipado para las 3 bandas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'delivery_distance_band') then
    create type public.delivery_distance_band as enum ('near', 'medium', 'far');
  end if;
end $$;

-- 2) Columna nullable en orders
alter table public.orders
  add column if not exists delivery_distance_band public.delivery_distance_band;

comment on column public.orders.delivery_distance_band is
  'Banda de distancia declarada por el driver al recoger el pedido (near/medium/far). '
  'Usada para diferenciar comisiones al restaurante. NULL en pedidos históricos.';

-- 3) Index parcial para queries futuros de reporting (filtros por band)
create index if not exists idx_orders_delivery_distance_band
  on public.orders (delivery_distance_band)
  where delivery_distance_band is not null;
