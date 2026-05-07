-- Auto-vinculación de driver_restaurants en INSERT.
--
-- La migration 20260504100000_driver_restaurants.sql hizo bootstrap UNA SOLA
-- VEZ (drivers × restaurants activos al momento del deploy). Si después se
-- crea un driver o un restaurante nuevo, NO se popula automáticamente la
-- tabla pivote y findAssignmentCandidates() retorna [] — el pedido queda
-- huérfano sin candidatos.
--
-- Solución: triggers AFTER INSERT que auto-vinculan al universo activo
-- existente. Si en el futuro se requieren flotas dedicadas, el admin
-- desvincula filas manualmente desde la futura UI.

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: nuevo driver → vincular a todos los restaurantes activos.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.link_new_driver_to_all_restaurants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active = false then
    return new;
  end if;

  insert into public.driver_restaurants (driver_id, restaurant_id)
  select new.id, r.id
  from public.restaurants r
  where r.is_active = true
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_drivers_auto_link_restaurants on public.drivers;
create trigger trg_drivers_auto_link_restaurants
  after insert on public.drivers
  for each row execute function public.link_new_driver_to_all_restaurants();

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: nuevo restaurante → vincular a todos los drivers activos.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.link_new_restaurant_to_all_drivers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active = false then
    return new;
  end if;

  insert into public.driver_restaurants (driver_id, restaurant_id)
  select d.id, new.id
  from public.drivers d
  where d.is_active = true
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_restaurants_auto_link_drivers on public.restaurants;
create trigger trg_restaurants_auto_link_drivers
  after insert on public.restaurants
  for each row execute function public.link_new_restaurant_to_all_drivers();

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: corregir restaurantes y drivers ya creados sin vínculos.
-- Idempotente: ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.driver_restaurants (driver_id, restaurant_id)
select d.id, r.id
from public.drivers d
cross join public.restaurants r
where r.is_active = true and d.is_active = true
on conflict do nothing;
