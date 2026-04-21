-- ═══════════════════════════════════════════════════════════════════
-- 20260420_002 — Tabla users (proxy de auth.users)
-- ═══════════════════════════════════════════════════════════════════

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  role        public.user_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_users_role on public.users (role);
create index idx_users_email on public.users (email);

comment on table public.users is 'Proxy de auth.users con rol y flags del dominio Tindivo.';
