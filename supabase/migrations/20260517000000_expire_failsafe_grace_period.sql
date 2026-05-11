-- Fix race condition entre cron principal y failsafe.
--
-- Antes: `expire-transfer-requests-failsafe` (cada 5 min) y
-- `process-expired-transfer-requests` (cada 1 min) coincidían en :00 y :05.
-- El failsafe ganaba el UPDATE…SET status='expired' antes de que el principal
-- pudiera invocar el endpoint, dejando solicitudes vencidas marcadas como
-- `expired` sin transferir (regresión al comportamiento anterior).
--
-- Fix: el failsafe solo actúa si expires_at < now() - 2 min. Eso le da al
-- cron principal 2-3 ticks de oportunidad para procesar. Si pg_net o el
-- endpoint quedan down >2 min, el failsafe entra como cleanup seguro.

create or replace function public.expire_pending_transfer_requests()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.order_transfer_requests
     set status = 'expired',
         resolved_at = now()
   where status = 'pending'
     and expires_at < now() - interval '2 minutes';
$$;

comment on function public.expire_pending_transfer_requests() is
  'Failsafe: marca como expired solicitudes pending vencidas hace más de 2 minutos. Margen para que el cron principal process-expired-transfer-requests (auto-accept) procese primero.';
