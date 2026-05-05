-- Customer PWA catalog + customer-origin orders.
--
-- Additive only: existing restaurant/driver/admin flows keep using orders as
-- the operational aggregate. The customer PWA stores the commercial cart in
-- child tables so drivers/restaurants can still operate from the same order.

create type public.order_source as enum ('restaurant_pwa', 'customer_pwa');

alter table public.orders
  add column source public.order_source not null default 'restaurant_pwa',
  add column customer_phone text,
  add column customer_address text,
  add column customer_location_accuracy_m double precision,
  add column customer_order_subtotal numeric(10, 2)
    check (customer_order_subtotal is null or customer_order_subtotal >= 0);

comment on column public.orders.source is
  'Origen del pedido: restaurante operativo o PWA pública de clientes.';
comment on column public.orders.customer_phone is
  'Teléfono capturado por la PWA de cliente. client_phone se mantiene para el flujo operativo del driver.';
comment on column public.orders.customer_address is
  'Dirección textual capturada por la PWA de cliente.';
comment on column public.orders.customer_order_subtotal is
  'Subtotal de productos del carrito, sin comisión/delivery_fee.';

create table public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 60),
  description   text,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_menu_categories_restaurant
  on public.menu_categories (restaurant_id, is_active, sort_order, name);

create table public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  category_id    uuid references public.menu_categories(id) on delete set null,
  name           text not null check (char_length(name) between 2 and 80),
  description    text,
  price          numeric(10, 2) not null check (price >= 0),
  image_url      text,
  prep_minutes   int check (prep_minutes is null or prep_minutes between 5 and 120),
  is_available   boolean not null default true,
  is_featured    boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_menu_items_restaurant
  on public.menu_items (restaurant_id, is_available, sort_order, name);
create index idx_menu_items_category
  on public.menu_items (category_id, is_available, sort_order, name);

create table public.menu_modifier_groups (
  id              uuid primary key default gen_random_uuid(),
  menu_item_id    uuid not null references public.menu_items(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 60),
  min_selected    int not null default 0 check (min_selected >= 0),
  max_selected    int not null default 1 check (max_selected >= 1),
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (max_selected >= min_selected)
);

create index idx_menu_modifier_groups_item
  on public.menu_modifier_groups (menu_item_id, is_active, sort_order);

create table public.menu_modifier_options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.menu_modifier_groups(id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 80),
  price_delta  numeric(10, 2) not null default 0 check (price_delta >= 0),
  is_available boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_menu_modifier_options_group
  on public.menu_modifier_options (group_id, is_available, sort_order, name);

create table public.customer_order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  menu_item_id   uuid references public.menu_items(id) on delete set null,
  item_name      text not null,
  quantity       int not null check (quantity > 0 and quantity <= 99),
  unit_price     numeric(10, 2) not null check (unit_price >= 0),
  modifiers_total numeric(10, 2) not null default 0 check (modifiers_total >= 0),
  line_total     numeric(10, 2) not null check (line_total >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_customer_order_items_order
  on public.customer_order_items (order_id);

create table public.customer_order_item_modifiers (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references public.customer_order_items(id) on delete cascade,
  group_name     text not null,
  option_name    text not null,
  price_delta    numeric(10, 2) not null default 0 check (price_delta >= 0),
  created_at     timestamptz not null default now()
);

create index idx_customer_order_item_modifiers_item
  on public.customer_order_item_modifiers (order_item_id);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_modifier_groups enable row level security;
alter table public.menu_modifier_options enable row level security;
alter table public.customer_order_items enable row level security;
alter table public.customer_order_item_modifiers enable row level security;

create policy menu_categories_public_read on public.menu_categories
  for select using (is_active = true);
create policy menu_items_public_read on public.menu_items
  for select using (is_available = true);
create policy menu_modifier_groups_public_read on public.menu_modifier_groups
  for select using (is_active = true);
create policy menu_modifier_options_public_read on public.menu_modifier_options
  for select using (is_available = true);

create policy menu_categories_admin_all on public.menu_categories
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy menu_items_admin_all on public.menu_items
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy menu_modifier_groups_admin_all on public.menu_modifier_groups
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy menu_modifier_options_admin_all on public.menu_modifier_options
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy customer_order_items_actor_read on public.customer_order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = customer_order_items.order_id
        and (
          o.restaurant_id = public.current_restaurant_id()
          or o.driver_id = public.current_driver_id()
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy customer_order_item_modifiers_actor_read on public.customer_order_item_modifiers
  for select using (
    exists (
      select 1
      from public.customer_order_items coi
      join public.orders o on o.id = coi.order_id
      where coi.id = customer_order_item_modifiers.order_item_id
        and (
          o.restaurant_id = public.current_restaurant_id()
          or o.driver_id = public.current_driver_id()
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy customer_order_items_admin_all on public.customer_order_items
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy customer_order_item_modifiers_admin_all on public.customer_order_item_modifiers
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create trigger set_updated_at_menu_categories
  before update on public.menu_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at_menu_items
  before update on public.menu_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at_menu_modifier_groups
  before update on public.menu_modifier_groups
  for each row execute function public.set_updated_at();
create trigger set_updated_at_menu_modifier_options
  before update on public.menu_modifier_options
  for each row execute function public.set_updated_at();
