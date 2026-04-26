-- ════════════════════════════════════════════════════════════════
-- 20260426_121 — push_subscriptions: endpoint globalmente único
-- ════════════════════════════════════════════════════════════════
--
-- Antes: unique (user_id, endpoint). Permitía que el mismo endpoint
-- (mismo browser en mismo device) tuviera filas con distintos user_id
-- → cuando user B inicia sesión en device de A sin pasar por
-- fullSignOut, ambas filas convivían y A podía recibir notifications
-- destinadas a B (o viceversa).
--
-- Ahora: unique (endpoint). Un endpoint corresponde a un browser+device
-- y solo puede pertenecer a un user a la vez. El subscribe REST hace
-- DELETE de la fila previa con el mismo endpoint si pertenece a otro
-- user antes de UPSERT, y AutoHeal del cliente valida ownership con
-- /push/me y se re-suscribe si el server reporta `owned: false`.
--
-- Requiere que la migration de cleanup_stale haya corrido antes para
-- garantizar que no hay duplicados de endpoint.

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_endpoint_key;

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_unique unique (endpoint);
