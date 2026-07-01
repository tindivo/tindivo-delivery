CREATE OR REPLACE FUNCTION public.process_orders_ready_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_msg record;
  v_processed int := 0;
  v_emitted int := 0;
  v_discarded_duplicate int := 0;
  v_discarded_invalid_state int := 0;
  v_discarded_not_mature int := 0;
  v_order_id uuid;
  v_order record;
BEGIN
  -- Leer hasta 50 mensajes con visibility timeout de 30 seg
  FOR v_msg IN
    SELECT * FROM pgmq.read('orders_ready_for_drivers', 30, 50)
  LOOP
    v_processed := v_processed + 1;
    v_order_id := (v_msg.message->>'orderId')::uuid;

    -- Check 1: ¿ya existe evento OrderReadyForDrivers para este pedido?
    IF EXISTS (
      SELECT 1 FROM public.domain_events
      WHERE aggregate_id = v_order_id
        AND event_type = 'OrderReadyForDrivers'
    ) THEN
      PERFORM pgmq.delete('orders_ready_for_drivers', v_msg.msg_id);
      v_discarded_duplicate := v_discarded_duplicate + 1;
      CONTINUE;
    END IF;

    -- Cargar estado actual del pedido
    SELECT id, short_id, restaurant_id, order_amount, status, driver_id, appears_in_queue_at
    INTO v_order
    from public.orders
    where id = v_order_id;

    -- Check 2: ¿el pedido existe y sigue en estado válido?
    IF v_order.id IS NULL OR v_order.status <> 'waiting_driver' OR v_order.driver_id IS NOT NULL THEN
      PERFORM pgmq.delete('orders_ready_for_drivers', v_msg.msg_id);
      v_discarded_invalid_state := v_discarded_invalid_state + 1;
      CONTINUE;
    END IF;

    -- Check 3: ¿el pedido ya está maduro? (pudo haberse extendido)
    IF v_order.appears_in_queue_at > (now() + interval '5 seconds') THEN
      -- El mensaje maduró antes de tiempo (poco probable), o el pedido fue extendido.
      -- Descartamos: si fue extendido, el trigger UPDATE ya encoló mensaje nuevo.
      PERFORM pgmq.delete('orders_ready_for_drivers', v_msg.msg_id);
      v_discarded_not_mature := v_discarded_not_mature + 1;
      CONTINUE;
    END IF;

    -- Emitir el evento
    INSERT INTO public.domain_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES (
      'Order', v_order.id, 'OrderReadyForDrivers',
      jsonb_build_object(
        'orderId', v_order.id,
        'shortId', v_order.short_id,
        'restaurantId', v_order.restaurant_id,
        'orderAmount', v_order.order_amount,
        'appearsInQueueAt', v_order.appears_in_queue_at,
        'source', 'pgmq_worker'
      )
    );
    v_emitted := v_emitted + 1;

    -- Marcar mensaje como procesado
    PERFORM pgmq.delete('orders_ready_for_drivers', v_msg.msg_id);
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'emitted', v_emitted,
    'discarded_duplicate', v_discarded_duplicate,
    'discarded_invalid_state', v_discarded_invalid_state,
    'discarded_not_mature', v_discarded_not_mature
  );
END;
$$;
