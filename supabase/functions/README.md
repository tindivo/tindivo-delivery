# Supabase Edge Functions

Funciones Deno que corren en el edge de Supabase.

## send-push

Procesa la tabla `domain_events` (outbox) y envía Web Push vía VAPID a los
usuarios correspondientes según el tipo de evento.

**Despliegue:**
```bash
supabase functions deploy send-push
```

**Variables de entorno requeridas (secrets):**
```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:soporte@tindivo.pe
```

## generate-weekly-settlements

Agrupa pedidos entregados de la semana anterior y crea una `settlement` por
restaurante. Ejecutada por `pg_cron` cada lunes 10:00 AM.

## check-unaccepted-orders

Busca pedidos con `status=waiting_driver` más de 90s sin driver e inserta
alertas en `admin_alerts`. Ejecutada por `pg_cron` cada 30 segundos.

## Activar pg_cron jobs

Editar `supabase/migrations/20260420010400_cron_jobs.sql`:
1. Reemplazar `<PROJECT_REF>` con tu ref.
2. Descomentar los `cron.schedule(...)`.
3. Definir la setting `app.settings.edge_functions_key` desde panel Supabase.
