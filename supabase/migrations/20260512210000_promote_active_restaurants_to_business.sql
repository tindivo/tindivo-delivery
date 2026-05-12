-- Promueve los 8 restaurants activos no-test a multi-role business para que
-- el dueño use UNA sola credencial en delivery.tindivo.com y tindivo.com.
--
-- Para cada restaurant activo se crea su marketplace_business con datos
-- iniciales copiados (name, phone, address, accent_color), enlace
-- delivery_restaurant_id = self, is_published=false (el dueño decide
-- cuándo publicar), is_verified=true (verificado por admin). El user
-- recibe 'business' en roles[] preservando 'restaurant' como primero.

with target as (
  select r.id as restaurant_id, r.user_id, r.name, r.phone, r.address, r.accent_color
  from restaurants r
  where r.is_active = true
    and not exists (select 1 from marketplace_businesses mb where mb.user_id = r.user_id)
),
ins as (
  insert into marketplace_businesses
    (user_id, name, phone, address, accent_color, delivery_restaurant_id, is_active, is_published, is_verified)
  select user_id, name, phone, address, accent_color, restaurant_id, true, false, true
  from target
  returning user_id
)
update public.users u
set roles = ARRAY['restaurant','business']::text[]
from ins i
where u.id = i.user_id;
