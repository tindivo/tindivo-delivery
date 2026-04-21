-- ═══════════════════════════════════════════════════════════════════
-- 20260420_005 — Tabla orders (agregado central)
-- ═══════════════════════════════════════════════════════════════════

create table public.orders (
  id                              uuid primary key default gen_random_uuid(),
  short_id                        text not null unique check (char_length(short_id) = 8),
  restaurant_id                   uuid not null references public.restaurants(id) on delete restrict,
  driver_id                       uuid references public.drivers(id) on delete set null,
  status                          public.order_status not null default 'waiting_driver',
  prep_time_option                public.prep_time_option not null,
  estimated_ready_at              timestamptz not null,
  appears_in_queue_at             timestamptz not null,
  order_amount                    numeric(10, 2) not null check (order_amount >= 0),
  delivery_fee                    numeric(10, 2) not null default 1.00 check (delivery_fee >= 0),
  payment_status                  public.payment_status not null,
  client_pays_with                numeric(10, 2) check (client_pays_with is null or client_pays_with >= 0),
  change_to_give                  numeric(10, 2) check (change_to_give is null or change_to_give >= 0),
  client_phone                    text,
  delivery_coordinates            geography(point, 4326),
  delivery_maps_url               text,
  delivery_address                text,
  restaurant_coordinates_cache    geography(point, 4326),
  tracking_link_sent_at           timestamptz,
  tracking_link_sent_by           uuid references public.users(id) on delete set null,
  accepted_at                     timestamptz,
  heading_at                      timestamptz,
  waiting_at                      timestamptz,
  picked_up_at                    timestamptz,
  delivered_at                    timestamptz,
  cancelled_at                    timestamptz,
  cancel_reason                   text,
  cancel_reason_code              text,
  extension_used                  boolean not null default false,
  ready_early_used                boolean not null default false,
  notes                           text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index idx_orders_restaurant on public.orders (restaurant_id, created_at desc);
create index idx_orders_driver on public.orders (driver_id, created_at desc) where driver_id is not null;
create index idx_orders_status on public.orders (status);
create index idx_orders_waiting_driver on public.orders (appears_in_queue_at) where status = 'waiting_driver';
create index idx_orders_active on public.orders (status, created_at desc)
  where status in ('waiting_driver','heading_to_restaurant','waiting_at_restaurant','picked_up');
create index idx_orders_short_id on public.orders (short_id);
create index idx_orders_delivered_at on public.orders (delivered_at desc) where delivered_at is not null;
create index idx_orders_tracking_pending on public.orders (id) where status = 'picked_up' and tracking_link_sent_at is null;

comment on table public.orders is 'Pedidos — agregado central del dominio.';
comment on column public.orders.short_id is 'ID de 8 caracteres alfanuméricos para tracking público.';
comment on column public.orders.appears_in_queue_at is 'Cuándo el pedido se vuelve visible en la bandeja de drivers.';
comment on column public.orders.delivery_maps_url is 'URL de Google Maps Directions pre-generada con las coords del destino.';
