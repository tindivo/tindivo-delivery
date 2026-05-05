-- Cron que auto-cancela pedidos pending_acceptance > 5 min sin respuesta
-- del restaurante. Protege la experiencia del cliente final: si el
-- restaurante no acepta a tiempo, el pedido se cancela y el cliente
-- recibe la notificación.
--
-- Diferencia clave con auto-cancel de drivers (que pueden tardar 20+ min en
-- aceptar): aquí 5 min porque el cliente está esperando confirmación
-- explícita antes de que comience la cocción.

CREATE OR REPLACE FUNCTION public.auto_cancel_unaccepted_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = 'El restaurante no respondió en 5 minutos',
      cancel_reason_code = 'restaurant_timeout',
      updated_at = now()
  WHERE status = 'pending_acceptance'
    AND pending_acceptance_at IS NOT NULL
    AND pending_acceptance_at < now() - interval '5 minutes';
END;
$$;

COMMENT ON FUNCTION public.auto_cancel_unaccepted_orders IS
  'Cancela pedidos en pending_acceptance > 5 min. Invocado por cron cada minuto. El trigger trg_orders_status_history captura la transición y emite OrderCancelled como domain event.';

-- Schedule cron, idempotente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-cancel-pending-acceptance') THEN
    PERFORM cron.schedule(
      'auto-cancel-pending-acceptance',
      '* * * * *',
      $job$ SELECT public.auto_cancel_unaccepted_orders(); $job$
    );
  END IF;
END;
$$;
