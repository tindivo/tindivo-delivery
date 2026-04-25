-- ═══════════════════════════════════════════════════════════════════
-- 20260425_001 — Tabla app_settings (key-value de configuración global)
--
-- Settings que el admin puede editar desde el dashboard sin redeploy.
-- Primer caso de uso: el número de teléfono de soporte Tindivo que se
-- muestra al restaurante cuando un pedido queda urgente sin driver.
-- Diseño key-value para permitir agregar más settings sin migrations.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

comment on table public.app_settings is 'Configuración global editable por admin (key-value).';
comment on column public.app_settings.key is 'Identificador único del setting (snake_case).';
comment on column public.app_settings.value is 'Valor del setting como texto. El cliente parsea según convención por key.';

-- Trigger para mantener updated_at fresco.
create or replace function public.set_app_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_app_settings_updated_at();

-- RLS: cualquiera autenticado puede leer (los settings son públicos en
-- intención: número de soporte, etc). Solo admin puede modificar.
alter table public.app_settings enable row level security;

drop policy if exists "app_settings select all auth" on public.app_settings;
create policy "app_settings select all auth" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings select anon" on public.app_settings;
create policy "app_settings select anon" on public.app_settings
  for select to anon using (true);

drop policy if exists "app_settings admin upsert" on public.app_settings;
create policy "app_settings admin upsert" on public.app_settings
  for insert to authenticated
  with check (public.current_user_role() = 'admin'::user_role);

drop policy if exists "app_settings admin update" on public.app_settings;
create policy "app_settings admin update" on public.app_settings
  for update to authenticated
  using (public.current_user_role() = 'admin'::user_role)
  with check (public.current_user_role() = 'admin'::user_role);

-- Seed inicial: support_phone vacío para que admin lo configure.
insert into public.app_settings (key, value)
values ('support_phone', '')
on conflict (key) do nothing;
