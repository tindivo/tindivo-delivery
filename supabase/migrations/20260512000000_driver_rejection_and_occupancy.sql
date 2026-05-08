-- Rechazo de asignación + ocupación variable de mochila.
--
-- (a) `orders.occupancy_slots`: cuántos slots ocupa el pedido en la mochila
--     del driver. Default 1. El driver lo setea al recoger (markPickedUp).
--     Las reglas R3/R2 ahora suman slots en lugar de contar filas.
--
-- (b) `order_assignment_rejections`: cuándo y por qué un driver rechazó la
--     asignación de un pedido. El cron `assign-pending-orders` excluye a
--     los drivers presentes en esta tabla al re-asignar.
--
-- (c) `assignment_rules.maxOccupancySlotsPerOrder`: cap configurable
--     por admin (default 3). Define el máximo de slots permitido por pedido.

alter table public.orders
  add column occupancy_slots smallint not null default 1
  check (occupancy_slots between 1 and 10);

create table public.order_assignment_rejections (
  order_id    uuid not null references public.orders(id) on delete cascade,
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  reason      text not null,
  rejected_at timestamptz not null default now(),
  primary key (order_id, driver_id)
);
create index idx_oar_order on public.order_assignment_rejections(order_id);

update public.app_settings
set value = (value::jsonb || '{"maxOccupancySlotsPerOrder":3}'::jsonb)::text
where key = 'assignment_rules'
  and not (value::jsonb ? 'maxOccupancySlotsPerOrder');

alter table public.order_assignment_rejections enable row level security;

-- Driver dueño puede insertar/leer su propia rejection.
create policy oar_driver_insert on public.order_assignment_rejections
  for insert to authenticated
  with check (
    driver_id in (select id from public.drivers where user_id = auth.uid())
  );

create policy oar_driver_select on public.order_assignment_rejections
  for select to authenticated
  using (
    driver_id in (select id from public.drivers where user_id = auth.uid())
  );

-- Service role bypasea RLS (lo usan los use cases vía ServerClient).
