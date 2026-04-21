-- ═══════════════════════════════════════════════════════════════════
-- 20260420_100 — Funciones auxiliares
-- ═══════════════════════════════════════════════════════════════════

-- Rol del usuario autenticado actual
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

grant execute on function public.current_user_role() to anon, authenticated;

-- Restaurant_id del usuario actual (si es restaurant)
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.restaurants where user_id = auth.uid();
$$;

grant execute on function public.current_restaurant_id() to authenticated;

-- Driver_id del usuario actual (si es driver)
create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where user_id = auth.uid();
$$;

grant execute on function public.current_driver_id() to authenticated;

-- Tracking público por shortId
create or replace function public.get_tracking(p_short_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'shortId',                o.short_id,
    'status',                 o.status,
    'restaurantName',         r.name,
    'restaurantAccentColor',  r.accent_color,
    'driverFirstName',        case
                                when d.full_name is not null
                                then split_part(d.full_name, ' ', 1)
                                else null
                              end,
    'driverVehicleType',      d.vehicle_type,
    'estimatedReadyAt',       o.estimated_ready_at,
    'pickedUpAt',             o.picked_up_at,
    'deliveredAt',            o.delivered_at,
    'cancelledAt',            o.cancelled_at,
    'deliveryCoordinates',    case
                                when o.delivery_coordinates is not null
                                then jsonb_build_object(
                                  'lat', st_y(o.delivery_coordinates::geometry),
                                  'lng', st_x(o.delivery_coordinates::geometry)
                                )
                                else null
                              end
  )
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  left join public.drivers d on d.id = o.driver_id
  where o.short_id = p_short_id
    and (o.delivered_at is null or o.delivered_at > now() - interval '24 hours')
    and (o.cancelled_at is null or o.cancelled_at > now() - interval '24 hours');
$$;

grant execute on function public.get_tracking(text) to anon, authenticated;

-- Generar short_id alfanumérico de 8 chars (sin I/O/0/1)
create or replace function public.generate_short_id()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

grant execute on function public.generate_short_id() to authenticated;
