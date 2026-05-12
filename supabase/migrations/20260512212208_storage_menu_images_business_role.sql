-- Despues de unificar marketplace_businesses con restaurants, los dueños
-- ingresan al editor de menu desde tindivo.com/negocio con rol 'business'.
-- Necesitan permisos de escritura sobre el bucket restaurant-menu-images
-- (antes usaban un bucket separado business-menu-images con sus propias
-- policies, que se borraron con CASCADE en la unificacion).
--
-- Misma estructura que las policies de 'restaurant': WITH CHECK que el path
-- empiece con el current_restaurant_id() del usuario.

DROP POLICY IF EXISTS menu_images_business_write ON storage.objects;
CREATE POLICY menu_images_business_write ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-menu-images'
    AND 'business'::text = ANY (public.current_user_roles())
    AND (storage.foldername(name))[1] = (public.current_restaurant_id())::text
  );

DROP POLICY IF EXISTS menu_images_business_update ON storage.objects;
CREATE POLICY menu_images_business_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'restaurant-menu-images'
    AND 'business'::text = ANY (public.current_user_roles())
    AND (storage.foldername(name))[1] = (public.current_restaurant_id())::text
  );

DROP POLICY IF EXISTS menu_images_business_delete ON storage.objects;
CREATE POLICY menu_images_business_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'restaurant-menu-images'
    AND 'business'::text = ANY (public.current_user_roles())
    AND (storage.foldername(name))[1] = (public.current_restaurant_id())::text
  );
