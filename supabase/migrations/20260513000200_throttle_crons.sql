-- Bajar frecuencia de crons que ahora son cubiertos por triggers reactivos.
--
-- Estos crons pasan a ser FAILSAFE únicamente — recogen casos donde:
--   - pg_net falló al invocar el endpoint reactivo
--   - El endpoint estaba caído cuando ocurrió el evento
--   - El secret en vault no estaba configurado
--   - Un pedido tiene appears_in_queue_at en el futuro y cumple plazo entre triggers
--
-- Frecuencia 5min es aceptable como red de seguridad. Los pedidos en flujo
-- normal se asignan en <1s vía triggers (Fase 2). Si triggers fallan, el
-- failsafe limita la latencia a 5min en vez de los 1min anteriores.
--
-- IMPORTANTE: NO se modifica `auto-cancel-pending-acceptance`. Este cron
-- materializa el SLA "5min sin aceptar = cancelar"; convertirlo en reactivo
-- requiere delay queue (BullMQ/Redis) que no aporta UX vs cron de 1min.

-- assign-pending-orders (era cada 1 min) → cada 5 min como failsafe
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'assign-pending-orders';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  select jobid into v_jobid from cron.job where jobname = 'assign-pending-orders-failsafe';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  perform cron.schedule(
    'assign-pending-orders-failsafe',
    '*/5 * * * *',
    $sql$ select public.invoke_assign_pending_orders(); $sql$
  );
end $$;

-- enqueue-orders-ready-for-drivers (era cada 1 min) → cada 5 min
-- (cuando appears_in_queue_at <= now y no hay evento OrderReadyForDrivers,
-- emite el evento). El trigger reactivo no cubre este caso porque no hay
-- evento Postgres que dispare al cumplirse appears_in_queue_at en el futuro.
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'enqueue-orders-ready-for-drivers';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  select jobid into v_jobid from cron.job where jobname = 'enqueue-orders-ready-for-drivers-failsafe';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  perform cron.schedule(
    'enqueue-orders-ready-for-drivers-failsafe',
    '*/5 * * * *',
    $sql$ select public.enqueue_orders_ready_for_drivers(); $sql$
  );
end $$;

-- enqueue-overdue-orders (era cada 1 min) → cada 5 min
-- Notifica drivers cuando el pedido pasó su estimated_ready_at sin asignación.
-- 5 min de gracia es suficiente para que el trigger reactivo lo asigne primero.
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'enqueue-overdue-orders';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  select jobid into v_jobid from cron.job where jobname = 'enqueue-overdue-orders-failsafe';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;

  perform cron.schedule(
    'enqueue-overdue-orders-failsafe',
    '*/5 * * * *',
    $sql$ select public.enqueue_overdue_orders(); $sql$
  );
end $$;
