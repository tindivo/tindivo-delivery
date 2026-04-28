-- ═══════════════════════════════════════════════════════════════════
-- 20260428_100 — Pago mixto (1/2): agregar enum value 'pending_mixed'
-- ═══════════════════════════════════════════════════════════════════
-- Postgres no permite usar un nuevo enum value en la misma transacción
-- en que se agrega. Por eso esta migration solo extiende el enum;
-- las columnas yape_amount/cash_amount + CHECK constraint que lo
-- referencian van en la migration 20260428_101.

alter type public.payment_status add value if not exists 'pending_mixed';
