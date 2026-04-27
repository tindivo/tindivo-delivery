-- HU: admin puede subir un segundo QR de Yape como respaldo si el principal
-- falla al escanear (humedad, daño, error de imagen). El motorizado verá los
-- 2 QRs como tabs en YapeQrCard. La columna es nullable y no afecta a
-- restaurantes existentes — qr_url sigue siendo el principal.
alter table public.restaurants
  add column qr_url_secondary text;
