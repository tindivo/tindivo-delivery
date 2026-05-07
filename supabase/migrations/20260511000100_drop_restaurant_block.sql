-- ═══════════════════════════════════════════════════════════════════════════
-- 20260511_001 — Eliminar is_blocked / block_reason de restaurants
-- ═══════════════════════════════════════════════════════════════════════════
-- Decisión: unificar el modelo de estado del restaurante en un solo flag
-- (is_active). Todo lo que antes era "bloquear por sanción" ahora se modela
-- como is_active=false. Más simple y suficiente para la operación.
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.idx_restaurants_active_blocked;

alter table public.restaurants
  drop column if exists is_blocked,
  drop column if exists block_reason;

create index if not exists idx_restaurants_active
  on public.restaurants (is_active)
  where is_active = true;
