-- Asignación diferida de pedidos a motorizados.
--
-- Antes: el endpoint POST /restaurant/orders llamaba auto-assign al instante
-- y el driver quedaba "reservado" hasta 30 min antes de que la comida
-- estuviera lista. Esto bloqueaba capacidad innecesariamente.
--
-- Ahora: auto-assign retorna `deferred_until_queue_window` cuando
-- appears_in_queue_at > now(), dejando el pedido en waiting_driver con
-- driver_id NULL. Este cron lo recoge cada minuto y dispara la asignación
-- vía endpoint REST interno (la lógica vive en packages/core, DDD).

-- ─────────────────────────────────────────────────────────────────────────
-- Función que invoca el endpoint REST de asignación pendiente.
--
-- Pre-requisito de despliegue (manual una vez por entorno):
--   select vault.create_secret('https://api.tindivo.com',         'app_internal_api_url');
--   select vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>',     'service_role_key');
--
-- Para rotar o actualizar:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'app_internal_api_url'),
--     'https://nueva-url.tindivo.com'
--   );
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.invoke_assign_pending_orders()
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
    raise notice 'invoke_assign_pending_orders: missing vault secrets (app_internal_api_url and/or service_role_key), skipping';
    return;
  end if;

  perform net.http_post(
    url := v_url || '/api/v1/internal/orders/assign-pending',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

comment on function public.invoke_assign_pending_orders is
  'Invoca el endpoint interno que asigna pedidos pendientes que entraron en su ventana de bandeja.';

-- Cron cada minuto. Si la migration se reaplica, schedule es idempotente:
-- pg_cron permite duplicar nombres pero generamos un guard para no duplicar.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'assign-pending-orders') then
    perform cron.schedule(
      'assign-pending-orders',
      '* * * * *',
      $job$ select public.invoke_assign_pending_orders(); $job$
    );
  end if;
end;
$$;
