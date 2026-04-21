-- ═══════════════════════════════════════════════════════════════════
-- 20260420_003 — Tabla restaurants
-- ═══════════════════════════════════════════════════════════════════

create table public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.users(id) on delete restrict,
  name          text not null,
  phone         text not null,
  address       text not null,
  yape_number   text,
  qr_url        text,
  accent_color  char(6) not null unique check (accent_color ~ '^[0-9a-fA-F]{6}$'),
  is_active     boolean not null default true,
  is_blocked    boolean not null default false,
  block_reason  text,
  balance_due   numeric(10, 2) not null default 0 check (balance_due >= 0),
  coordinates   geography(point, 4326),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_restaurants_active_blocked on public.restaurants (is_active, is_blocked);
create index idx_restaurants_balance on public.restaurants (balance_due) where balance_due > 0;

comment on table public.restaurants is 'Restaurantes/negocios afiliados al servicio.';
comment on column public.restaurants.accent_color is 'Color hex (6 chars sin #) único para identificar visualmente al restaurante.';
comment on column public.restaurants.balance_due is 'Deuda acumulada por comisiones aún no liquidadas.';
