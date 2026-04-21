-- ═══════════════════════════════════════════════════════════════════
-- 20260420_008 — settlements (liquidaciones semanales de comisión)
-- ═══════════════════════════════════════════════════════════════════

create table public.settlements (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete restrict,
  period_start      date not null,
  period_end        date not null,
  order_count       integer not null default 0,
  total_amount      numeric(10, 2) not null default 0 check (total_amount >= 0),
  status            public.settlement_status not null default 'pending',
  due_date          date not null,
  paid_at           timestamptz,
  payment_method    text,
  payment_note      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (restaurant_id, period_start, period_end),
  check (period_end >= period_start),
  check (due_date >= period_end)
);

create index idx_settlements_restaurant on public.settlements (restaurant_id, period_start desc);
create index idx_settlements_status on public.settlements (status);
create index idx_settlements_due_date on public.settlements (due_date) where status = 'pending';

comment on table public.settlements is 'Liquidaciones semanales de la comisión Tindivo por restaurante.';
