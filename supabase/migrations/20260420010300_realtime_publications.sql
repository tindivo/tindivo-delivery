-- ═══════════════════════════════════════════════════════════════════
-- 20260420_103 — Publicaciones para Realtime (postgres_changes)
-- ═══════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.cash_settlements;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.driver_availability;
alter publication supabase_realtime add table public.admin_alerts;
alter publication supabase_realtime add table public.restaurants;
