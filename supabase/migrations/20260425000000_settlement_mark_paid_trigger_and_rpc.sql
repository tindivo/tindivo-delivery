-- ═══════════════════════════════════════════════════════════════════════════
-- 20260425_000 — Trigger: descontar balance_due al pagar una settlement
--                 + funciones RPC para generar liquidaciones on-demand y
--                   resumir deuda por restaurante
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger: cuando una settlement pasa a 'paid', restar su total del balance_due
-- del restaurante. GREATEST evita que baje de 0 (por si hubo reajustes manuales).
create or replace function public.deduct_balance_due_on_settlement_paid()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and coalesce(old.status, 'pending') <> 'paid' then
    update public.restaurants
    set balance_due = greatest(0, balance_due - new.total_amount),
        updated_at = now()
    where id = new.restaurant_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_settlements_deduct_balance_due on public.settlements;
create trigger trg_settlements_deduct_balance_due
  after update of status on public.settlements
  for each row execute function public.deduct_balance_due_on_settlement_paid();

-- Nota: la generación de settlements on-demand se maneja desde el handler
-- Node (`POST /api/v1/admin/settlements/generate`) con un INSERT idempotente
-- y RLS `settlements_admin_all`. No se requiere RPC para ese flujo.

-- Función RPC: resumen por restaurante para la vista "Por restaurante".
create or replace function public.admin_settlements_summary()
returns table(
  restaurant_id     uuid,
  restaurant_name   text,
  accent_color      char(6),
  yape_number       text,
  qr_url            text,
  balance_due       numeric,
  pending_count     integer,
  pending_amount    numeric,
  overdue_count     integer,
  overdue_amount    numeric,
  last_paid_at      timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Solo un admin puede ver el resumen de cobros' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.name,
    r.accent_color,
    r.yape_number,
    r.qr_url,
    r.balance_due,
    coalesce(sum((s.status = 'pending')::int)::int, 0)                                         as pending_count,
    coalesce(sum(case when s.status = 'pending' then s.total_amount else 0 end), 0)::numeric(10,2) as pending_amount,
    coalesce(sum((s.status = 'overdue')::int)::int, 0)                                         as overdue_count,
    coalesce(sum(case when s.status = 'overdue' then s.total_amount else 0 end), 0)::numeric(10,2) as overdue_amount,
    max(s.paid_at)                                                                              as last_paid_at
  from public.restaurants r
  left join public.settlements s on s.restaurant_id = r.id
  where r.is_active = true
  group by r.id, r.name, r.accent_color, r.yape_number, r.qr_url, r.balance_due
  order by r.balance_due desc, r.name;
end;
$$;

grant execute on function public.admin_settlements_summary() to authenticated;

comment on function public.admin_generate_settlements(date, date, date) is
  'Genera/actualiza settlements semanales pending a partir de orders delivered del período. Solo admin.';
comment on function public.admin_settlements_summary() is
  'Resumen de deuda por restaurante: balance_due + settlements pending/overdue. Solo admin.';
