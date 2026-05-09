-- Timeout de reservación del driver (R5 fix).
--
-- Problema: AutoAssignOrderUseCase setea driver_id=X pero el pedido sigue en
-- waiting_driver. El driver tiene que aceptar manualmente con `acceptBy`. Si
-- el driver IGNORA el pedido (no abre la app, no rechaza, no acepta), el
-- pedido queda reservado indefinidamente — ocupa slot en su mochila virtual
-- (`reservedSlots`) y bloquea su asignación a OTROS pedidos. Mientras tanto,
-- el restaurante y el cliente esperan sin saber que pasa.
--
-- Solución: tras 90s sin acceptBy, considerar el pedido como rechazado
-- por timeout — liberar driver_id y registrar el rechazo. El trigger
-- reactivo de la migration 20260513000100 (trg_orders_reactive_assign_aiu)
-- detecta el cambio driver_id IS NULL y dispara reasignación inmediata. El
-- INSERT en order_assignment_rejections también dispara el segundo trigger
-- (trg_rejections_reactive_assign_ai), garantizando que la siguiente
-- asignación excluye al driver que ignoró.

-- 1. Columna assigned_at: timestamp del último assignTo. Trigger la
--    mantiene en sync — no requiere cambios en el agregado de dominio.
alter table public.orders
  add column if not exists assigned_at timestamptz;

comment on column public.orders.assigned_at is
  'Timestamp del último driver assigned. Auto-mantenido por trigger trg_orders_set_assigned_at. Usado por timeout_unaccepted_assignments.';

-- Backfill: pedidos asignados HOY (waiting_driver con driver_id no nulo)
-- usan updated_at como aproximación. Pedidos antiguos quedan NULL → no
-- entran en el filtro del cron (which checks IS NOT NULL).
update public.orders
   set assigned_at = updated_at
 where status = 'waiting_driver'
   and driver_id is not null
   and assigned_at is null;

-- 2. Trigger: setea assigned_at cuando driver_id pasa de NULL a no-NULL.
--    Lo limpia (vuelve a NULL) cuando driver_id se libera, para que un
--    siguiente assignTo registre el nuevo timestamp.
create or replace function public.trg_set_assigned_at()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and new.driver_id is not null)
     or (tg_op = 'UPDATE' and old.driver_id is null and new.driver_id is not null)
     or (tg_op = 'UPDATE' and old.driver_id is distinct from new.driver_id and new.driver_id is not null)
  then
    new.assigned_at := now();
  elsif tg_op = 'UPDATE' and old.driver_id is not null and new.driver_id is null then
    new.assigned_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_set_assigned_at on public.orders;

create trigger trg_orders_set_assigned_at
  before insert or update of driver_id on public.orders
  for each row execute function public.trg_set_assigned_at();

create index if not exists idx_orders_assigned_timeout
  on public.orders (assigned_at)
  where status = 'waiting_driver' and driver_id is not null;

-- 3. Función timeout: encuentra reservaciones >90s sin aceptación.
--    INSERT order_assignment_rejections con reason='timeout_no_acceptance'.
--    UPDATE orders SET driver_id=NULL, assigned_at=NULL.
--    Los triggers reactivos de la migration 20260513000100 disparan la
--    re-asignación al siguiente driver elegible (excluyendo al que ignoró).
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
      and assigned_at < now() - interval '90 seconds'
    for update skip locked
  loop
    insert into public.order_assignment_rejections (order_id, driver_id, reason, rejected_at)
    values (r.id, r.driver_id, 'timeout_no_acceptance', now())
    on conflict (order_id, driver_id) do update set
      reason = excluded.reason,
      rejected_at = excluded.rejected_at;

    -- assigned_at se limpia automáticamente por trg_orders_set_assigned_at
    update public.orders
       set driver_id = null,
           updated_at = now()
     where id = r.id;
  end loop;
end;
$$;

comment on function public.timeout_unaccepted_assignments() is
  'Libera reservaciones de driver mayores a 90s sin acceptBy. Insert en order_assignment_rejections + UPDATE driver_id=NULL dispara los triggers reactivos para reasignar al instante. Configurable en futuro vía assignment_rules.assignmentTimeoutSeconds.';

-- 4. Cron cada 30s. Usamos pg_cron con expression de minuto + sleep
--    porque pg_cron no resuelve a segundo en Supabase. Alternativa simple:
--    correr cada minuto pero el sleep no es necesario aquí — el peor caso
--    es 60s de retraso sobre el SLA de 90s, total 150s antes de reasignar.
--    Para escalar a sub-minuto se moverá a un trigger BEFORE UPDATE en otro
--    PR (con timestamp programado vía LISTEN/NOTIFY).
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'timeout-unaccepted-assignments';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  perform cron.schedule(
    'timeout-unaccepted-assignments',
    '* * * * *',
    $sql$ select public.timeout_unaccepted_assignments(); $sql$
  );
end $$;
