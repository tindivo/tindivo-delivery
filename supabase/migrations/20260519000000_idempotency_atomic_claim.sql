-- Idempotencia atomica: claim-with-placeholder pattern (Stripe-style).
--
-- Resuelve el TOCTOU race condition del helper actual `withIdempotency`:
-- el flujo SELECT->handler->INSERT permite que dos requests paralelos con
-- la misma key vean cache vacio, ejecuten ambos handlers y creen dos
-- pedidos en BD. Patron observado en produccion incluso despues del fix de
-- idempotencia (Laly Vidal 7.8s/28.1s, Flor De Liz 3.7s post-deploy 2026-05-13).
--
-- Nuevo flujo:
--   1. `claim_idempotency_key` hace INSERT ON CONFLICT DO NOTHING con un
--      placeholder (response_status=0). El INSERT atomico actua como mutex
--      gracias a la PK compuesta (key, scope).
--   2. El ganador del INSERT recibe outcome='reserved' y ejecuta el handler.
--   3. Las requests perdedoras reciben:
--      - 'cached'    si hay respuesta final (response_status > 0).
--      - 'in_flight' si el handler aun esta procesando (response_status = 0)
--        -> caller hace polling hasta ver response_status > 0.
--      - 'mismatch'  si el request_hash difiere (409).
--   4. Al terminar, el ganador llama `finalize_idempotency_key` (UPDATE).
--   5. Si el handler falla con 5xx (transient) o lanza, el caller llama
--      `release_idempotency_key` para borrar el placeholder, permitiendo
--      retry seguro con la misma key.
--
-- Recovery automatica: si un handler crashea sin liberar (worker killed,
-- timeout de Vercel, etc.), `claim_idempotency_key` borra placeholders
-- abandonados (`response_status=0` con created_at < now() - 5min) antes
-- de intentar reservar. Asi la key no queda bloqueada las 24h hasta el
-- prune diario.

-- ============================================================================
-- claim_idempotency_key: reserva atomica + diagnostico
-- ============================================================================
create or replace function public.claim_idempotency_key(
  p_key text,
  p_scope text,
  p_request_hash text
)
returns table (
  outcome text,
  cached_status integer,
  cached_body jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_inserted integer;
begin
  -- Limpiar placeholders abandonados (handler crasheado / lambda timeout).
  -- Solo afecta filas con response_status=0 (in-flight stale), no las cacheadas.
  delete from public.idempotency_keys
  where key = p_key
    and scope = p_scope
    and response_status = 0
    and created_at < now() - interval '5 minutes';

  -- Reserva atomica via INSERT ON CONFLICT. La PK (key, scope) garantiza que
  -- exactamente una request gana el insert.
  insert into public.idempotency_keys (
    key, scope, request_hash, response_status, response_body
  ) values (
    p_key, p_scope, p_request_hash, 0, '{}'::jsonb
  )
  on conflict (key, scope) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    -- Gane la reserva. Soy el primero, debo ejecutar el handler.
    return query select 'reserved'::text, 0, '{}'::jsonb;
    return;
  end if;

  -- Ya existia. Diagnosticar y devolver estado.
  return query
  select
    case
      when ik.request_hash <> p_request_hash then 'mismatch'
      when ik.response_status = 0           then 'in_flight'
      else 'cached'
    end::text,
    ik.response_status,
    ik.response_body
  from public.idempotency_keys ik
  where ik.key = p_key and ik.scope = p_scope;
end;
$function$;

comment on function public.claim_idempotency_key(text, text, text) is
  'Atomic claim para idempotencia tipo Stripe. Outcome: reserved (caller ejecuta), cached (respuesta lista), in_flight (otro request procesando, caller hace polling), mismatch (mismo key con body distinto, 409). Limpia placeholders >5min antes de reservar.';

-- ============================================================================
-- finalize_idempotency_key: persistir respuesta final
-- ============================================================================
create or replace function public.finalize_idempotency_key(
  p_key text,
  p_scope text,
  p_response_status integer,
  p_response_body jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $function$
  update public.idempotency_keys
  set response_status = p_response_status,
      response_body   = p_response_body
  where key = p_key and scope = p_scope and response_status = 0;
$function$;

comment on function public.finalize_idempotency_key(text, text, integer, jsonb) is
  'Actualiza el placeholder reservado con la respuesta final. Solo afecta filas con response_status=0 (la del propio caller).';

-- ============================================================================
-- release_idempotency_key: liberar placeholder en fallo 5xx / throw
-- ============================================================================
create or replace function public.release_idempotency_key(
  p_key text,
  p_scope text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $function$
  delete from public.idempotency_keys
  where key = p_key and scope = p_scope and response_status = 0;
$function$;

comment on function public.release_idempotency_key(text, text) is
  'Borra el placeholder si el handler fallo con 5xx o lanzo. Permite retry inmediato con la misma key (las 5xx no se cachean, mantiene contrato actual).';

-- ============================================================================
-- Grants: las API routes usan createAdminClient() = service_role.
-- ============================================================================
grant execute on function public.claim_idempotency_key(text, text, text)    to service_role;
grant execute on function public.finalize_idempotency_key(text, text, integer, jsonb) to service_role;
grant execute on function public.release_idempotency_key(text, text)         to service_role;

-- Negar a anon y authenticated explicitamente (defense-in-depth ante RLS bypass).
revoke execute on function public.claim_idempotency_key(text, text, text)    from anon, authenticated;
revoke execute on function public.finalize_idempotency_key(text, text, integer, jsonb) from anon, authenticated;
revoke execute on function public.release_idempotency_key(text, text)         from anon, authenticated;
