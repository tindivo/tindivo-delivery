-- ═══════════════════════════════════════════════════════════════════
-- 20260428_101 — Pago mixto (2/2): columnas split + CHECK consistency
-- ═══════════════════════════════════════════════════════════════════
-- Caso real: el cliente paga parte por Yape y parte en efectivo
-- (ej: S/ 30 Yape + S/ 20 cash sobre un pedido de S/ 50).
--
-- Modelo:
--   yape_amount: parte cobrada por Yape (NULL si no es mixed)
--   cash_amount: parte cobrada en efectivo (NULL si no es mixed)
--
-- Invariantes garantizadas por CHECK:
--   1) Si pending_mixed → ambos amounts > 0 y suman exactamente
--      order_amount (con tolerancia de redondeo a 2 decimales).
--   2) Si NO es pending_mixed → ambos amounts deben ser NULL.
--
-- Retrocompatible: pedidos existentes tienen yape_amount/cash_amount
-- = NULL y payment_status ∈ {prepaid, pending_yape, pending_cash},
-- por lo que la constraint los acepta sin migración de datos.

alter table public.orders
  add column if not exists yape_amount numeric(10, 2)
    check (yape_amount is null or yape_amount >= 0),
  add column if not exists cash_amount numeric(10, 2)
    check (cash_amount is null or cash_amount >= 0);

comment on column public.orders.yape_amount is
  'Parte del pedido cobrada por Yape cuando payment_status=pending_mixed. NULL en otros casos.';
comment on column public.orders.cash_amount is
  'Parte del pedido cobrada en efectivo cuando payment_status=pending_mixed. NULL en otros casos.';

alter table public.orders
  add constraint orders_payment_split_consistency
  check (
    (
      payment_status = 'pending_mixed'
      and yape_amount is not null and yape_amount > 0
      and cash_amount is not null and cash_amount > 0
      and round((yape_amount + cash_amount)::numeric, 2)
        = round(order_amount::numeric, 2)
    )
    or
    (
      payment_status <> 'pending_mixed'
      and yape_amount is null
      and cash_amount is null
    )
  );
