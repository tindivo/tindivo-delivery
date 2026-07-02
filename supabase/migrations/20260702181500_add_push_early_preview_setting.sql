-- ═══════════════════════════════════════════════════════════════════
-- 20260702181500 — add_push_early_preview_setting
-- ═══════════════════════════════════════════════════════════════════
--
-- Inserta la nueva setting push_early_preview_enabled con valor por defecto
-- 'false' para permitir el despliegue seguro y coexistencia temporal del
-- nuevo flujo de avisos tempranos (Fase 4).
--

insert into public.app_settings (key, value)
values (
  'push_early_preview_enabled',
  'false'
)
on conflict (key) do nothing;
