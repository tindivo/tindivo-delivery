-- ════════════════════════════════════════════════════════════════
-- 20260517_000 — push_delivery_log (telemetría de entregabilidad)
-- ════════════════════════════════════════════════════════════════
--
-- Hasta ahora la única forma de saber si un push se entregó era leer los
-- console.log de la Edge Function en el panel de Supabase. Imposible
-- responder "¿por qué este motorizado no recibe push?" sin escarbar.
--
-- Tabla append-only: una fila por cada intento de envío (éxito o error)
-- registrado por send-push. Permite:
--   - Distribución por status_code para detectar 4xx/5xx que suben.
--   - Auditoría por usuario: últimos N intentos a sus suscripciones.
--   - Detección de bugs nuevos: si la tasa de 200 cae, alarma.
--
-- Sin RLS: solo service_role escribe (Edge Function); admin app lee vía
-- endpoint interno /push-debug que ya valida service role key.

create table public.push_delivery_log (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  event_type      text not null,
  status_code     integer,
  error_text      text,
  sent_at         timestamptz not null default now()
);

-- Lookup por suscripción para inspección rápida ("últimos intentos a esta sub").
create index idx_push_delivery_log_subscription on public.push_delivery_log (subscription_id, sent_at desc);

-- Reportes globales recientes ("distribución de status en última hora").
create index idx_push_delivery_log_sent on public.push_delivery_log (sent_at desc);

-- Triage por usuario sin pasar por subscription_id.
create index idx_push_delivery_log_user on public.push_delivery_log (user_id, sent_at desc);

comment on table public.push_delivery_log is
  'Append-only log de intentos de envío de Web Push. Una fila por intento (éxito o error).';
comment on column public.push_delivery_log.status_code is
  'HTTP del push service (200=OK, 410/404=endpoint muerto, 5xx=push service caído).';
comment on column public.push_delivery_log.error_text is
  'Mensaje del error si el statusCode no es 2xx. NULL en éxito.';

-- Prune a 30 días: el log es para diagnóstico de corto plazo, no auditoría
-- forense. Más allá de 30d el patrón de delivery cambia tanto que no es útil.
create or replace function public.prune_old_push_delivery_log()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.push_delivery_log where sent_at < now() - interval '30 days';
end;
$$;

select cron.schedule(
  'prune-old-push-delivery-log',
  '0 5 * * *',
  $$ select public.prune_old_push_delivery_log(); $$
);
