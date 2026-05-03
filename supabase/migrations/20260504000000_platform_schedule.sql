-- Horario operativo de la plataforma.
--
-- Define la ventana en que los restaurantes pueden crear pedidos. Fuera de
-- la ventana se bloquean creaciones (validación en API) y los drivers que
-- estaban disponibles pasan automáticamente a is_available=false al cierre.
--
-- Configuración guardada como JSON en app_settings.value bajo la key
-- 'platform_schedule'. Estructura:
--   {
--     "startHHMM": "18:00",
--     "endHHMM":   "23:00",
--     "days":      ["mon","tue","wed","thu","fri","sat","sun"]
--   }

-- Seed inicial con la ventana operativa típica de Tindivo.
insert into public.app_settings (key, value, updated_by)
values (
  'platform_schedule',
  '{"startHHMM":"18:00","endHHMM":"23:00","days":["mon","tue","wed","thu","fri","sat","sun"]}',
  null
)
on conflict (key) do nothing;

-- Función que cierra automáticamente la disponibilidad de los drivers
-- cuando la hora local Perú coincide con endHHMM en un día operativo.
-- Idempotente: si ya están todos en false, no hace nada.
create or replace function public.auto_close_drivers_on_schedule_end()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  if not (days ? lima_weekday) then return; end if;
  if lima_hhmm <> end_hhmm then return; end if;

  update public.driver_availability
    set is_available = false, updated_at = now()
    where is_available = true;
end;
$$;

comment on function public.auto_close_drivers_on_schedule_end is
  'Pone is_available=false a todos los drivers cuando la hora Perú alcanza endHHMM en día operativo.';

select cron.schedule(
  'auto-close-drivers',
  '* * * * *',
  $$ select public.auto_close_drivers_on_schedule_end(); $$
);
