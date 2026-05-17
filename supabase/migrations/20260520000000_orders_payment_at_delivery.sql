-- Cambio de método de pago al entregar (motorizado)
--
-- Tres columnas nuevas en orders para permitir que el motorizado registre
-- al momento de entregar:
--   1) Si el cliente pagó exacto (caso pending_cash sin usar el vuelto adelantado).
--   2) Si el cliente cambió el método de pago (yape↔cash↔mixto).
--
-- La columna `payment_status_at_creation` preserva el método elegido al crear
-- el pedido — necesario para calcular si el restaurante le adelantó vuelto al
-- driver (afecta cuánto debe liquidar).
--
-- La columna `cash_owed_at_delivery` guarda el valor pre-calculado de la deuda
-- del driver con el restaurante por ese pedido. Si NULL, los consumidores caen
-- a la fórmula legacy `COALESCE(client_pays_with, cash_amount, order_amount)`.

-- 1) Snapshot del payment_status al momento de creación
alter table public.orders
  add column if not exists payment_status_at_creation public.payment_status;

update public.orders
   set payment_status_at_creation = payment_status
 where payment_status_at_creation is null;

alter table public.orders
  alter column payment_status_at_creation set not null;

-- Trigger BEFORE INSERT: copia payment_status si no se especificó
create or replace function public.set_payment_status_at_creation()
returns trigger as $$
begin
  if new.payment_status_at_creation is null then
    new.payment_status_at_creation := new.payment_status;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_set_payment_status_at_creation on public.orders;
create trigger trg_orders_set_payment_status_at_creation
  before insert on public.orders
  for each row execute function public.set_payment_status_at_creation();

-- 2) Flag de "cliente pagó exacto" al entregar
alter table public.orders
  add column if not exists client_paid_exact_at_delivery boolean not null default false;

-- 3) Deuda pre-calculada del driver con el restaurante (NULL = usar fórmula legacy)
alter table public.orders
  add column if not exists cash_owed_at_delivery numeric(10, 2);

-- Backfill: aplica la fórmula legacy a los pedidos ya entregados con cash/mixto
update public.orders
   set cash_owed_at_delivery = coalesce(client_pays_with, cash_amount, order_amount)
 where status = 'delivered'
   and payment_status in ('pending_cash', 'pending_mixed')
   and cash_owed_at_delivery is null;
