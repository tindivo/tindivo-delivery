-- ═══════════════════════════════════════════════════════════════════
-- 20260420_010 — domain_events (outbox pattern)
-- ═══════════════════════════════════════════════════════════════════

create table public.domain_events (
  id                uuid primary key default gen_random_uuid(),
  aggregate_type    text not null,
  aggregate_id      uuid not null,
  event_type        text not null,
  payload           jsonb not null default '{}'::jsonb,
  metadata          jsonb not null default '{}'::jsonb,
  occurred_at       timestamptz not null default now(),
  published_at      timestamptz,
  status            public.domain_event_status not null default 'pending',
  retry_count       integer not null default 0,
  last_error        text
);

create index idx_domain_events_pending on public.domain_events (occurred_at) where published_at is null;
create index idx_domain_events_aggregate on public.domain_events (aggregate_type, aggregate_id);
create index idx_domain_events_event_type on public.domain_events (event_type);

comment on table public.domain_events is 'Outbox de eventos de dominio. Relay externo los publica a Realtime/Push.';
