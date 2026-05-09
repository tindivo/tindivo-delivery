-- Reactividad event-driven en asignación de pedidos.
--
-- Reemplaza el cron polling de 1 min por triggers Postgres que disparan el
-- endpoint /api/v1/internal/orders/assign-one en respuesta a eventos:
--   - INSERT/UPDATE de orders que entren al estado elegible.
--   - INSERT en order_assignment_rejections (re-asignación inmediata tras rechazo).
--
-- El cron `assign-pending-orders` se mantiene como FAILSAFE en una migration
-- aparte (20260513000200_throttle_crons.sql) bajado a cada 5 min.
--
-- Latencia esperada post-deploy:
--   - Antes: P95=103s, P99=220s, max=240s (verificado en BD)
--   - Después: <2s P99 (latencia de pg_net + endpoint + use case)

-- ============================================================================
-- 1. RPC claim_pending_orders: lock pesimista para escalar a >1000 ord/día.
--    El cron failsafe usará esto. Múltiples invocaciones concurrentes (cron +
--    triggers reactivos en paralelo) NUNCA tocan la misma fila gracias a
--    FOR UPDATE SKIP LOCKED. Patrón estándar de queues sobre Postgres
--    (Sidekiq/River/Hatchet usan esto).
-- ============================================================================

create or replace function public.claim_pending_orders(p_limit int default 50)
returns table(id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select o.id
  from public.orders o
  where o.status = 'waiting_driver'
    and o.driver_id is null
    and o.appears_in_queue_at <= now()
  order by o.appears_in_queue_at asc
  limit p_limit
  for update skip locked
$$;

comment on function public.claim_pending_orders(int) is
  'Devuelve hasta p_limit pedidos elegibles para auto-asignación, bloqueándolos para esta transacción. Otra invocación concurrente ve un set distinto. Usado por /api/v1/internal/orders/assign-pending y por el cron failsafe.';

-- ============================================================================
-- 2. Helper: invocar /assign-one para un order_id específico.
--    Patrón idéntico a invoke_assign_pending_orders pero apunta al endpoint
--    single-order. Lectura de secrets desde vault (igual setup ya existente).
-- ============================================================================

create or replace function public.invoke_assign_one(p_order_id uuid)
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
    raise notice 'invoke_assign_one: missing vault secrets, skipping (cron failsafe lo recogerá en próximo tick)';
    return;
  end if;

  perform net.http_post(
    url := v_url || '/api/v1/internal/orders/assign-one',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('orderId', p_order_id)
  );
end;
$$;

comment on function public.invoke_assign_one(uuid) is
  'Dispara asignación reactiva de un pedido vía pg_net (fire-and-forget). Si pg_net falla o el endpoint no responde, el cron failsafe assign-pending-orders-failsafe lo recogerá.';

-- ============================================================================
-- 3. Trigger 1: orders → reactive assign cuando un pedido se vuelve elegible.
--    Casos cubiertos:
--      a) INSERT de pedido `restaurant_pwa` que nace `waiting_driver`.
--      b) UPDATE de pedido `customer_pwa` cuando restaurante acepta
--         (transición pending_acceptance → waiting_driver).
--      c) UPDATE que libera driver_id (rechazo / transferencia / timeout).
--      d) UPDATE de appears_in_queue_at (ej: extensión del restaurante).
--    Filtro defensivo: solo dispara si la condición acaba de volverse true,
--    no en cada UPDATE arbitrario (evita ruido en touch de updated_at).
-- ============================================================================

create or replace function public.trg_orders_reactive_assign()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'waiting_driver'
     and new.driver_id is null
     and new.appears_in_queue_at <= now()
     and (
       tg_op = 'INSERT'
       or old.status is distinct from new.status
       or old.driver_id is distinct from new.driver_id
       or old.appears_in_queue_at is distinct from new.appears_in_queue_at
     )
  then
    perform public.invoke_assign_one(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_reactive_assign_aiu on public.orders;

create trigger trg_orders_reactive_assign_aiu
  after insert or update on public.orders
  for each row execute function public.trg_orders_reactive_assign();

comment on trigger trg_orders_reactive_assign_aiu on public.orders is
  'Dispara asignación inmediata cuando un pedido entra al estado waiting_driver+driver_id IS NULL+appears_in_queue_at<=now. Reemplaza la latencia de cron (60s) por reactivo (<1s).';

-- ============================================================================
-- 4. Trigger 2: order_assignment_rejections → re-asignación instantánea.
--    Cuando un driver rechaza, el use case ya hizo UPDATE orders SET
--    driver_id=NULL. Ese UPDATE dispara trigger 1 → assign-one. PERO el
--    use case puede haber persistido el rechazo DESPUÉS del UPDATE de orders
--    (orden actual: save() → recordRejection() → publishAll()), entonces el
--    primer disparo aún no conoce el rechazo y puede re-asignar al mismo driver.
--    Este segundo trigger re-dispara tras el INSERT de rechazo, esta vez con
--    el rechazo ya visible para findRejectedDriverIds.
-- ============================================================================

create or replace function public.trg_rejections_reactive_assign()
returns trigger
language plpgsql
as $$
begin
  perform public.invoke_assign_one(new.order_id);
  return new;
end;
$$;

drop trigger if exists trg_rejections_reactive_assign_ai on public.order_assignment_rejections;

create trigger trg_rejections_reactive_assign_ai
  after insert on public.order_assignment_rejections
  for each row execute function public.trg_rejections_reactive_assign();

comment on trigger trg_rejections_reactive_assign_ai on public.order_assignment_rejections is
  'Re-asignación inmediata tras rechazo. Mata la latencia de 51s observada en producción (pedido 6CPYP5S9: rechazo 03:02 → reasignación cron 03:03).';
