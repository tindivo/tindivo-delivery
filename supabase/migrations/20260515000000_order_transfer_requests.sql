-- Solicitudes de transferencia entre motorizados (request-based).
--
-- El driver B (solicitante) abre la pestaña "Equipo" y solicita un pedido a
-- driver A (dueño actual). A tiene 30 segundos para Aceptar/Rechazar. Si
-- acepta → reassignTo a B. Si rechaza/expira → no pasa nada.
--
-- Reemplaza el flujo directo del botón "Pasar pedido a otro motorizado"
-- (que se quita en PR4 — el endpoint /transfer y /peers se eliminan).

create type public.transfer_request_status as enum (
  'pending',   -- Esperando respuesta del dueño (30s)
  'accepted',  -- Dueño aceptó, pedido transferido al solicitante
  'rejected',  -- Dueño rechazó manualmente o invalidada por otra solicitud aceptada
  'expired'    -- 30s sin respuesta del dueño (cron)
);

create table public.order_transfer_requests (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  -- from_driver_id = dueño actual del pedido (al que se le solicita)
  from_driver_id  uuid not null references public.drivers(id) on delete restrict,
  -- to_driver_id  = solicitante (el que quiere el pedido)
  to_driver_id    uuid not null references public.drivers(id) on delete restrict,
  status          public.transfer_request_status not null default 'pending',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 seconds'),
  resolved_at     timestamptz,
  check (from_driver_id != to_driver_id)
);

comment on table public.order_transfer_requests is
  'Solicitudes de transferencia driver→driver. TTL 30s en pending. Si el dueño acepta, se invoca Order.reassignTo() vía AcceptTransferRequestUseCase. Las otras solicitudes pending del mismo pedido se invalidan (rejected) automáticamente.';

-- Solo UNA solicitud pending por (order, requester). Permite re-solicitar
-- después de un reject/expired (porque el filtro es WHERE status='pending').
create unique index uniq_order_transfer_requests_pending
  on public.order_transfer_requests (order_id, to_driver_id)
  where status = 'pending';

-- Búsqueda por dueño (driver A) — usado por GET /driver/team/transfer-requests
create index idx_otr_pending_to_from
  on public.order_transfer_requests (from_driver_id, expires_at)
  where status = 'pending';

-- Búsqueda por solicitante (driver B) — para mostrar "Esperando respuesta"
-- en la card del Team
create index idx_otr_pending_by_to
  on public.order_transfer_requests (to_driver_id, expires_at)
  where status = 'pending';

-- Cleanup eficiente del cron expire_pending_transfer_requests
create index idx_otr_expires
  on public.order_transfer_requests (expires_at)
  where status = 'pending';

-- RLS: drivers leen sus propias solicitudes (como from o to). Admin lee todo.
-- INSERT/UPDATE solo vía admin client (los use cases). Sin policy de write
-- = denegado por defecto para anon/authenticated.
alter table public.order_transfer_requests enable row level security;

create policy otr_driver_read on public.order_transfer_requests
  for select using (
    public.current_driver_id() in (from_driver_id, to_driver_id)
    or public.current_user_role() = 'admin'
  );

-- Realtime: para que los clientes (driver A y B) reciban INSERT/UPDATE en
-- vivo y actualicen sus listas sin polling.
alter publication supabase_realtime add table public.order_transfer_requests;
