-- ════════════════════════════════════════════════════════════════
-- 20260424_130 — Migrar prep_time_option (enum) → prep_minutes (int)
-- ════════════════════════════════════════════════════════════════
--
-- Motivo: el enum `prep_time_option` con 3 valores (fast=10, normal=15,
-- slow=20) no captura la variedad de tiempos de preparación reales.
-- El carrusel del restaurante ofrece 10/20/30/40/50/60 min pero todos
-- los valores >10 se colapsaban en normal (15 min) o slow (20 min).
--
-- Solución: reemplazar el enum por una columna int con rango 5-120.

-- 1) Columna nueva (nullable temporal para backfill)
alter table public.orders
  add column prep_minutes int;

-- 2) Backfill: mapeo del enum legacy a los minutos reales
update public.orders
set prep_minutes = case prep_time_option
  when 'fast'   then 10
  when 'normal' then 15
  when 'slow'   then 20
end;

-- 3) Blindar: NOT NULL + rango válido
alter table public.orders
  alter column prep_minutes set not null;

alter table public.orders
  add constraint orders_prep_minutes_range check (prep_minutes between 5 and 120);

-- 4) Dropear columna legacy y el tipo (solo lo usaba orders)
alter table public.orders
  drop column prep_time_option;

drop type public.prep_time_option;

comment on column public.orders.prep_minutes is
  'Tiempo de preparación en minutos (5-120). Reemplaza al enum prep_time_option.';
