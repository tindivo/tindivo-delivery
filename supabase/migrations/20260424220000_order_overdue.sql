-- ════════════════════════════════════════════════════════════════
-- 20260424_220 — OrderOverdue event (zona roja)
-- ════════════════════════════════════════════════════════════════
--
-- Cuando un pedido cruza su estimated_ready_at sin que ningún driver lo
-- haya aceptado (status=waiting_driver), se emite un evento OrderOverdue.
-- El trigger trg_domain_events_dispatch_push dispara la Edge Function
-- send-push que notifica a los drivers disponibles con una push "zona roja"
-- (vibración larga + requireInteraction).
--
-- Idempotente: solo emite si no hay un OrderOverdue previo para ese orderId.

create or replace function public.enqueue_overdue_orders()
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
    'OrderOverdue',
    jsonb_build_object(
      'orderId', o.id,
      'shortId', o.short_id,
      'restaurantId', o.restaurant_id,
      'orderAmount', o.order_amount,
      'estimatedReadyAt', o.estimated_ready_at
    )
  from public.orders o
  where o.status = 'waiting_driver'
    and o.estimated_ready_at <= now()
    and not exists (
      select 1
      from public.domain_events de
      where de.aggregate_id = o.id
        and de.event_type = 'OrderOverdue'
    );
end;
$$;

comment on function public.enqueue_overdue_orders is
  'Emite OrderOverdue para pedidos waiting_driver cuyo estimated_ready_at ya pasó. Idempotente.';

select cron.schedule(
  'enqueue-overdue-orders',
  '* * * * *',
  $$ select public.enqueue_overdue_orders(); $$
);
