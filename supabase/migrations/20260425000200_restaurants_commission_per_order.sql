-- ═══════════════════════════════════════════════════════════════════
-- 20260425_002 — Comisión por pedido configurable por restaurante
--
-- Cada restaurante puede tener su propia comisión negociada (antes era
-- 1.00 hardcoded). El valor se snapshotea en orders.delivery_fee al
-- crear cada pedido — cambiar la comisión NO afecta pedidos existentes.
--
-- También removemos el DEFAULT 1.00 en orders.delivery_fee porque la app
-- siempre debe proveer el valor (snapshot del restaurante). Si se olvida
-- pasar, queremos que falle ruidosamente en lugar de silenciar con 1.00.
-- ═══════════════════════════════════════════════════════════════════

alter table public.restaurants
  add column if not exists commission_per_order numeric(10, 2) not null default 1.00;

alter table public.restaurants
  drop constraint if exists restaurants_commission_per_order_range;

alter table public.restaurants
  add constraint restaurants_commission_per_order_range
  check (commission_per_order >= 0 and commission_per_order <= 100);

comment on column public.restaurants.commission_per_order is
  'Comisión Tindivo en S/ que se cobra al restaurante por cada pedido entregado. Se snapshotea en orders.delivery_fee al crear el pedido.';

-- Eliminar default en orders.delivery_fee — la app siempre lo provee.
alter table public.orders
  alter column delivery_fee drop default;
