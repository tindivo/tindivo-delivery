-- Asignación de restaurantes a motorizados (M:N).
--
-- Hasta ahora la auto-asignación de pedidos consideraba a TODOS los drivers
-- activos como candidatos para cualquier restaurante (con un bonus suave por
-- "mismo restaurante en ventana de 8 min"). Para escalar a múltiples
-- restaurantes con flotas dedicadas, necesitamos restringir explícitamente
-- qué drivers pueden tomar pedidos de qué restaurantes.
--
-- Modelo: tabla pivote driver_restaurants. Solo los drivers que tengan al
-- menos una fila en esta tabla con el restaurant_id del pedido serán
-- candidatos en findAssignmentCandidates.

create table if not exists public.driver_restaurants (
  driver_id     uuid not null references public.drivers(id)     on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (driver_id, restaurant_id)
);

comment on table public.driver_restaurants is
  'Restaurantes que cada motorizado puede atender. La auto-asignación filtra candidates por esta tabla.';

create index if not exists idx_driver_restaurants_restaurant
  on public.driver_restaurants(restaurant_id);

-- RLS: admin lee/escribe libremente; driver solo lee sus propias filas;
-- restaurant lee filas que apuntan a su restaurant_id (para mostrar quiénes
-- pueden atenderle, futuro).
alter table public.driver_restaurants enable row level security;

drop policy if exists driver_restaurants_admin_all on public.driver_restaurants;
create policy driver_restaurants_admin_all on public.driver_restaurants
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists driver_restaurants_driver_read on public.driver_restaurants;
create policy driver_restaurants_driver_read on public.driver_restaurants
  for select using (driver_id = public.current_driver_id());

drop policy if exists driver_restaurants_restaurant_read on public.driver_restaurants;
create policy driver_restaurants_restaurant_read on public.driver_restaurants
  for select using (restaurant_id = public.current_restaurant_id());

-- Bootstrap: para no romper la operación actual (3 drivers, 2 restaurantes
-- activos), asignar TODOS los drivers existentes a TODOS los restaurantes
-- existentes. El admin luego puede ajustar manualmente.
insert into public.driver_restaurants(driver_id, restaurant_id)
select d.id, r.id
from public.drivers d
cross join public.restaurants r
where r.is_active = true and d.is_active = true
on conflict do nothing;
