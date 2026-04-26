-- ════════════════════════════════════════════════════════════════
-- 20260426_122 — Cron de purga preventiva de push_subscriptions stale
-- ════════════════════════════════════════════════════════════════
--
-- send-push solo purga subs cuando intenta enviar y recibe 410/404 o 3+
-- fallos consecutivos. Si nunca se intenta (p.ej. el user dejó de ser
-- driver activo), las subs muertas se quedan eternamente en la tabla.
--
-- Este cron corre 1× al día a las 04:00 UTC (medianoche Lima) y borra
-- subs con last_success_at > 14 días o creadas hace >7 días sin nunca
-- haber recibido push exitoso. AutoHeal del cliente regenera la sub al
-- siguiente checkStatus si el dispositivo sigue activo.

create or replace function public.prune_stale_push_subscriptions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.push_subscriptions
  where (last_success_at < now() - interval '14 days')
     or (last_success_at is null and created_at < now() - interval '7 days');
end;
$$;

comment on function public.prune_stale_push_subscriptions is
  'Purga subs con last_success_at>14d o creadas hace 7d sin éxito.';

select cron.schedule(
  'prune-stale-push-subscriptions',
  '0 4 * * *',
  $$ select public.prune_stale_push_subscriptions(); $$
);
