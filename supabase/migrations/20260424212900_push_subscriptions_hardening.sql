-- ════════════════════════════════════════════════════════════════
-- 20260424_121 — push_subscriptions hardening
-- ════════════════════════════════════════════════════════════════
--
-- Mejoras de confiabilidad en producción:
-- 1. Índice por endpoint para DELETE rápido en unsubscribe + cleanup 410.
-- 2. last_success_at: última vez que se envió push OK a esa subscription
--    (telemetry + decisión de purga).
-- 3. consecutive_failures: contador para que send-push pueda purgar subs
--    con 3+ fallas consecutivas no-410 (servicio de push caído o endpoint
--    sin respuesta).

create index if not exists idx_push_subscriptions_endpoint
  on public.push_subscriptions (endpoint);

alter table public.push_subscriptions
  add column if not exists last_success_at timestamptz;

alter table public.push_subscriptions
  add column if not exists consecutive_failures integer not null default 0;

comment on column public.push_subscriptions.last_success_at is
  'Última vez que web-push retornó 2xx a esta subscription.';
comment on column public.push_subscriptions.consecutive_failures is
  'Fallas 5xx/timeout acumuladas. send-push purga cuando supera 3.';
