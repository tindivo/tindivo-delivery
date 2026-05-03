-- Marcador de cuentas de prueba (admin-only).
--
-- Cuentas con is_test_account=true se excluyen de KPIs y dashboards admin
-- para no contaminar las métricas con tráfico de testing. La regla la aplica
-- el endpoint de daily-summary en memoria (no via RLS) para mantener visibles
-- los pedidos de test en el monitor en vivo cuando un admin está testeando.

alter table public.restaurants
  add column if not exists is_test_account boolean not null default false;

alter table public.drivers
  add column if not exists is_test_account boolean not null default false;

comment on column public.restaurants.is_test_account is
  'Si true, esta cuenta es de prueba interna y se excluye de los KPIs/dashboards de admin.';

comment on column public.drivers.is_test_account is
  'Si true, esta cuenta es de prueba interna y se excluye de los KPIs/dashboards de admin.';

-- Marca inicial de las cuentas test conocidas (idempotente vía join).
update public.restaurants r
  set is_test_account = true
  from public.users u
  where u.id = r.user_id and u.email = 'restaurant@tindivo.pe';

update public.drivers d
  set is_test_account = true
  from public.users u
  where u.id = d.user_id and u.email = 'driver@tindivo.pe';
