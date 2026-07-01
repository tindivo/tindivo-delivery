CREATE OR REPLACE FUNCTION public.trg_orders_reactive_ready_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_delay_seconds int;
  v_pgmq_enabled boolean;
  v_reactive_enabled boolean;
-- @ts-ignore
BEGIN
  -- Precondiciones comunes: pedido debe estar en estado válido
  IF new.status <> 'waiting_driver' OR new.driver_id IS NOT NULL THEN
    RETURN new;
  END IF;

  v_reactive_enabled := COALESCE(public.get_app_setting('push_reactive_trigger_enabled'), 'false') = 'true';
  v_pgmq_enabled := COALESCE(public.get_app_setting('push_pgmq_scheduling_enabled'), 'false') = 'true';

  -- CASO 1: pedido maduro (ya debería estar en cola) — lógica original
  IF new.appears_in_queue_at <= (now() + interval '5 seconds') THEN
    IF NOT v_reactive_enabled THEN
      RETURN new;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.domain_events de
      WHERE de.aggregate_id = new.id
        AND de.event_type = 'OrderReadyForDrivers'
    ) THEN
      INSERT INTO public.domain_events (aggregate_type, aggregate_id, event_type, payload)
      VALUES (
        'Order', new.id, 'OrderReadyForDrivers',
        jsonb_build_object(
          'orderId', new.id,
          'shortId', new.short_id,
          'restaurantId', new.restaurant_id,
          'orderAmount', new.order_amount,
          'appearsInQueueAt', new.appears_in_queue_at
        )
      );
    END IF;
    RETURN new;
  END IF;

  -- CASO 2: pedido con delay futuro >30s — encolar en pgmq si flag ON
  IF v_pgmq_enabled AND new.appears_in_queue_at > (now() + interval '30 seconds') THEN
    v_delay_seconds := EXTRACT(epoch FROM (new.appears_in_queue_at - now()))::int;

    -- Envuelto en block con exception para NUNCA abortar el INSERT/UPDATE del pedido
    BEGIN
      PERFORM pgmq.send(
        'orders_ready_for_drivers',
        jsonb_build_object(
          'orderId', new.id,
          'shortId', new.short_id,
          'restaurantId', new.restaurant_id,
          'orderAmount', new.order_amount,
          'appearsInQueueAt', new.appears_in_queue_at,
          'enqueuedAt', now()
        ),
        v_delay_seconds
      );
    EXCEPTION WHEN OTHERS THEN
      -- No abortamos la transacción del pedido. El cron failsafe cubrirá.
      RAISE WARNING 'pgmq.send failed for order %: %', new.id, sqlerrm;
    END;
  END IF;

  -- CASO 3: zona muerta (5s-30s) — cron failsafe se encarga
  RETURN new;
END;
$$;
