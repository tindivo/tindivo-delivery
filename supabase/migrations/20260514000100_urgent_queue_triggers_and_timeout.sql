-- Cola "Urgente" — guards en triggers + drop trigger reasignación reactiva +
-- timeout 90s → 5min con urgent_since marca atómica.
--
-- Cambios de comportamiento:
--   1. Trigger `trg_orders_reactive_assign_aiu`: ahora SOLO dispara para
--      pedidos NO urgentes. Si un pedido es marcado urgent (driver_id=NULL +
--      urgent_since=now en el mismo UPDATE), el trigger NO invoca /assign-one
--      → el pedido queda en cola urgente para que cualquier driver lo tome
--      manualmente vía /claim.
--
--   2. Trigger `trg_rejections_reactive_assign_ai`: ELIMINADO. La nueva spec
--      es "cualquier rechazo (timeout O manual) → urgente". Por lo tanto,
--      la reasignación automática post-rechazo nunca debe ocurrir. El driver
--      que rechazó queda excluido por el TTL de 6h en order_assignment_rejections
--      cuando es ofrecido por reglas R1-R5 (futuras asignaciones de OTROS
--      pedidos). Los pedidos urgentes ignoran esta exclusión (vía endpoint
--      /available que NO filtra por rejections para el driver actual).
--
--   3. RPC `claim_pending_orders` (cron failsafe): agregar guard
--      `urgent_since IS NULL` para que el cron NO procese urgentes.
--
--   4. Cron `timeout_unaccepted_assignments`: cambia 90s → 5min y agrega
--      `urgent_since = now()` al UPDATE en el mismo statement → el pedido
--      queda atómicamente sin driver Y marcado urgent → el trigger reactivo
--      NO dispara (gracias al guard) → queda en cola urgente.

-- ============================================================================
-- 1. Modificar trg_orders_reactive_assign con guard urgent_since IS NULL
-- ============================================================================
create or replace function public.trg_orders_reactive_assign()
returns trigger
language plpgsql
as $$
begin
  if new.urgent_since is null
     and new.status = 'waiting_driver'
     and new.driver_id is null
     and new.appears_in_queue_at <= now()
     and (
       tg_op = 'INSERT'
       or old.status is distinct from new.status
       or old.driver_id is distinct from new.driver_id
       or old.appears_in_queue_at is distinct from new.appears_in_queue_at
     )
  then
    perform public.invoke_assign_one(new.id);
  end if;
  return new;
end;
$$;

-- ============================================================================
-- 2. Drop trg_rejections_reactive_assign_ai y su función
-- ============================================================================
drop trigger if exists trg_rejections_reactive_assign_ai on public.order_assignment_rejections;
drop function if exists public.trg_rejections_reactive_assign();

-- ============================================================================
-- 3. Modificar claim_pending_orders RPC con guard urgent_since IS NULL
-- ============================================================================
create or replace function public.claim_pending_orders(p_limit int default 50)
returns table(id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select o.id
  from public.orders o
  where o.status = 'waiting_driver'
    and o.driver_id is null
    and o.urgent_since is null  -- NUEVO: cron failsafe NO procesa urgentes
    and o.appears_in_queue_at <= now()
  order by o.appears_in_queue_at asc
  limit p_limit
  for update skip locked
$$;

-- ============================================================================
-- 4. timeout_unaccepted_assignments: 90s → 5min + urgent_since=now() atómico
-- ============================================================================
create or replace function public.timeout_unaccepted_assignments()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  for r in
    select id, driver_id
    from public.orders
    where status = 'waiting_driver'
      and driver_id is not null
      and assigned_at is not null
      and assigned_at < now() - interval '5 minutes'
    for update skip locked
  loop
    insert into public.order_assignment_rejections (order_id, driver_id, reason, rejected_at)
    values (r.id, r.driver_id, 'timeout_no_acceptance', now())
    on conflict (order_id, driver_id) do update set
      reason = excluded.reason,
      rejected_at = excluded.rejected_at;

    -- assigned_at se limpia automáticamente por trg_orders_set_assigned_at
    -- al setear driver_id=NULL. urgent_since=now() en el mismo UPDATE deja
    -- el pedido atómicamente en cola urgente; el trigger reactivo NO dispara
    -- gracias al guard `urgent_since IS NULL`.
    update public.orders
       set driver_id = null,
           urgent_since = now(),
           updated_at = now()
     where id = r.id;
  end loop;
end;
$$;

comment on function public.timeout_unaccepted_assignments() is
  'Libera reservaciones >5min sin acceptBy y manda el pedido a la cola urgente. Configurable en futuro vía assignment_rules.assignmentTimeoutSeconds. SLA real: 5..6min (cron corre cada 1min).';
