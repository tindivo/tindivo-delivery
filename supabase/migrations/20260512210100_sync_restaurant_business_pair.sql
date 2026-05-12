-- Sincroniza name/phone/address/accent_color entre restaurants y su
-- marketplace_business enlazado (delivery_restaurant_id apuntando a self).
-- Editar el restaurant desde delivery propaga al business; editar el
-- business desde tindivo.com propaga al restaurant. Otros campos quedan
-- independientes:
--   restaurants: yape_number, qr_url, coordinates, commission, is_active, balance_due
--   marketplace_businesses: description, is_published, is_verified
--
-- pg_trigger_depth() corta loops: trigger A actualiza tabla B, lo que
-- dispararía trigger B → A → ∞. Cuando depth > 1 (estamos dentro de una
-- cascada), no propagamos.

CREATE OR REPLACE FUNCTION public.sync_restaurant_to_business() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  UPDATE public.marketplace_businesses
     SET name = NEW.name,
         phone = NEW.phone,
         address = NEW.address,
         accent_color = NEW.accent_color
   WHERE delivery_restaurant_id = NEW.id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_restaurant_to_business
  AFTER UPDATE ON public.restaurants
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.address IS DISTINCT FROM NEW.address OR
    OLD.accent_color IS DISTINCT FROM NEW.accent_color
  )
  EXECUTE FUNCTION public.sync_restaurant_to_business();

CREATE OR REPLACE FUNCTION public.sync_business_to_restaurant() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.delivery_restaurant_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.restaurants
     SET name = NEW.name,
         phone = NEW.phone,
         address = NEW.address,
         accent_color = NEW.accent_color
   WHERE id = NEW.delivery_restaurant_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_business_to_restaurant
  AFTER UPDATE ON public.marketplace_businesses
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.address IS DISTINCT FROM NEW.address OR
    OLD.accent_color IS DISTINCT FROM NEW.accent_color
  )
  EXECUTE FUNCTION public.sync_business_to_restaurant();

-- Cuando admin crea un restaurant nuevo desde /admin/restaurants/new:
-- auto-crear su marketplace_business y extender users.roles con 'business'.
-- Si el dueño no quiere catálogo público, deja is_published=false (default).
CREATE OR REPLACE FUNCTION public.auto_create_business_for_restaurant() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.marketplace_businesses WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.marketplace_businesses
    (user_id, name, phone, address, accent_color, delivery_restaurant_id, is_active, is_published, is_verified)
  VALUES
    (NEW.user_id, NEW.name, NEW.phone, NEW.address, NEW.accent_color, NEW.id, true, false, true);

  UPDATE public.users
     SET roles = array(SELECT DISTINCT unnest(roles || ARRAY['business']::text[]))
   WHERE id = NEW.user_id AND NOT ('business' = ANY(roles));

  RETURN NEW;
END $$;

CREATE TRIGGER trg_auto_create_business
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_business_for_restaurant();
