-- ═══════════════════════════════════════════════════════════════════
-- 20260420_006 — order_status_history (append-only)
-- ═══════════════════════════════════════════════════════════════════

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  changed_by  uuid references public.users(id) on delete set null,
  notes       text,
  changed_at  timestamptz not null default now()
);

create index idx_order_status_history_order on public.order_status_history (order_id, changed_at);
create index idx_order_status_history_changed_at on public.order_status_history (changed_at desc);

comment on table public.order_status_history is 'Historial inmutable de cambios de estado por pedido.';
