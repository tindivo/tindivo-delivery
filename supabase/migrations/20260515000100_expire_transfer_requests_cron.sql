-- Cleanup de solicitudes de transferencia expiradas (TTL 30s).
--
-- pg_cron resolución mínima es 1 minuto, así que el SLA real de expiración
-- es 30..90 segundos. La validación en AcceptTransferRequestUseCase chequea
-- expires_at > now() en cada accept para garantizar que ningún driver acepte
-- después del límite, aunque el cron aún no haya marcado la fila.
--
-- Idempotente: solo afecta filas con status='pending' AND expires_at < now().

create or replace function public.expire_pending_transfer_requests()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.order_transfer_requests
     set status = 'expired',
         resolved_at = now()
   where status = 'pending'
     and expires_at < now();
$$;

select cron.schedule(
  'expire-transfer-requests',
  '* * * * *',
  $$ select public.expire_pending_transfer_requests(); $$
);
