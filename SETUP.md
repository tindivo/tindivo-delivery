# Tindivo — Setup y puesta en marcha

Guía paso a paso para levantar el ecosistema completo desde cero.

## 1. Prerrequisitos

Verifica que tienes instalado:

```bash
node --version    # >= 24.0.0
pnpm --version    # >= 9.0.0
supabase --version # CLI Supabase
docker --version  # para Supabase local (opcional)
```

Si falta algo:
- **Node 24 LTS**: https://nodejs.org (o usa `nvm`)
- **pnpm**: `npm install -g pnpm`
- **Supabase CLI**: https://supabase.com/docs/guides/cli

## 2. Instalar dependencias

Desde la raíz del monorepo:

```bash
pnpm install
```

Turborepo instalará todas las dependencias de las 4 apps y 7 packages.

## 3. Configurar Supabase

### Opción A — Supabase Cloud (recomendado)

1. Crea proyecto en https://supabase.com/dashboard
2. Copia las credenciales desde Settings → API:
   - Project URL
   - `anon public` key
   - `service_role` secret key
3. Copia el connection string desde Settings → Database → Connection string (Session mode)

### Opción B — Supabase local (Docker)

```bash
pnpm db:start
```

Levanta Postgres, Auth, Realtime, Storage, Studio en localhost. Revisa
`supabase/config.toml`.

### Aplicar migrations

Enlaza el proyecto local con tu Supabase Cloud (solo una vez):

```bash
supabase link --project-ref <tu-project-ref>
```

Aplica las migrations:

```bash
pnpm db:push
```

Esto crea todas las tablas, enums, RLS policies, triggers y publicaciones
Realtime. Verifica en Supabase Studio que aparecen:
- 10 tablas bajo `public`
- Policies RLS activas
- Publicación `supabase_realtime` incluyendo `orders`, `cash_settlements`, etc.

### Generar tipos TypeScript

```bash
pnpm db:types
```

Sobrescribe `packages/supabase/src/types.gen.ts` con el schema real.

## 4. Crear usuarios iniciales

Desde Supabase Studio → Authentication → Users, crea:
1. Admin: `admin@tindivo.pe`
2. Restaurant owner: `restaurant@tindivo.pe`
3. Driver: `driver@tindivo.pe`

Copia los UUIDs de cada uno.

En el SQL Editor de Supabase ejecuta:

```sql
-- Reemplazar los UUIDs
insert into public.users (id, email, role) values
  ('<uuid-admin>',      'admin@tindivo.pe',      'admin'),
  ('<uuid-restaurant>', 'restaurant@tindivo.pe', 'restaurant'),
  ('<uuid-driver>',     'driver@tindivo.pe',     'driver');

insert into public.restaurants (user_id, name, phone, address, accent_color)
values ('<uuid-restaurant>', 'El Buen Sabor', '987654321', 'Av. España 520, Trujillo', 'FF6B35');

insert into public.drivers (user_id, full_name, phone, vehicle_type, operating_days)
values ('<uuid-driver>', 'Carlos Pérez', '987111222', 'moto', ARRAY['tue','wed','thu','fri','sat']);

-- Marcar al driver como disponible
update public.driver_availability
set is_available = true
where driver_id = (select id from public.drivers where user_id = '<uuid-driver>');
```

## 5. Configurar variables de entorno

Copia `.env.example` a `.env.local` en la raíz y completa los valores.

Además, cada app puede tener su propio `.env.local` (Next.js carga
automáticamente):

```bash
cp .env.example .env.local
# editar .env.local
```

### Generar claves VAPID (para Web Push)

```bash
npx web-push generate-vapid-keys
```

Copia la pública y privada a `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:soporte@tindivo.pe
```

También súbelas como secrets a Supabase (para la Edge Function):

```bash
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:soporte@tindivo.pe
```

## 6. Desplegar Edge Functions

```bash
supabase functions deploy send-push
supabase functions deploy generate-weekly-settlements
supabase functions deploy check-unaccepted-orders
```

## 7. Activar pg_cron (opcional pero recomendado)

Edita `supabase/migrations/20260420010400_cron_jobs.sql`:
1. Reemplaza `<PROJECT_REF>` con tu ref real.
2. Descomenta los `cron.schedule(...)`.
3. Define la setting en el SQL Editor:
   ```sql
   alter system set app.settings.edge_functions_key to '<tu-service-role-key>';
   select pg_reload_conf();
   ```
4. Aplica la migration nuevamente: `pnpm db:push`.

## 8. Ejecutar en desarrollo

```bash
pnpm dev
```

Arranca en paralelo:
- API: http://localhost:3001
- Admin: http://localhost:3002
- Restaurante: http://localhost:3003
- Driver: http://localhost:3004
- Tracking: http://localhost:3005

O levantar solo una app:

```bash
pnpm --filter @tindivo/api dev
pnpm --filter @tindivo/admin dev
pnpm --filter @tindivo/restaurant dev
pnpm --filter @tindivo/driver dev
pnpm --filter @tindivo/tracking dev
```

## 9. Flujo de prueba end-to-end

1. **Abre http://localhost:3003/login** e ingresa con `restaurant@tindivo.pe`.
   Crea un pedido desde "PEDIR MOTO".
2. **Abre http://localhost:3004/login** en otra ventana (o incógnita) e
   ingresa con `driver@tindivo.pe`. Deberías ver el pedido aparecer en
   tiempo real en "Pedidos disponibles". Tócalo para aceptarlo.
3. Avanza los estados: `Llegué al local` → `Recibí el pedido` → captura
   teléfono + marcador en mapa → `Pedido entregado`.
4. **Abre http://localhost:3002/login** con `admin@tindivo.pe`. Ve el
   pedido en vivo, el botón "Enviar tracking por WhatsApp" al cliente, y
   el timeline.
5. **Abre el tracking público**: http://localhost:3005/pedidos/<shortId>
   para ver lo que vería el cliente final (ve estado + mapa con
   destino).

## 10. Build producción

```bash
pnpm build
```

Build de todas las apps. Para desplegar:
- Vercel: importar 4 proyectos separados desde el monorepo.
- Self-hosted: `pnpm --filter <app> start` en cada servicio.

## Troubleshooting

### "Module not found: @tindivo/core"

Primera vez tras `pnpm install`. Solución:
```bash
pnpm --filter @tindivo/core type-check  # fuerza resolución
```

### "relation public.orders does not exist"

No aplicaste las migrations. `pnpm db:push`.

### "Invalid VAPID details"

Generaste claves VAPID pero no las cargaste en `.env.local` o Supabase
secrets. Repite paso 5.

### El driver no ve pedidos disponibles

Verifica:
1. `driver.is_active = true`
2. `driver_availability.is_available = true`
3. El pedido tiene `status='waiting_driver'` y `appears_in_queue_at <= now()`

### Push notifications no llegan

- iOS: la PWA debe estar **instalada** en Home Screen (iOS 16.4+ req.).
- Android/Chrome: verifica permisos + service worker registrado.
- Edge Function `send-push` debe estar desplegada y con secrets VAPID.
- El user debe tener fila en `push_subscriptions`.

## Estructura del proyecto

Ver `README.md`. Plan completo de arquitectura en
`C:\Users\mauri\.claude\plans\quiero-crear-un-ecosistema-swift-curry.md`.
