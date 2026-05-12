-- Unificacion business+restaurant: restaurants pasa a ser la unica entidad
-- de local. Los flags is_marketplace_published / is_delivery_enabled
-- reemplazan la distincion entre tablas separadas.
--
-- Producción tiene 8 marketplace_businesses (todos enlazados a restaurants),
-- 0 filas en marketplace_menu_*. Migration es segura.

-- 1. Agregar columnas a restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_marketplace_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_delivery_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Migrar: para cada business linked, copia sus flags al restaurant
UPDATE public.restaurants r
SET description = mb.description,
    is_marketplace_published = mb.is_published,
    is_verified = mb.is_verified,
    is_delivery_enabled = true
FROM public.marketplace_businesses mb
WHERE mb.delivery_restaurant_id = r.id;

-- 3. Restaurants sin business asociado: is_delivery_enabled = true (legacy)
UPDATE public.restaurants r SET is_delivery_enabled = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.marketplace_businesses WHERE delivery_restaurant_id = r.id
);

-- 4. Drop triggers de sync (referencian marketplace_businesses)
DROP TRIGGER IF EXISTS trg_sync_restaurant_to_business ON public.restaurants;
DROP TRIGGER IF EXISTS trg_sync_business_to_restaurant ON public.marketplace_businesses;
DROP TRIGGER IF EXISTS trg_auto_create_business ON public.restaurants;

-- 5. Drop funciones obsoletas
DROP FUNCTION IF EXISTS public.sync_business_to_restaurant() CASCADE;
DROP FUNCTION IF EXISTS public.sync_restaurant_to_business() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_business_for_restaurant() CASCADE;
DROP FUNCTION IF EXISTS private.current_business_id() CASCADE;

-- 6. Drop tables marketplace_* (CASCADE limpia RLS policies + FK + bucket policies)
DROP TABLE IF EXISTS public.marketplace_menu_modifier_options CASCADE;
DROP TABLE IF EXISTS public.marketplace_menu_modifier_groups CASCADE;
DROP TABLE IF EXISTS public.marketplace_menu_items CASCADE;
DROP TABLE IF EXISTS public.marketplace_menu_categories CASCADE;
DROP TABLE IF EXISTS public.marketplace_businesses CASCADE;
