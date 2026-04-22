-- ═══════════════════════════════════════════════════════════════════
-- 20260422_010 — Múltiples ciclos de liquidación por día + link a orders
-- ═══════════════════════════════════════════════════════════════════
-- Un driver puede hacer varios viajes al mismo restaurante en un mismo
-- día; tras confirmar una liquidación, los nuevos pedidos en efectivo
-- deben formar un ciclo nuevo. Quitamos la constraint única y linkeamos
-- explícitamente cada pedido con el settlement que lo incluye.
--
-- Además agregamos resolved_by y confirmed_by para auditoría de
-- quién ejecutó cada transición — HU-A-037.

-- 1) Quitar constraint única (multi-ciclo por día)
alter table public.cash_settlements
  drop constraint if exists cash_settlements_restaurant_id_driver_id_settlement_date_key;

-- 2) Índice compuesto para lookups (reemplaza la unicidad)
create index if not exists idx_cash_settlements_rdd
  on public.cash_settlements (restaurant_id, driver_id, settlement_date desc);

-- 3) Auditoría: quién confirmó/resolvió
alter table public.cash_settlements
  add column if not exists confirmed_by uuid references public.users(id) on delete set null,
  add column if not exists resolved_by  uuid references public.users(id) on delete set null,
  add column if not exists confirmed_at timestamptz,
  add column if not exists disputed_at  timestamptz,
  add column if not exists resolved_at  timestamptz;

-- 4) Link orders → cash_settlement (qué ciclo incluye cada pedido)
alter table public.orders
  add column if not exists cash_settlement_id uuid references public.cash_settlements(id) on delete set null;

create index if not exists idx_orders_cash_settlement
  on public.orders (cash_settlement_id)
  where cash_settlement_id is not null;

comment on column public.orders.cash_settlement_id is
  'Settlement que incluye este pedido en efectivo (null = aún no liquidado).';
