-- Registrar el cron job para ejecutar el worker cada 30 segundos
SELECT cron.schedule(
  'send-orders-ready-worker',
  '30 seconds',
  $$select public.process_orders_ready_queue();$$
);
