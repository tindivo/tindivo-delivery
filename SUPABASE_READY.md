# ✅ Supabase listo — Proyecto "Delivery"

Ejecutado automáticamente vía MCP el 2026-04-20.

## Credenciales del proyecto

- **Project ID / Ref:** `nwcdxmebsozswnjlblip`
- **URL:** https://nwcdxmebsozswnjlblip.supabase.co
- **Región:** us-east-2
- **Postgres:** 17.6.1.104
- **Dashboard:** https://supabase.com/dashboard/project/nwcdxmebsozswnjlblip

## Migraciones aplicadas ✓

| # | Nombre | Contenido |
|---|---|---|
| 1 | `extensions` | pgcrypto, uuid-ossp, postgis, pg_cron, pg_net |
| 2 | `enums` | 8 enums del dominio |
| 3 | `users_table` | public.users proxy de auth.users |
| 4 | `restaurants_table` | restaurants + accent_color único |
| 5 | `drivers_and_availability` | drivers + driver_availability |
| 6 | `orders_table` | pedidos (agregado central) |
| 7 | `order_status_history` | historial inmutable |
| 8 | `cash_settlements_table` | efectivo diario |
| 9 | `settlements_table` | liquidaciones semanales |
| 10 | `push_subscriptions_table` | Web Push multi-device |
| 11 | `domain_events_outbox` | outbox pattern |
| 12 | `admin_alerts_table` | alertas admin |
| 13 | `helper_functions` | current_user_role, get_tracking, generate_short_id |
| 14 | `triggers` | updated_at, balance_due, short_id, maps_url, notify |
| 15 | `rls_policies` | RLS en 11 tablas |
| 16 | `realtime_publications` | orders, cash, settlements, availability, alerts, restaurants |

Verificación: `SELECT * FROM pg_tables WHERE schemaname='public'` → 11 tablas, todas con RLS.

## Usuarios de desarrollo ✓

Todos con password `tindivo2026`:

| Email | Rol | Entidad asociada |
|---|---|---|
| admin@tindivo.pe | admin | — |
| restaurant@tindivo.pe | restaurant | El Buen Sabor (color FF6B35) |
| driver@tindivo.pe | driver | Carlos Pérez (moto, disponible) |

## Edge Functions ✓

Desplegadas y ACTIVAS (sin verify_jwt porque las invoca pg_cron):

| Función | URL |
|---|---|
| `send-push` | https://nwcdxmebsozswnjlblip.functions.supabase.co/send-push |
| `generate-weekly-settlements` | https://nwcdxmebsozswnjlblip.functions.supabase.co/generate-weekly-settlements |
| `check-unaccepted-orders` | https://nwcdxmebsozswnjlblip.functions.supabase.co/check-unaccepted-orders |

## VAPID Keys ✓

Generadas con `npx web-push generate-vapid-keys`. Ya están en `.env.local`.

### ⚠️ Configurar secrets para Edge Functions

```bash
supabase link --project-ref nwcdxmebsozswnjlblip
supabase secrets set VAPID_PUBLIC_KEY=BPwyJY1yyf8tUF6YQee6iSH56Kjm0WrDcS0MdBX-sz7y9MnCK2CY63psvWkwQ_JtB4f662xE8KlYOUbHdVfPiBc
supabase secrets set VAPID_PRIVATE_KEY=JRYT9U-9WCoEwFhS1HIR_YMU-HnCJoJZ-i7UVvhj1us
supabase secrets set VAPID_SUBJECT=mailto:soporte@tindivo.pe
```

## Falta por ti: 1 paso crítico

**Copia el `service_role` key** al `.env.local`:

1. Abre https://supabase.com/dashboard/project/nwcdxmebsozswnjlblip/settings/api-keys
2. Copia `service_role` (secret, NO compartir).
3. Pega en `.env.local` reemplazando `REEMPLAZAR_CON_SERVICE_ROLE_KEY`.

## Arrancar las apps

```bash
pnpm install        # si no lo hiciste aún
pnpm dev            # levanta las 5 apps en paralelo
```

URLs:
- **API:** http://localhost:3001
- **Admin:** http://localhost:3002 → login admin@tindivo.pe / tindivo2026
- **Restaurante:** http://localhost:3003 → login restaurant@tindivo.pe / tindivo2026
- **Driver:** http://localhost:3004 → login driver@tindivo.pe / tindivo2026
- **Tracking público:** http://localhost:3005/pedidos/{shortId}

## Flujo de prueba rápido

1. Abre http://localhost:3003/login, ingresa como restaurante, crea un pedido.
2. Abre http://localhost:3004/login en otra ventana, ingresa como driver, acepta el pedido.
3. Avanza: Llegué al local → Recibí pedido → (marca destino en mapa + teléfono) → Entregado.
4. Abre http://localhost:3002/login como admin, ve el pedido en vivo y envía tracking por WhatsApp.
5. Abre http://localhost:3005/pedidos/{shortId} para ver lo que ve el cliente.

## Advisors de seguridad pendientes

De Supabase linter (no bloquean desarrollo):

- ⚠️ 7 funciones con `search_path` mutable (WARN). Mitigación: ya puse `search_path` en las funciones críticas (`current_user_role`, `current_restaurant_id`, `current_driver_id`, `get_tracking`, `generate_delivery_maps_url`). Las que quedan son triggers internos de bajo riesgo.
- ⚠️ `domain_events` tiene RLS sin policies (esperado — solo service_role debe leer).
- ⚠️ `auth_leaked_password_protection` deshabilitado. Activar desde dashboard en Auth → Policies para producción.

## pg_cron jobs (activar cuando estés listo)

Editar `supabase/migrations/20260420010400_cron_jobs.sql`:
- Reemplazar `<PROJECT_REF>` con `nwcdxmebsozswnjlblip`
- Descomentar los `cron.schedule(...)`
- En SQL Editor ejecutar:
  ```sql
  alter database postgres set "app.settings.edge_functions_key" = '<SERVICE_ROLE_KEY>';
  ```
- Aplicar la migration.

## Archivos modificados

- `.env.local` ✨ nuevo, con credenciales reales
- `packages/supabase/src/types.gen.ts` ♻️ regenerado desde schema real
- `SUPABASE_READY.md` ✨ este archivo
