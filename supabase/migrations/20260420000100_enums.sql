-- ═══════════════════════════════════════════════════════════════════
-- 20260420_001 — Enums del dominio
-- ═══════════════════════════════════════════════════════════════════

create type public.user_role as enum ('admin', 'restaurant', 'driver');

create type public.order_status as enum (
  'waiting_driver',
  'heading_to_restaurant',
  'waiting_at_restaurant',
  'picked_up',
  'delivered',
  'cancelled'
);

create type public.payment_status as enum ('prepaid', 'pending_yape', 'pending_cash');

create type public.prep_time_option as enum ('fast', 'normal', 'slow');

create type public.settlement_status as enum ('pending', 'paid', 'overdue');

create type public.cash_settlement_status as enum (
  'pending',
  'delivered',
  'confirmed',
  'disputed',
  'resolved'
);

create type public.vehicle_type as enum ('moto', 'bicicleta', 'pie', 'auto');

create type public.domain_event_status as enum ('pending', 'published', 'failed');
