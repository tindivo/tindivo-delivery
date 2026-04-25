-- ═══════════════════════════════════════════════════════════════════
-- 20260425_001 — Timestamps adicionales para métricas operativas
-- ═══════════════════════════════════════════════════════════════════
-- Permite reconstruir el timeline completo de un pedido y calcular
-- duraciones por etapa para KPIs del admin (tiempo de aceptación,
-- tiempo en local, tiempo de entrega, % aceptados overdue, etc.).

alter table public.orders
  add column received_at timestamptz,
  add column accept_countdown_seconds integer,
  add column prep_extended_at timestamptz,
  add column prep_extension_minutes smallint check (
    prep_extension_minutes is null or prep_extension_minutes in (5, 10)
  ),
  add column ready_early_at timestamptz;

create index idx_orders_accept_countdown on public.orders (accept_countdown_seconds)
  where accept_countdown_seconds is not null;

comment on column public.orders.accept_countdown_seconds is
  'Segundos restantes al estimated_ready_at en el momento que el driver acepta. Negativo = overdue.';
comment on column public.orders.received_at is
  'Cuándo el driver tocó "Recibí el pedido" (antes de pickup form).';
comment on column public.orders.prep_extended_at is
  'Cuándo el restaurante extendió el tiempo de preparación.';
comment on column public.orders.ready_early_at is
  'Cuándo el restaurante marcó el pedido como listo antes.';
