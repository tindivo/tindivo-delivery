-- Autoasignación de pedidos a motorizados.
--
-- Un pedido reservado tiene status=waiting_driver y driver_id no nulo.
-- Al llegar a appears_in_queue_at, se activa automáticamente como
-- heading_to_restaurant para conservar la máquina de estados existente.

create or replace function public.activate_assigned_orders()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with activated as (
    update public.orders o
    set
      status = 'heading_to_restaurant',
      accepted_at = coalesce(o.accepted_at, now()),
      heading_at = coalesce(o.heading_at, now()),
      accept_countdown_seconds = round(extract(epoch from (o.estimated_ready_at - now())))::integer,
      updated_at = now()
    where o.status = 'waiting_driver'
      and o.driver_id is not null
      and o.appears_in_queue_at <= now()
    returning
      o.id,
      o.driver_id,
      o.accepted_at,
      o.accept_countdown_seconds
  )
  insert into public.domain_events (aggregate_type, aggregate_id, event_type, payload)
  select
    'Order',
    a.id,
    'OrderAccepted',
    jsonb_build_object(
      'orderId', a.id,
      'driverId', a.driver_id,
      'acceptedAt', coalesce(a.accepted_at, now()),
      'acceptCountdownSeconds', a.accept_countdown_seconds
    )
  from activated a
  where not exists (
    select 1
    from public.domain_events de
    where de.aggregate_id = a.id
      and de.event_type = 'OrderAccepted'
  );
end;
$$;

comment on function public.activate_assigned_orders is
  'Activa pedidos autoasignados cuando llegan a la ventana operativa.';

select cron.schedule(
  'activate-assigned-orders',
  '* * * * *',
  $$ select public.activate_assigned_orders(); $$
);

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
    and o.driver_id is null
    and o.appears_in_queue_at <= now()
    and not exists (
      select 1
      from public.domain_events de
      where de.aggregate_id = o.id
        and de.event_type = 'OrderReadyForDrivers'
    );
end;
$$;

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
    and o.driver_id is null
    and o.estimated_ready_at <= now()
    and not exists (
      select 1
      from public.domain_events de
      where de.aggregate_id = o.id
        and de.event_type = 'OrderOverdue'
    );
end;
$$;

drop policy if exists orders_restaurant_read on public.orders;
create policy orders_restaurant_read on public.orders
  for select using (
    restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'driver'
      and status = 'waiting_driver'
      and driver_id is null
    )
  );

drop policy if exists orders_update_by_actor on public.orders;
create policy orders_update_by_actor on public.orders
  for update using (
    public.current_user_role() = 'admin'
    or restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or (
      public.current_user_role() = 'driver'
      and status = 'waiting_driver'
      and driver_id is null
    )
  );
