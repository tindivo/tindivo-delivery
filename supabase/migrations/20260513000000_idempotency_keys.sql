-- Idempotency keys (Stripe-style) para endpoints POST de creación.
--
-- Resuelve el bug verificado en BD: 6 pares de pedidos duplicados creados
-- a <60s de diferencia, todos `restaurant_pwa`, todos terminaron `cancelled`
-- por el cron `auto_cancel_unaccepted_orders` (5 min sin aceptar). Patrón
-- típico: el restaurante hace doble click o pierde conexión y reintenta,
-- creando dos órdenes idénticas en BD.
--
-- Patrón (Stripe / Adyen / PayPal):
-- 1. Cliente genera UUID v4, lo persiste en sessionStorage por la duración
--    de la mutation.
-- 2. Cliente lo envía en header `Idempotency-Key`.
-- 3. Servidor consulta esta tabla por (key, scope).
--    - Si existe y request_hash coincide → devuelve respuesta cacheada.
--    - Si existe pero request_hash difiere → 409 IDEMPOTENCY_KEY_MISMATCH.
--    - Si no existe → ejecuta handler y persiste (key, scope, hash, status, body).
-- 4. Cliente limpia la key tras 2xx/4xx. NO la limpia tras 5xx (permite
--    retry seguro contra error transitorio).
--
-- Solo se cachean respuestas finales (status < 500). Las 5xx no se cachean.

create table public.idempotency_keys (
  key                text not null,
  scope              text not null,
  request_hash       text not null,
  response_status    integer not null,
  response_body      jsonb not null,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '24 hours'),
  primary key (key, scope)
);

comment on table public.idempotency_keys is
  'Cache de idempotencia tipo Stripe para POSTs de creación. PK compuesta (key, scope) permite reusar la misma UUID entre endpoints distintos. Limpieza diaria via cron prune-idempotency-keys.';

create index idx_idempotency_keys_expires
  on public.idempotency_keys (expires_at);

-- RLS: deny-by-default. Solo service_role accede (las API routes usan
-- createAdminClient). No se expone vía PostgREST anon/authenticated.
alter table public.idempotency_keys enable row level security;

-- Limpieza diaria de keys vencidas (TTL 24h por defecto).
create or replace function public.prune_expired_idempotency_keys()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.idempotency_keys where expires_at < now();
$$;

select cron.schedule(
  'prune-idempotency-keys',
  '0 5 * * *',
  $$ select public.prune_expired_idempotency_keys(); $$
);
