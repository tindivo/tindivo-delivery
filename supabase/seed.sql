-- ═══════════════════════════════════════════════════════════════════
-- Seed local — datos mínimos para desarrollo
-- ═══════════════════════════════════════════════════════════════════
-- NOTA: los usuarios se crean desde Supabase Auth (panel o función
-- admin.createUser). Aquí solo creamos perfiles que referencian IDs
-- que deben existir en auth.users previamente.
--
-- Para desarrollo local:
-- 1. supabase start
-- 2. supabase db reset    (aplica migrations)
-- 3. Desde panel http://localhost:54323/project/default/auth/users crear:
--    - admin@tindivo.pe (copiar UUID)
--    - restaurant@tindivo.pe (copiar UUID)
--    - driver@tindivo.pe (copiar UUID)
-- 4. Actualizar los UUIDs abajo y correr este seed manualmente.

-- Ejemplo (reemplazar UUIDs):
-- insert into public.users (id, email, role) values
--   ('<uuid-admin>',      'admin@tindivo.pe',      'admin'),
--   ('<uuid-restaurant>', 'restaurant@tindivo.pe', 'restaurant'),
--   ('<uuid-driver>',     'driver@tindivo.pe',     'driver');

-- insert into public.restaurants (user_id, name, phone, address, accent_color)
-- values ('<uuid-restaurant>', 'El Buen Sabor', '987654321', 'Av. España 520', 'FF6B35');

-- insert into public.drivers (user_id, full_name, phone, vehicle_type, operating_days)
-- values ('<uuid-driver>', 'Carlos Pérez', '987111222', 'moto', ARRAY['tue','wed','thu','fri','sat']);
