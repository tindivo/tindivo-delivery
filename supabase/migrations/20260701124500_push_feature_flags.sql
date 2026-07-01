-- ═══════════════════════════════════════════════════════════════════
-- 20260701124500 — push_feature_flags
-- ═══════════════════════════════════════════════════════════════════
--
-- Inserta 3 feature flags en la tabla app_settings con valor inicial 'false'.
-- Crea la función helper public.get_app_setting(p_key text) para consultarlos.
--

-- Helper para obtener configuración global de forma segura
create or replace function public.get_app_setting(p_key text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_value text;
begin
  select value into v_value
  from public.app_settings
  where key = p_key;
  return v_value;
exception
  when others then
    return null;
end;
$$;

comment on function public.get_app_setting(text) is
  'Obtiene el valor de un setting de app_settings por su key. Retorna NULL en caso de error.';

-- Sembrar feature flags para notificaciones push
insert into public.app_settings (key, value)
values 
  ('push_reactive_trigger_enabled', 'false'),
  ('push_safety_net_cron_enabled', 'false'),
  ('push_urgent_notification_enabled', 'false')
on conflict (key) do nothing;
