-- ═══════════════════════════════════════════════════════════════════
-- 20260420_101 — Triggers (updated_at, balance_due, outbox relay)
-- ═══════════════════════════════════════════════════════════════════

-- updated_at genérico
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_users_updated_at         before update on public.users        for each row execute function public.set_updated_at();
create trigger trg_restaurants_updated_at   before update on public.restaurants  for each row execute function public.set_updated_at();
create trigger trg_drivers_updated_at       before update on public.drivers      for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at        before update on public.orders       for each row execute function public.set_updated_at();
create trigger trg_cash_settlements_upd_at  before update on public.cash_settlements for each row execute function public.set_updated_at();
create trigger trg_settlements_updated_at   before update on public.settlements  for each row execute function public.set_updated_at();
create trigger trg_push_subs_updated_at     before update on public.push_subscriptions for each row execute function public.set_updated_at();
create trigger trg_driver_avail_upd_at      before update on public.driver_availability for each row execute function public.set_updated_at();

-- Auto-insert en order_status_history cuando cambia el status
create or replace function public.insert_order_status_history()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into public.order_status_history (order_id, status, changed_by, changed_at)
    values (new.id, new.status, auth.uid(), now());
  end if;
  return new;
end;
$$;

create trigger trg_orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.insert_order_status_history();

-- Al marcar delivered, sumar delivery_fee a restaurants.balance_due
create or replace function public.add_delivery_fee_to_balance()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'delivered' and old.status <> 'delivered' then
    update public.restaurants
    set balance_due = balance_due + new.delivery_fee
    where id = new.restaurant_id;
  end if;
  return new;
end;
$$;

create trigger trg_orders_delivered_balance
  after update of status on public.orders
  for each row execute function public.add_delivery_fee_to_balance();

-- Auto-generar short_id si no se proporciona
create or replace function public.ensure_order_short_id()
returns trigger
language plpgsql
as $$
declare
  attempts integer := 0;
  candidate text;
begin
  if new.short_id is null or new.short_id = '' then
    loop
      candidate := public.generate_short_id();
      exit when not exists (select 1 from public.orders where short_id = candidate);
      attempts := attempts + 1;
      if attempts > 10 then
        raise exception 'No se pudo generar short_id único tras 10 intentos';
      end if;
    end loop;
    new.short_id := candidate;
  end if;
  return new;
end;
$$;

create trigger trg_orders_short_id
  before insert on public.orders
  for each row execute function public.ensure_order_short_id();

-- Generar delivery_maps_url automáticamente si hay delivery_coordinates
create or replace function public.generate_delivery_maps_url()
returns trigger
language plpgsql
as $$
declare
  lat numeric;
  lng numeric;
begin
  if new.delivery_coordinates is not null then
    lat := st_y(new.delivery_coordinates::geometry);
    lng := st_x(new.delivery_coordinates::geometry);
    new.delivery_maps_url :=
      'https://www.google.com/maps/dir/?api=1&destination=' ||
      trim(to_char(lat, 'FM990.0000000')) || ',' ||
      trim(to_char(lng, 'FM990.0000000')) ||
      '&travelmode=driving';
  end if;
  return new;
end;
$$;

create trigger trg_orders_maps_url
  before insert or update of delivery_coordinates on public.orders
  for each row execute function public.generate_delivery_maps_url();

-- Mantener sincronizada la fila driver_availability al crear un driver
create or replace function public.ensure_driver_availability()
returns trigger
language plpgsql
as $$
begin
  insert into public.driver_availability (driver_id, is_available)
  values (new.id, false)
  on conflict (driver_id) do nothing;
  return new;
end;
$$;

create trigger trg_drivers_ensure_availability
  after insert on public.drivers
  for each row execute function public.ensure_driver_availability();

-- Notificar pg_net de domain_events pendientes
create or replace function public.notify_domain_event()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify('domain_events', json_build_object(
    'id', new.id,
    'aggregateType', new.aggregate_type,
    'eventType', new.event_type
  )::text);
  return new;
end;
$$;

create trigger trg_domain_events_notify
  after insert on public.domain_events
  for each row execute function public.notify_domain_event();
