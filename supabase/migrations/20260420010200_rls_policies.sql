-- ═══════════════════════════════════════════════════════════════════
-- 20260420_102 — Row Level Security Policies
-- ═══════════════════════════════════════════════════════════════════

alter table public.users                enable row level security;
alter table public.restaurants          enable row level security;
alter table public.drivers              enable row level security;
alter table public.driver_availability  enable row level security;
alter table public.orders               enable row level security;
alter table public.order_status_history enable row level security;
alter table public.cash_settlements     enable row level security;
alter table public.settlements          enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.domain_events        enable row level security;
alter table public.admin_alerts         enable row level security;

-- ─────────── users ───────────
create policy users_self_read on public.users
  for select using (id = auth.uid() or public.current_user_role() = 'admin');

create policy users_admin_all on public.users
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ─────────── restaurants ───────────
create policy restaurants_self_read on public.restaurants
  for select using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'driver'
      and exists (
        select 1 from public.orders
        where orders.restaurant_id = restaurants.id
          and orders.driver_id = public.current_driver_id()
      )
    )
  );

create policy restaurants_self_update on public.restaurants
  for update using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy restaurants_admin_insert on public.restaurants
  for insert with check (public.current_user_role() = 'admin');

create policy restaurants_admin_delete on public.restaurants
  for delete using (public.current_user_role() = 'admin');

-- ─────────── drivers ───────────
create policy drivers_self_read on public.drivers
  for select using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'restaurant'
      and exists (
        select 1 from public.orders
        where orders.driver_id = drivers.id
          and orders.restaurant_id = public.current_restaurant_id()
      )
    )
  );

create policy drivers_self_update on public.drivers
  for update using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy drivers_admin_insert on public.drivers
  for insert with check (public.current_user_role() = 'admin');

create policy drivers_admin_delete on public.drivers
  for delete using (public.current_user_role() = 'admin');

-- ─────────── driver_availability ───────────
create policy driver_avail_read on public.driver_availability
  for select using (
    driver_id = public.current_driver_id()
    or public.current_user_role() = 'admin'
    or public.current_user_role() = 'restaurant'
  );

create policy driver_avail_self_update on public.driver_availability
  for update using (driver_id = public.current_driver_id() or public.current_user_role() = 'admin');

create policy driver_avail_insert on public.driver_availability
  for insert with check (public.current_user_role() = 'admin' or driver_id = public.current_driver_id());

-- ─────────── orders ───────────
create policy orders_restaurant_read on public.orders
  for select using (
    restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or public.current_user_role() = 'admin'
    or (public.current_user_role() = 'driver' and status = 'waiting_driver')
  );

create policy orders_restaurant_insert on public.orders
  for insert with check (
    restaurant_id = public.current_restaurant_id()
    and public.current_user_role() = 'restaurant'
  );

create policy orders_update_by_actor on public.orders
  for update using (
    public.current_user_role() = 'admin'
    or restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or (public.current_user_role() = 'driver' and status = 'waiting_driver')
  );

-- ─────────── order_status_history ───────────
create policy order_status_history_read on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (
          o.restaurant_id = public.current_restaurant_id()
          or o.driver_id = public.current_driver_id()
          or public.current_user_role() = 'admin'
        )
    )
  );

-- ─────────── cash_settlements ───────────
create policy cash_settlements_read on public.cash_settlements
  for select using (
    restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or public.current_user_role() = 'admin'
  );

create policy cash_settlements_update on public.cash_settlements
  for update using (
    restaurant_id = public.current_restaurant_id()
    or driver_id = public.current_driver_id()
    or public.current_user_role() = 'admin'
  );

create policy cash_settlements_insert on public.cash_settlements
  for insert with check (
    public.current_user_role() = 'admin'
    or driver_id = public.current_driver_id()
  );

-- ─────────── settlements ───────────
create policy settlements_read on public.settlements
  for select using (
    restaurant_id = public.current_restaurant_id() or public.current_user_role() = 'admin'
  );

create policy settlements_admin_all on public.settlements
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ─────────── push_subscriptions ───────────
create policy push_subs_self on public.push_subscriptions
  for all using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid());

-- ─────────── admin_alerts ───────────
create policy admin_alerts_admin on public.admin_alerts
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ─────────── domain_events ───────────
-- Sin policies: solo service_role puede leer/escribir (bypassea RLS)
