-- ═══════════════════════════════════════════════════════════════════
-- 20260701125500 — claim_domain_events_rpc
-- ═══════════════════════════════════════════════════════════════════
--
-- Crea la función public.claim_pending_domain_events para reclamar y bloquear
-- eventos pendientes de manera atómica con SKIP LOCKED, evitando condiciones de carrera.
--

create or replace function public.claim_pending_domain_events(p_limit int default 50)
returns setof public.domain_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.domain_events
  set status = 'processing'
  where id in (
    select id
    from public.domain_events
    where published_at is null
      and status = 'pending'
    order by occurred_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

comment on function public.claim_pending_domain_events(int) is
  'Bloquea y reclama de forma atómica eventos pendientes cambiando su estado a processing (skip locked).';
