-- ═══════════════════════════════════════════════════════════════════
-- 20260420_007 — cash_settlements (efectivo diario driver ↔ restaurant)
-- ═══════════════════════════════════════════════════════════════════

create table public.cash_settlements (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references public.restaurants(id) on delete restrict,
  driver_id           uuid not null references public.drivers(id) on delete restrict,
  settlement_date     date not null,
  total_cash          numeric(10, 2) not null default 0 check (total_cash >= 0),
  order_count         integer not null default 0 check (order_count >= 0),
  delivered_amount    numeric(10, 2) check (delivered_amount is null or delivered_amount >= 0),
  confirmed_amount    numeric(10, 2) check (confirmed_amount is null or confirmed_amount >= 0),
  reported_amount     numeric(10, 2) check (reported_amount is null or reported_amount >= 0),
  resolved_amount     numeric(10, 2) check (resolved_amount is null or resolved_amount >= 0),
  dispute_note        text,
  resolution_note     text,
  status              public.cash_settlement_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (restaurant_id, driver_id, settlement_date)
);

create index idx_cash_settlements_restaurant on public.cash_settlements (restaurant_id, settlement_date desc);
create index idx_cash_settlements_driver on public.cash_settlements (driver_id, settlement_date desc);
create index idx_cash_settlements_status on public.cash_settlements (status);
create index idx_cash_settlements_disputed on public.cash_settlements (id) where status = 'disputed';

comment on table public.cash_settlements is 'Cuadre de efectivo diario driver↔restaurante por pedidos pagados en efectivo.';
