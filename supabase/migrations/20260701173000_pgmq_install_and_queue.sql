CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

-- Crear la cola de mensajes
SELECT pgmq.create('orders_ready_for_drivers');

-- Sembrar feature flag
INSERT INTO public.app_settings (key, value)
VALUES ('push_pgmq_scheduling_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
