-- ════════════════════════════════════════════════════════════════
-- 20260426_120 — Cleanup retroactivo de push_subscriptions
-- ════════════════════════════════════════════════════════════════
--
-- Antes de cambiar la unique constraint a `endpoint` global, limpiamos:
--  1. Duplicados: si el mismo endpoint está asociado a >1 user_id (caso
--     B inicia sesión en device de A sin cleanup), conservamos el más
--     reciente. Esto evita que la siguiente migration falle.
--  2. Stale: subs sin éxito en 14 días, o creadas hace >7 días sin
--     last_success_at. AutoHeal del cliente las regenera al próximo
--     checkStatus si el user sigue activo en ese device.
--
-- Idempotente: re-ejecutar es seguro.

delete from public.push_subscriptions a
using public.push_subscriptions b
where a.endpoint = b.endpoint
  and a.id <> b.id
  and a.created_at < b.created_at;

delete from public.push_subscriptions
where (last_success_at < now() - interval '14 days')
   or (last_success_at is null and created_at < now() - interval '7 days');
