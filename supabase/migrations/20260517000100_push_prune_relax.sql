-- ════════════════════════════════════════════════════════════════
-- 20260517_001 — Relajar prune_stale_push_subscriptions
-- ════════════════════════════════════════════════════════════════
--
-- La versión anterior borraba suscripciones con `last_success_at IS NULL
-- AND created_at < 7d` sin importar si jamás se intentó enviarles algo.
-- Eso esconde bugs: si hay otro problema que impide el primer éxito
-- (ej. iOS revoke por silent push, payload corrupto, bug en send-push),
-- las subs siempre quedan NULL → cron las borra a los 7d → cliente
-- auto-heal re-suscribe → cron las borra → ciclo infinito sin push.
--
-- Nueva regla: solo borrar subs que (a) tuvieron éxito y se "enfriaron"
-- (>14d sin success), o (b) acumularon fallos visibles (>7d sin success
-- y consecutive_failures > 0). Una sub recién creada que nunca recibió
-- intentos queda hasta los 7d, y solo se borra si efectivamente falló.
-- Cuando el cliente vuelve a re-suscribir, mantiene la fila reciente.

create or replace function public.prune_stale_push_subscriptions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.push_subscriptions
  where (last_success_at < now() - interval '14 days')
     or (
       last_success_at is null
       and created_at < now() - interval '7 days'
       and consecutive_failures > 0
     );
end;
$$;

comment on function public.prune_stale_push_subscriptions is
  'Purga subs con last_success>14d, o subs >7d sin éxito Y con fallos acumulados.';
