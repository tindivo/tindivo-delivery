-- Auto-aceptación por timeout en transferencias entre motorizados.
--
-- Cambio de comportamiento: hoy el cron `expire-transfer-requests` marca las
-- solicitudes pending vencidas como `expired` (equivale a "rechazo silencioso").
-- Nueva regla del producto: si Driver A no responde en 30s, se interpreta
-- como aceptación y el pedido se transfiere automáticamente a Driver B.
--
-- Implementación (siguiendo el patrón `invoke_assign_one` →
-- `/internal/orders/assign-one` → `AutoAssignOrderUseCase`):
--   1. Función helper `invoke_process_expired_transfer_requests()` que vía
--      `pg_net.http_post` invoca el endpoint interno.
--   2. Cron `process-expired-transfer-requests` reemplaza al antiguo
--      `expire-transfer-requests`. Misma frecuencia (1 min, SLA real 30-90s).
--   3. Cron failsafe `expire-transfer-requests-failsafe` cada 5 min sigue
--      usando `expire_pending_transfer_requests()` (UPDATE … expired) por si
--      pg_net o el endpoint quedan down: garantiza que la tabla no acumule
--      pending huérfanas. Fallback "no transferir" es la opción segura.
--
-- La lógica de validación (capacidad R3, autorización al restaurante, orden
-- todavía con el dueño original) vive en el use case del dominio, NO en SQL.

create or replace function public.invoke_process_expired_transfer_requests()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'app_internal_api_url'
  limit 1;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if v_url is null or v_key is null then
    raise notice 'invoke_process_expired_transfer_requests: missing vault secrets, skipping (failsafe cleanup ejecutará en el siguiente tick de 5min)';
    return;
  end if;

  perform net.http_post(
    url := v_url || '/api/v1/internal/transfer-requests/process-expired',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

comment on function public.invoke_process_expired_transfer_requests() is
  'Dispara auto-aceptación de solicitudes de transferencia vencidas vía pg_net (fire-and-forget). Si pg_net falla o el endpoint no responde, el cron failsafe expire-transfer-requests-failsafe recogerá las pending huérfanas.';

-- Reemplazo del cron antiguo. unschedule es idempotente: si no existe (deploy
-- limpio) no falla, solo emite NOTICE.
do $$
begin
  perform cron.unschedule('expire-transfer-requests');
exception when others then
  raise notice 'cron expire-transfer-requests no estaba programado, continuando';
end$$;

select cron.schedule(
  'process-expired-transfer-requests',
  '* * * * *',
  $$ select public.invoke_process_expired_transfer_requests(); $$
);

-- Failsafe: si el endpoint queda down 10+ min, evitar acumulación silenciosa
-- de filas pending huérfanas. Marca como `expired` SIN transferir (fallback
-- seguro). Misma función SQL existente (definida en 20260515000100).
select cron.schedule(
  'expire-transfer-requests-failsafe',
  '*/5 * * * *',
  $$ select public.expire_pending_transfer_requests(); $$
);
