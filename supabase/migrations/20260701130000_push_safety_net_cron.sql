-- ═══════════════════════════════════════════════════════════════════
-- 20260701130000 — push_safety_net_cron
-- ═══════════════════════════════════════════════════════════════════
--
-- Crea la función public.invoke_send_push_safety_net para invocar la Edge Function
-- send-push de manera redundante para eventos atrasados (>30s) que sigan en 'pending'.
-- Registra el cron job send-push-safety-net para ejecutarse cada minuto.
--

create or replace function public.invoke_send_push_safety_net()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cron_enabled text;
  v_pending_count int;
begin
  -- Verificar feature flag
  v_cron_enabled := public.get_app_setting('push_safety_net_cron_enabled');
  if coalesce(v_cron_enabled, 'false') <> 'true' then
    return;
  end if;

  -- Contar eventos atascados (pending con más de 30s de antigüedad)
  select count(*) into v_pending_count
  from public.domain_events
  where status = 'pending'
    and published_at is null
    and occurred_at < (now() - interval '30 seconds');

  -- Si hay eventos atrasados, disparar la Edge Function vía pg_net sin pasar id específico
  if v_pending_count > 0 then
    perform net.http_post(
      url := 'https://nwcdxmebsozswnjlblip.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('trigger', 'safety_net')
    );
  end if;
end;
$$;

comment on function public.invoke_send_push_safety_net() is
  'Invoca la Edge Function send-push de forma redundante si hay eventos atrasados (pending > 30s).';

-- Registrar cron job cada minuto
select cron.schedule(
  'send-push-safety-net',
  '* * * * *',
  $$ select public.invoke_send_push_safety_net(); $$
);
