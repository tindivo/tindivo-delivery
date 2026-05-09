-- Cola "Urgente" — atributo del pedido en lugar de estado nuevo.
--
-- Cuando un pedido sufre timeout o rechazo manual, queda con `driver_id=NULL`
-- y `urgent_since=now()`. Sirve como FIFO de la cola urgente y como bandera
-- visual ("Urgente" en la PWA del motorizado).
--
-- `NULL` = no urgente. Default para todos los pedidos existentes — sin backfill.
-- Una sola fuente de verdad (un timestamp), no dos campos que pueden divergir.
--
-- Index parcial: solo indexa los pedidos que están actualmente en la cola
-- urgente. La query del endpoint /driver/orders/available filtra por
-- (status='waiting_driver' AND driver_id IS NULL) y ordena por urgent_since,
-- entonces este index es óptimo y barato.

alter table public.orders
  add column if not exists urgent_since timestamptz;

comment on column public.orders.urgent_since is
  'Timestamp en que el pedido pasó a cola urgente (post-timeout o post-rechazo). NULL = no urgente. Usado para ordenar FIFO en /available y como flag visual en UI motorizado.';

create index if not exists idx_orders_urgent_queue
  on public.orders (urgent_since)
  where status = 'waiting_driver' and driver_id is null;
