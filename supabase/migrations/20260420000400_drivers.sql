-- ═══════════════════════════════════════════════════════════════════
-- 20260420_004 — Tabla drivers + driver_availability
-- ═══════════════════════════════════════════════════════════════════

create table public.drivers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.users(id) on delete restrict,
  full_name       text not null,
  phone           text not null,
  vehicle_type    public.vehicle_type not null default 'moto',
  license_plate   text,
  operating_days  text[] not null default '{}',
  shift_start     time not null default '18:00',
  shift_end       time not null default '23:00',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_drivers_active on public.drivers (is_active);

create table public.driver_availability (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null unique references public.drivers(id) on delete cascade,
  is_available  boolean not null default false,
  updated_at    timestamptz not null default now()
);

create index idx_driver_availability_driver on public.driver_availability (driver_id);
create index idx_driver_availability_available on public.driver_availability (is_available) where is_available = true;

comment on table public.drivers is 'Motorizados (repartidores).';
comment on column public.drivers.operating_days is 'Array de días: mon,tue,wed,thu,fri,sat,sun.';
