-- ════════════════════════════════════════════════════════════════
-- 20260424_120 — OrderReadyForDrivers event + pg_cron scheduler
-- ════════════════════════════════════════════════════════════════
--
-- Motivo: hasta ahora el push al motorizado se disparaba con OrderCreated,
-- pero el driver solo puede aceptar cuando el pedido entra en su bandeja
-- (appears_in_queue_at <= now()). Para prep "slow" (20 min) el driver
-- recibía la alerta 10 minutos antes de poder siquiera verlo.
--
-- Solución: nuevo evento de dominio OrderReadyForDrivers. Un pg_cron cada
-- minuto evalúa pedidos que maduraron y lo emite insertándolo en domain_events.
-- El trigger existente trg_domain_events_dispatch_push automáticamente
-- invoca la Edge Function send-push, que ahora mapea este evento a push
-- con url /motorizado/pedidos/{id}/preview.
--
-- pg_cron es SQL puro: no invoca HTTP desde el cron (0 invocaciones a EF
-- innecesarias). La EF solo se invoca cuando realmente hay un evento.

create or replace function public.enqueue_orders_ready_for_drivers()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.domain_events (aggregate_type, aggregate_id, event_type, payload)
  select
    'Order',
    o.id,
    'OrderReadyForDrivers',
    jsonb_build_object(
      'orderId', o.id,
      'shortId', o.short_id,
      'restaurantId', o.restaurant_id,
      'orderAmount', o.order_amount,
      'appearsInQueueAt', o.appears_in_queue_at
    )
  from public.orders o
  where o.status = 'waiting_driver'
    and o.appears_in_queue_at <= now()
    and not exists (
      select 1
      from public.domain_events de
      where de.aggregate_id = o.id
        and de.event_type = 'OrderReadyForDrivers'
    );
end;
$$;

comment on function public.enqueue_orders_ready_for_drivers is
  'Emite OrderReadyForDrivers para pedidos cuya ventana de bandeja ya llegó. Idempotente por NOT EXISTS.';

-- pg_cron: cada 1 minuto.
-- Nota: pg_cron 1.6.4 soporta sintaxis de 6 campos (segundos) pero en el
-- plan Free de Supabase esa frecuencia puede no ejecutarse. 1 min es la
-- latencia máxima del push del driver para pedidos cuya ventana ya llegó.
select cron.schedule(
  'enqueue-orders-ready-for-drivers',
  '* * * * *',
  $$ select public.enqueue_orders_ready_for_drivers(); $$
);
