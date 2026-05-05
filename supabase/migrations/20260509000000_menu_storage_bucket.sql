-- Storage bucket para imágenes de items de menú del restaurante.
-- Usado por el editor /restaurante/negocio para subir fotos de los platos.
-- Path convencional: restaurants/{restaurant_id}/items/{item_id}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-menu-images',
  'restaurant-menu-images',
  true,
  3 * 1024 * 1024,  -- 3 MB max (foto de plato comprimida)
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública: la PWA del cliente carga imágenes sin auth.
DROP POLICY IF EXISTS menu_images_public_read ON storage.objects;
CREATE POLICY menu_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-menu-images');

-- Upload: restaurante solo en su propia carpeta /restaurants/{own_id}/...
-- (storage.foldername extrae los segmentos del path; [1]='restaurants',
-- [2]=restaurant_id, [3]='items', [4]=archivo).
DROP POLICY IF EXISTS menu_images_restaurant_write ON storage.objects;
CREATE POLICY menu_images_restaurant_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-menu-images'
    AND public.current_user_role() = 'restaurant'::public.user_role
    AND (storage.foldername(name))[1] = 'restaurants'
    AND (storage.foldername(name))[2] = public.current_restaurant_id()::text
  );

DROP POLICY IF EXISTS menu_images_restaurant_update ON storage.objects;
CREATE POLICY menu_images_restaurant_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'restaurant-menu-images'
    AND public.current_user_role() = 'restaurant'::public.user_role
    AND (storage.foldername(name))[1] = 'restaurants'
    AND (storage.foldername(name))[2] = public.current_restaurant_id()::text
  );

DROP POLICY IF EXISTS menu_images_restaurant_delete ON storage.objects;
CREATE POLICY menu_images_restaurant_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'restaurant-menu-images'
    AND public.current_user_role() = 'restaurant'::public.user_role
    AND (storage.foldername(name))[1] = 'restaurants'
    AND (storage.foldername(name))[2] = public.current_restaurant_id()::text
  );

-- Admin tiene control total
DROP POLICY IF EXISTS menu_images_admin_all ON storage.objects;
CREATE POLICY menu_images_admin_all ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'restaurant-menu-images'
    AND public.current_user_role() = 'admin'::public.user_role
  )
  WITH CHECK (
    bucket_id = 'restaurant-menu-images'
    AND public.current_user_role() = 'admin'::public.user_role
  );
