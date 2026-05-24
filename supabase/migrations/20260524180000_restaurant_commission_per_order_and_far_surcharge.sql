-- Restaurar commission_per_order como columna activa (ya no deprecated)
-- y agregar far_distance_surcharge configurable por restaurante.
-- Fórmula: delivery_fee = base_commission + (band='far' ? far_surcharge_amount : 0)
-- Snapshots viajan en orders.base_commission y orders.far_surcharge_amount.

-- 1) Nueva columna far_distance_surcharge en restaurants.
alter table public.restaurants
  add column if not exists far_distance_surcharge numeric(10, 2) not null default 0.50;

alter table public.restaurants
  drop constraint if exists restaurants_far_distance_surcharge_range;

alter table public.restaurants
  add constraint restaurants_far_distance_surcharge_range
  check (far_distance_surcharge >= 0 and far_distance_surcharge <= 100);

comment on column public.restaurants.far_distance_surcharge is
  'Adicional en S/ que se suma a commission_per_order cuando el motorizado declara banda "far" al pickup. Configurable por admin; default 0.50.';

-- 2) Quitar el "DEPRECATED" del comentario de commission_per_order (ya no aplica).
comment on column public.restaurants.commission_per_order is
  'Comisión base en S/ que se cobra al restaurante por cada pedido entregado. Se snapshotea en orders.base_commission al crear el pedido. Si la banda al pickup es "far", se suma orders.far_surcharge_amount al delivery_fee final.';

-- 3) Snapshot columns en orders. NULL solo para pedidos previos a esta migración.
alter table public.orders
  add column if not exists base_commission numeric(10, 2),
  add column if not exists far_surcharge_amount numeric(10, 2);

comment on column public.orders.base_commission is
  'Snapshot al crear del restaurants.commission_per_order. Se usa al pickup junto con far_surcharge_amount para calcular delivery_fee.';

comment on column public.orders.far_surcharge_amount is
  'Snapshot al crear del restaurants.far_distance_surcharge. Solo se suma a delivery_fee si la banda declarada al pickup es "far".';

-- 4) Backfill: pedidos abiertos (sin pickup completo) reciben los valores
--    actuales de su restaurante. Pedidos picked_up/delivered/cancelled NO
--    se tocan (su delivery_fee y deuda histórica son inmutables).
update public.orders o
  set base_commission = r.commission_per_order,
      far_surcharge_amount = r.far_distance_surcharge
  from public.restaurants r
  where o.restaurant_id = r.id
    and o.status in ('pending_acceptance','waiting_driver','heading_to_restaurant','waiting_at_restaurant')
    and (o.base_commission is null or o.far_surcharge_amount is null);

-- 5) Limpiar app_settings — el modelo global ya no se usa.
delete from public.app_settings where key = 'delivery_distance_commissions';
