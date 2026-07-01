-- ═══════════════════════════════════════════════════════════════════
-- 20260701130500 — orders_reactive_ready_driver_trigger
-- ═══════════════════════════════════════════════════════════════════
--
-- Crea la función public.trg_orders_reactive_ready_driver y el trigger
-- trg_orders_reactive_ready_driver_aiu en la tabla public.orders para
-- publicar reactivamente el evento OrderReadyForDrivers cuando un pedido
-- madura o entra en la bandeja de asignación de motorizados.
--

create or replace function public.trg_orders_reactive_ready_driver()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Kill switch
  if coalesce(public.get_app_setting('push_reactive_trigger_enabled'), 'false') <> 'true' then
    return new;
  end if;

  if new.status = 'waiting_driver'
     and new.driver_id is null
     and new.appears_in_queue_at <= (now() + interval '5 seconds')
     and not exists (
       select 1 from public.domain_events de
       where de.aggregate_id = new.id
         and de.event_type = 'OrderReadyForDrivers'
     )
  then
    insert into public.domain_events (aggregate_type, aggregate_id, event_type, payload)
    values (
      'Order', new.id, 'OrderReadyForDrivers',
      jsonb_build_object(
        'orderId', new.id,
        'shortId', new.short_id,
        'restaurantId', new.restaurant_id,
        'orderAmount', new.order_amount,
        'appearsInQueueAt', new.appears_in_queue_at
      )
    );
  end if;
  return new;
end;
$$;

comment on function public.trg_orders_reactive_ready_driver() is
  'Publica reactivamente el evento OrderReadyForDrivers al cambiar status a waiting_driver sin asignación.';

drop trigger if exists trg_orders_reactive_ready_driver_aiu on public.orders;
create trigger trg_orders_reactive_ready_driver_aiu
  after insert or update of status, driver_id, appears_in_queue_at on public.orders
  for each row execute function public.trg_orders_reactive_ready_driver();
