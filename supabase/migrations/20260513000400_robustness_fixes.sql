-- Robustness fixes (PR4): auto_close_drivers idempotente + TTL en rejections.
--
-- 1. auto_close_drivers_on_schedule_end:
--    Bug: requería igualdad EXACTA `lima_hhmm = end_hhmm`. Si pg_cron salta
--    un minuto (caso documentado por high load del scheduler), la función
--    nunca cierra drivers ese día. Idempotente: cierra cualquier driver con
--    is_available=true cuyo end_hhmm ya pasó hoy. Re-ejecuciones N veces
--    son no-op (UPDATE solo afecta filas que aún están abiertas).
--
-- 2. order_assignment_rejections.expires_at:
--    Hoy: un rechazo persiste para siempre. Si la bandeja queda con un solo
--    driver y todos los demás rechazaron, el pedido queda huérfano. TTL 6h
--    permite reintentar al mismo driver tras un rato (puede haber cambiado
--    su contexto: ya entregó, está más cerca del restaurante, etc.).

-- ============================================================================
-- Parte 1: auto_close_drivers_on_schedule_end idempotente
-- ============================================================================
create or replace function public.auto_close_drivers_on_schedule_end()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  schedule jsonb;
  end_hhmm text;
  days jsonb;
  lima_now timestamp;
  lima_weekday text;
  lima_hhmm text;
begin
  select value::jsonb into schedule
  from public.app_settings
  where key = 'platform_schedule';

  if schedule is null then return; end if;

  end_hhmm := schedule ->> 'endHHMM';
  days := schedule -> 'days';

  if end_hhmm is null or days is null then return; end if;

  lima_now := (now() at time zone 'America/Lima');
  lima_weekday := lower(left(to_char(lima_now, 'Dy'), 3));
  lima_hhmm := to_char(lima_now, 'HH24:MI');

  -- Día no operativo: no toca cerrar
  if not (days ? lima_weekday) then return; end if;

  -- Aún no llegó la hora de cierre hoy: no toca cerrar
  if lima_hhmm < end_hhmm then return; end if;

  -- A partir del end_hhmm: cierra cualquier driver que siga abierto.
  -- Si el cron pierde el minuto exacto (jitter), el siguiente tick lo recoge.
  -- Si todos ya están cerrados, el UPDATE no afecta filas (no-op).
  update public.driver_availability
    set is_available = false, updated_at = now()
    where is_available = true;
end;
$function$;

comment on function public.auto_close_drivers_on_schedule_end() is
  'Cierra disponibilidad de drivers cuando termina el horario de plataforma. Idempotente: re-ejecutarlo N veces no causa daño. Tolerante a jitter de pg_cron.';

-- ============================================================================
-- Parte 2: TTL en order_assignment_rejections
-- ============================================================================
alter table public.order_assignment_rejections
  add column if not exists expires_at timestamptz not null default (now() + interval '6 hours');

comment on column public.order_assignment_rejections.expires_at is
  'TTL del rechazo. Tras vencer, el driver puede ser re-considerado para el mismo pedido (su contexto puede haber cambiado: ya entregó, está más cerca, etc.). findRejectedDriverIds filtra por expires_at > now().';

create index if not exists idx_oar_expires
  on public.order_assignment_rejections (expires_at);

create or replace function public.prune_expired_rejections()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.order_assignment_rejections where expires_at < now();
$$;

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'prune-expired-rejections';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  perform cron.schedule(
    'prune-expired-rejections',
    '0 5 * * *',
    $sql$ select public.prune_expired_rejections(); $sql$
  );
end $$;
