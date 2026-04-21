-- ═══════════════════════════════════════════════════════════════════
-- 20260420_011 — admin_alerts (alertas sintéticas para el admin)
-- ═══════════════════════════════════════════════════════════════════

create table public.admin_alerts (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  resolved_at  timestamptz,
  resolved_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index idx_admin_alerts_type_unresolved on public.admin_alerts (type) where resolved_at is null;
create index idx_admin_alerts_created_at on public.admin_alerts (created_at desc);

comment on table public.admin_alerts is 'Alertas operacionales visibles para admin (timeouts, disputas, offline con pedidos, etc.).';
