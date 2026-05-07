-- ═══════════════════════════════════════════════════════════════════════════
-- 20260511_000 — Pagos manuales del restaurante a Tindivo
-- ═══════════════════════════════════════════════════════════════════════════
-- Reemplaza el flujo de "settlements semanales": el admin registra cada pago
-- recibido (Yape/Plin/transferencia/efectivo) como una fila inmutable y un
-- trigger descuenta el monto del balance_due del restaurante.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.restaurant_payments (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete restrict,
  amount          numeric(10, 2) not null check (amount > 0),
  payment_method  text not null check (payment_method in ('yape', 'plin', 'cash', 'bank_transfer', 'other')),
  payment_note    text,
  paid_at         timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_restaurant_payments_rest_paid
  on public.restaurant_payments (restaurant_id, paid_at desc);

create index if not exists idx_restaurant_payments_paid_at
  on public.restaurant_payments (paid_at desc);

-- ─────────── Trigger: descontar balance_due al insertar un pago ───────────
create or replace function public.deduct_balance_due_on_payment()
returns trigger
language plpgsql
as $$
begin
  update public.restaurants
  set balance_due = greatest(0, balance_due - new.amount),
      updated_at  = now()
  where id = new.restaurant_id;
  return new;
end;
$$;

drop trigger if exists trg_restaurant_payments_deduct_balance on public.restaurant_payments;
create trigger trg_restaurant_payments_deduct_balance
  after insert on public.restaurant_payments
  for each row execute function public.deduct_balance_due_on_payment();

-- ─────────── RLS ───────────
alter table public.restaurant_payments enable row level security;

create policy restaurant_payments_admin_all on public.restaurant_payments
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy restaurant_payments_owner_read on public.restaurant_payments
  for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_payments.restaurant_id
        and r.user_id = auth.uid()
    )
  );

comment on table public.restaurant_payments is
  'Pagos manuales del restaurante a Tindivo. Cada INSERT descuenta amount del balance_due del restaurante via trigger.';
