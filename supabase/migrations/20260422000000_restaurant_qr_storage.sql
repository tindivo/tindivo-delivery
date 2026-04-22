-- ═══════════════════════════════════════════════════════════════════
-- 20260422_000 — Storage bucket para QR de Yape/Plin de restaurantes
-- ═══════════════════════════════════════════════════════════════════
-- HU-A-020: El admin sube la imagen del QR al crear/editar un restaurante.
-- HU-D-037: El driver visualiza el QR al momento de entregar cuando el
-- pago es pending_yape.

-- Bucket público: las imágenes QR se leen sin auth (driver las abre en la
-- PWA). El path controla a qué restaurante pertenece: restaurants/{id}/qr.*
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-qr-codes',
  'restaurant-qr-codes',
  true,
  2 * 1024 * 1024,  -- 2 MB max (QR no necesita más)
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública: cualquiera puede GET la imagen (sirven directamente)
create policy restaurant_qr_public_read on storage.objects
  for select using (bucket_id = 'restaurant-qr-codes');

-- Upload/update: solo admin (role authenticated + role check custom)
create policy restaurant_qr_admin_write on storage.objects
  for insert
  with check (
    bucket_id = 'restaurant-qr-codes'
    and public.current_user_role() = 'admin'
  );

create policy restaurant_qr_admin_update on storage.objects
  for update
  using (
    bucket_id = 'restaurant-qr-codes'
    and public.current_user_role() = 'admin'
  );

create policy restaurant_qr_admin_delete on storage.objects
  for delete
  using (
    bucket_id = 'restaurant-qr-codes'
    and public.current_user_role() = 'admin'
  );
