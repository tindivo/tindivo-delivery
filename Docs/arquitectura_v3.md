# Arquitectura técnica — Tindivo (v3)

> **Versión actualizada** tras las decisiones de producto:
> - Las tres apps (Restaurante, Motorizado, Admin) son **PWAs mobile-first** en un único Next.js, no hay app nativa.
> - **Supabase reemplaza Contabo + Ably + Firebase + NextAuth** como plataforma backend unificada.
> - Se eliminan React Native, Expo, Expo Push, Ably, PgBouncer, Firebase Storage, JWT manual y endpoint de login móvil.

---

## 1. Principios de arquitectura

### 1.1 · Un solo repositorio, tres PWAs

Ya no hay repositorios separados entre web y móvil. Las tres apps (restaurante, driver, admin) viven en un único proyecto Next.js, cada una montada en su propio grupo de rutas. Al ser todas PWAs, se instalan en el celular o PC como cualquier aplicación, pero con un solo codebase, una sola pipeline de deploy y un solo lugar donde corregir bugs.

### 1.2 · Mobile-first en las tres

Aunque el Panel Admin se usa mayoritariamente en desktop, se diseña primero para mobile porque el admin interviene en emergencias desde cualquier dispositivo. La app del restaurante se usa en tablet/laptop pero debe funcionar sin romperse en celular. La PWA del driver es 100 % móvil. El principio general: **si funciona bien en 390 px, funciona bien en 1920 px**, no al revés.

### 1.3 · Supabase como columna vertebral

Supabase provee en un solo proveedor todo lo que antes estaba fragmentado: PostgreSQL administrado, Auth con cookies, Realtime (reemplazando Ably), Storage (reemplazando Firebase), y Row Level Security como capa de seguridad nativa de la base de datos.

### 1.4 · Row Level Security (RLS) en lugar de validación manual por endpoint

En la arquitectura anterior, cada endpoint verificaba manualmente si el usuario podía acceder a un recurso. Con Supabase RLS, las reglas de acceso viven **en la base de datos**: un restaurante jamás puede leer pedidos de otro restaurante, ni siquiera si un endpoint tiene un bug. Esta es una mejora de seguridad estructural.

---

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework web | **Next.js 14 (App Router)** | Host único de las tres PWAs |
| Base de datos | **Supabase PostgreSQL 15** | Managed, con backups automáticos |
| ORM | **Prisma ORM** | Se mantiene — tipado y migraciones |
| Auth | **Supabase Auth** | Cookies httpOnly, sesión única para las 3 apps |
| Seguridad de datos | **Supabase RLS** | Policies de acceso por fila |
| Realtime | **Supabase Realtime** | Suscripciones a `postgres_changes` y canales broadcast |
| Storage | **Supabase Storage** | QR, comprobantes, logos |
| Push notifications | **Web Push API + VAPID** | Service Worker en cada PWA |
| PWA manifest | **3 manifests distintos** | Uno por app, para que se instalen por separado |
| Service Worker | **Workbox + next-pwa** | Estrategias de caché, offline, push |
| Deploy | **Vercel** | CI/CD automático desde main |
| Color primario | `orange-500` (#f97316) | Consistente en las tres apps |

### Stack eliminado respecto a la versión anterior

| Ya no se usa | Reemplazado por |
|---|---|
| Contabo VPS + PostgreSQL self-hosted | Supabase PostgreSQL managed |
| PgBouncer | Supabase connection pooling (incluido) |
| Ably (realtime) | Supabase Realtime |
| Firebase Storage | Supabase Storage |
| NextAuth (Credentials provider) | Supabase Auth |
| JWT manual + `/api/auth/mobile/login` | Supabase Auth unificado |
| React Native + Expo SDK | Next.js PWA |
| Expo Push API + FCM | Web Push API + VAPID |
| SecureStore (Expo) | Cookies httpOnly de Supabase |
| APK + Expo Updates | Instalación de PWA desde el navegador |

---

## 3. Estructura del repositorio

Un solo proyecto Next.js. Los tres productos se separan por **route groups** del App Router:

```
tindivo/
├── app/
│   ├── (public)/
│   │   ├── login/
│   │   │   └── page.tsx              → Login unificado (detecta rol y redirige)
│   │   └── pedidos/
│   │       └── [shortId]/
│   │           └── page.tsx          → Tracking público del cliente
│   │
│   ├── (restaurant)/                 → PWA Restaurante
│   │   ├── layout.tsx                → Carga manifest-restaurant.json
│   │   ├── dashboard/
│   │   ├── orders/
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── finances/
│   │   └── cash-settlements/
│   │
│   ├── (driver)/                     → PWA Driver
│   │   ├── layout.tsx                → Carga manifest-driver.json
│   │   ├── home/
│   │   ├── available/
│   │   ├── my-orders/
│   │   └── orders/[id]/
│   │
│   ├── (admin)/                      → Panel Admin
│   │   ├── layout.tsx                → Carga manifest-admin.json
│   │   ├── monitor/
│   │   ├── restaurants/
│   │   ├── drivers/
│   │   ├── orders/
│   │   ├── finances/
│   │   └── cash-settlements/
│   │
│   └── api/                          → Route handlers
│       ├── restaurant/
│       ├── driver/
│       ├── admin/
│       ├── tracking/
│       └── push/
│           └── subscribe/
│
├── modules/                          → Lógica de dominio (Vertical Slicing)
│   ├── orders/
│   │   ├── orders.service.ts
│   │   ├── orders.repository.ts
│   │   ├── orders.types.ts
│   │   └── orders.events.ts
│   ├── restaurants/
│   ├── drivers/
│   ├── settlements/
│   └── notifications/
│       ├── push.service.ts           → Web Push via VAPID
│       └── realtime.service.ts       → Broadcast vía Supabase
│
├── lib/
│   ├── db.ts                         → Prisma client
│   ├── supabase-server.ts            → Supabase client server-side (admin)
│   ├── supabase-browser.ts           → Supabase client browser (user session)
│   ├── auth.ts                       → Helpers de auth + roles
│   ├── web-push.ts                   → Suscripciones Web Push
│   └── short-id.ts                   → Generador de shortId único
│
├── middleware.ts                     → Verifica sesión Supabase + redirige por rol
│
├── prisma/
│   ├── schema.prisma                 → Schema + RLS policies como seed SQL
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   ├── manifest-restaurant.json
│   ├── manifest-driver.json
│   ├── manifest-admin.json
│   ├── icons/
│   │   ├── restaurant-192.png
│   │   ├── driver-192.png
│   │   └── admin-192.png
│   └── service-workers/
│       ├── sw-restaurant.js
│       ├── sw-driver.js
│       └── sw-admin.js
│
└── next.config.ts
```

### Por qué route groups en lugar de subdominios

Podrías tener `restaurant.tindivo.pe`, `driver.tindivo.pe`, `admin.tindivo.pe`. Pero eso obliga a manejar CORS, cookies cross-subdomain, y tres deploys. Con route groups sigues teniendo **una URL, un deploy, una sesión**, y cada usuario ve solo su sección porque el middleware redirige por rol.

---

## 4. PWAs — tres apps independientes con un solo backend

### 4.1 · Manifest distinto por app

Cada PWA tiene su propio `manifest.json` para que al instalarse aparezcan como aplicaciones separadas en la pantalla de inicio del celular:

```json
// public/manifest-restaurant.json
{
  "name": "Tindivo Restaurante",
  "short_name": "Tindivo Rest",
  "start_url": "/dashboard",
  "scope": "/dashboard",
  "display": "standalone",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/restaurant-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/restaurant-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Análogamente para `manifest-driver.json` (start_url `/home`) y `manifest-admin.json` (start_url `/monitor`).

### 4.2 · Service Workers especializados

Cada app registra su propio Service Worker, porque las estrategias de caché son distintas:

| App | Estrategia principal | Uso de Web Push |
|---|---|---|
| Restaurante | Stale-while-revalidate + fallback a cache | Opcional (notifica driver asignado, efectivo) |
| Driver | Network-first con cache corto + offline queue | **Crítico** — alerta fuerte al recibir pedido |
| Admin | Network-first, sin caché agresivo | **Crítico** — alertas de emergencia |

### 4.3 · Cómo se instala cada una

1. El usuario entra a `tindivo.pe` e inicia sesión.
2. Según su rol, el middleware lo redirige a `/dashboard`, `/home` o `/monitor`.
3. El navegador detecta el manifest correcto de ese scope y sugiere instalación.
4. Al instalarse, se crea un ícono independiente en la pantalla de inicio.
5. Si el usuario abre la PWA instalada, solo puede navegar dentro del scope de su app.

### 4.4 · Instalación proactiva

Cada app muestra su propio prompt personalizado de "Instalar" al primer login exitoso, con copy específico (ver HU-D-002 en los requerimientos del driver, por ejemplo).

---

## 5. Autenticación — Supabase Auth unificado

### 5.1 · Una sola auth para las tres apps

Supabase Auth gestiona las sesiones con cookies httpOnly. No hay más NextAuth, no hay más JWT manual. Las tres apps usan el mismo mecanismo:

```typescript
// lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

```typescript
// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const supabaseServer = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.delete({ name, ...options }),
      },
    }
  )
}
```

### 5.2 · Roles en Supabase

Los roles (restaurant, driver, admin) viven en la tabla `users` de Prisma y también como `raw_user_meta_data.role` en `auth.users` de Supabase. Esto permite usar `auth.jwt() ->> 'role'` en políticas RLS sin hacer JOIN cada vez.

### 5.3 · Middleware — redirige por rol

```typescript
// middleware.ts
import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(/* ... usa req/res cookies ... */)
  const { data: { user } } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  const isPublic = path.startsWith('/login') || path.startsWith('/pedidos')
  if (isPublic) return res

  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const role = user.user_metadata.role

  if (path.startsWith('/dashboard') && role !== 'restaurant') return redirectByRole(role, req)
  if (path.startsWith('/home') && role !== 'driver') return redirectByRole(role, req)
  if (path.startsWith('/monitor') && role !== 'admin') return redirectByRole(role, req)

  return res
}

function redirectByRole(role: string, req: NextRequest) {
  const map = { restaurant: '/dashboard', driver: '/home', admin: '/monitor' }
  return NextResponse.redirect(new URL(map[role] || '/login', req.url))
}

export const config = {
  matcher: ['/dashboard/:path*', '/home/:path*', '/monitor/:path*', '/orders/:path*'],
}
```

### 5.4 · Sesión persistente

Supabase Auth refresca el token automáticamente cada hora vía el Service Worker. La sesión efectiva dura **indefinidamente mientras el usuario use la app al menos una vez cada 7 días** (configurable). Si pasa más tiempo, expira y se pide re-login.

---

## 6. Realtime — Supabase Realtime (reemplazo de Ably)

### 6.1 · Dos mecanismos distintos

Supabase ofrece dos formas de realtime que usamos en conjunto:

**Mecanismo A · `postgres_changes`** (automático, sin código servidor)
Cada vez que una fila cambia en una tabla, Supabase emite un evento. El cliente se suscribe directamente. **No necesitamos publicar nada manualmente** en los endpoints — la base de datos misma emite los cambios.

**Mecanismo B · Broadcast channels** (manual, para eventos sintéticos)
Para eventos que no son cambios de fila (alertas compuestas, heartbeats, notificaciones cruzadas), usamos broadcast.

### 6.2 · Ejemplo · PWA del restaurante escucha cambios en sus pedidos

```typescript
// En el componente que muestra la lista de pedidos activos
useEffect(() => {
  const supabase = supabaseBrowser()
  const channel = supabase
    .channel('restaurant-orders')
    .on(
      'postgres_changes',
      {
        event: '*',                        // INSERT | UPDATE | DELETE
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        refreshOrders() // re-fetch o aplicar payload directo
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [restaurantId])
```

Cuando el driver acepta el pedido (UPDATE en la tabla orders), el cambio llega automáticamente a todas las pestañas/dispositivos del restaurante que estén escuchando ese canal. **Sin escribir nada en el servidor.**

### 6.3 · Ejemplo · Driver recibe nuevos pedidos disponibles

```typescript
// En app/(driver)/available/page.tsx
const channel = supabase
  .channel('driver-available-orders')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `status=eq.waiting_driver`,
    },
    (payload) => {
      if (payload.new.appears_in_queue_at <= Date.now()) {
        addOrderToQueue(payload.new)
        playNewOrderSound()
      }
    }
  )
  .subscribe()
```

### 6.4 · Ejemplo · Admin escucha alertas

Para alertas que son composiciones (no solo cambios de fila), usamos broadcast:

```typescript
// En el server, cuando se detecta pedido sin aceptar por 90s
const channel = supabase.channel('admin-alerts')
await channel.send({
  type: 'broadcast',
  event: 'order.unaccepted',
  payload: { orderId, shortId, restaurantName, minutesWaiting: 2 },
})
```

```typescript
// En el panel admin
supabase
  .channel('admin-alerts')
  .on('broadcast', { event: 'order.unaccepted' }, ({ payload }) => {
    showAlert(payload)
  })
  .subscribe()
```

### 6.5 · Mapa de canales equivalentes

| Canal Ably antiguo | Reemplazo Supabase |
|---|---|
| `order:{orderId}` · `status_updated` | `postgres_changes` sobre `orders` filtrado por ID |
| `order:{orderId}` · `address_updated` | Mismo (se actualiza `delivery_address` en la fila) |
| `order:{orderId}` · `cancelled` | Mismo (cambia `status` a `cancelled`) |
| `driver:{driverId}` · `order.incoming` | `postgres_changes` INSERT en `orders` donde `status=waiting_driver` |
| `admin:alerts` · `order.unaccepted` | Broadcast `admin-alerts` |
| `admin:alerts` · `driver.went_offline` | Broadcast `admin-alerts` |
| `admin:alerts` · `cash.disputed` | `postgres_changes` sobre `cash_settlements` con `status=disputed` |

### 6.6 · Cuándo preferir cada mecanismo

- **`postgres_changes`** para cambios de estado directos en tablas. Es la mayoría de los casos. Te ahorra código en el servidor.
- **Broadcast** cuando necesitas emitir algo que **no es** un cambio de fila, o cuando quieres enviar un evento compuesto con datos de múltiples tablas ya agregados.

---

## 7. Push Notifications — Web Push API

### 7.1 · Por qué Web Push y no OneSignal u otro

Web Push es **parte del estándar del navegador**: funciona con Service Workers sin SDK externo, es gratis, y Supabase no necesita saber nada al respecto. Solo requiere un par de claves VAPID y guardar la suscripción del usuario en nuestra base.

### 7.2 · Flujo completo

```
┌──────────────────────────────────────────────────────┐
│  1. Usuario da permiso de notificaciones en el nav   │
│  2. Service Worker se suscribe al push service       │
│  3. El navegador devuelve un PushSubscription        │
│  4. Frontend envía la suscripción a nuestro API      │
│  5. Backend guarda en tabla push_subscriptions       │
│                                                      │
│  Cuando pasa algo relevante:                         │
│  6. Servidor envía notificación via web-push lib     │
│  7. Service Worker recibe el push                    │
│  8. Muestra notificación nativa del SO               │
│  9. Usuario toca la notif → abre la PWA en la ruta   │
└──────────────────────────────────────────────────────┘
```

### 7.3 · Guardar suscripción

```typescript
// app/api/push/subscribe/route.ts
export async function POST(req: Request) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json()

  await db.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user.id, endpoint: subscription.endpoint } },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  })

  return Response.json({ subscribed: true })
}
```

### 7.4 · Enviar notificación (servidor)

```typescript
// modules/notifications/push.service.ts
import webpush from 'web-push'
import { db } from '@/lib/db'

webpush.setVapidDetails(
  'mailto:admin@tindivo.pe',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendWebPush(userId: string, payload: {
  title: string
  body: string
  url?: string
  tag?: string
}) {
  const subs = await db.pushSubscription.findMany({ where: { userId } })

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  )
}
```

### 7.5 · Service Worker recibe el push

```javascript
// public/service-workers/sw-driver.js
self.addEventListener('push', (event) => {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/driver-192.png',
      badge: '/icons/badge.png',
      tag: data.tag || 'default',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,   // no se auto-cierra hasta que el user interactúe
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})
```

### 7.6 · Limitaciones honestas de Web Push

- **iOS:** Requiere iOS 16.4+ **y** que la PWA esté instalada en pantalla de inicio. No funciona en Safari "normal".
- **Android:** Funciona muy bien con Chrome y derivados.
- **Sonido:** El sistema operativo controla los tonos. No puedes forzar un sonido custom.
- **Fiabilidad:** Generalmente llega en 1-5 segundos. Puede retrasarse si el navegador optimiza energía agresivamente — de ahí la importancia de que el driver instale la PWA y deshabilite optimizaciones de batería (ver HU-D-007).

---

## 8. Storage — Supabase Storage (reemplazo de Firebase)

Buckets planificados:

| Bucket | Contenido | Acceso |
|---|---|---|
| `restaurant-qrs` | QR de Yape/Plin de cada restaurante | Público (lectura) / admin (escritura) |
| `payment-proofs` | Capturas de pago Yape post-piloto | Restaurante y admin |
| `receipts` | Comprobantes generados | Privado con signed URL |
| `logos` | Logos opcionales de restaurantes | Público |

### Subida desde el panel admin

```typescript
// En el formulario de crear restaurante
const { data, error } = await supabase.storage
  .from('restaurant-qrs')
  .upload(`${restaurantId}/qr.png`, file, { upsert: true, contentType: 'image/png' })

const publicUrl = supabase.storage.from('restaurant-qrs').getPublicUrl(data.path).data.publicUrl
```

### Policies del bucket

Las definimos con SQL desde el schema, análogo a RLS:

```sql
-- Los restaurantes solo pueden leer su propio QR
create policy "Restaurants read own QR"
on storage.objects for select
using (
  bucket_id = 'restaurant-qrs'
  and (storage.foldername(name))[1] = (
    select id::text from restaurants where user_id = auth.uid()
  )
);
```

---

## 9. Vertical Slicing — se mantiene

La arquitectura por dominio sigue igual. La única diferencia es que `orders.events.ts` ya no llama a Ably:

```typescript
// modules/orders/orders.events.ts (antes)
await ably.channels.get(`driver:${driverId}`).publish('order.incoming', order)
await expoPush.sendHighPriority(driverId, { ... })

// modules/orders/orders.events.ts (ahora)
// Realtime: NO hace falta publicar manualmente —
// Supabase emite postgres_changes automáticamente al crear la fila.
// Solo enviamos la push notification.
await sendWebPush(driverUserId, {
  title: 'Nuevo pedido disponible',
  body: `${restaurantName} — ${minutesLeft} min`,
  url: '/available',
  tag: `order-${orderId}`,
})
```

Ganancia: menos código en el servidor. El realtime "se emite solo" porque vive en la DB.

### Reglas de vertical slicing (se mantienen)

- El Route Handler nunca llama a Prisma directamente
- El Repository nunca publica eventos ni envía notificaciones
- El Service no conoce HTTP ni Supabase — solo recibe y devuelve datos
- Los tipos se comparten desde `*.types.ts`, nunca se importan entre módulos

---

## 10. Variables de entorno

```env
# Supabase (unificado: DB, Auth, Realtime, Storage)
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."  # Solo en servidor, NUNCA expuesto

# Prisma usa la misma Postgres de Supabase
DATABASE_URL="postgres://postgres:[password]@db.xxxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres:[password]@db.xxxx.supabase.co:5432/postgres"

# Web Push (VAPID)
VAPID_PUBLIC_KEY="BPxxx..."
VAPID_PRIVATE_KEY="xxx..."
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BPxxx..."    # Mismo que VAPID_PUBLIC_KEY, para el browser

# URLs
NEXT_PUBLIC_APP_URL="https://tindivo.pe"

# Credencial del admin seed (solo dev)
ADMIN_SEED_EMAIL="admin@tindivo.pe"
ADMIN_SEED_PASSWORD="seguro_aleatorio"
```

### Ya no están:

- `ABLY_API_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `NEXTAUTH_SECRET` (Supabase maneja sus propios secrets)
- `JWT_SECRET` (ya no hay JWT manual)
- `EXPO_PUBLIC_API_URL` (no hay mobile)

---

## 11. Deploy

### Vercel (único deploy)

```bash
git push origin main
```

Vercel detecta cambios y hace deploy automático. Las variables de entorno están configuradas en el panel de Vercel.

### Migraciones Prisma

```bash
npx prisma migrate deploy
```

Se ejecutan contra el `DIRECT_URL` de Supabase (bypassing pooler). Se automatizan en un paso del CI/CD o se corren manualmente tras cada merge a main.

### Deploy de Service Workers

Los Service Workers viven en `public/` y Vercel los sirve directamente. Para invalidarlos cuando hay actualizaciones, usamos un hash de versión en el registro:

```typescript
// Al registrar el SW en el cliente
navigator.serviceWorker.register(`/service-workers/sw-driver.js?v=${APP_VERSION}`)
```

### Backups de base de datos

Supabase hace backups automáticos diarios incluidos en todos los planes. No necesitas cron manual. Para restauración puntual, el panel de Supabase permite point-in-time recovery.

---

## 12. Seguridad — RLS como escudo

El cambio más importante de la migración a Supabase es que la **seguridad ya no vive solo en los endpoints**. Con RLS, aunque un endpoint tuviera un bug, la base de datos misma rechaza queries que no cumplen las reglas.

### Ejemplo · Policy para orders

```sql
-- Los restaurantes solo ven sus propios pedidos
create policy "Restaurants can read own orders"
on orders for select
using (
  restaurant_id = (
    select id from restaurants where user_id = auth.uid()
  )
);

-- Los drivers solo ven pedidos que aceptaron o que están waiting_driver
create policy "Drivers can read their orders or available ones"
on orders for select
using (
  driver_id = (select id from drivers where user_id = auth.uid())
  or
  (status = 'waiting_driver' and appears_in_queue_at <= now())
);

-- El admin ve todo
create policy "Admin sees everything"
on orders for all
using (auth.jwt() ->> 'role' = 'admin');

-- Solo el restaurante dueño puede crear pedidos (a su nombre)
create policy "Restaurants create their own orders"
on orders for insert
with check (
  restaurant_id = (select id from restaurants where user_id = auth.uid())
);
```

### Cuándo usar endpoint vs RLS

- **RLS:** para validaciones de acceso a datos ("puede ver esto", "puede modificar esto")
- **Endpoints / Services:** para lógica de negocio ("calcular el vuelto", "verificar que el horario es correcto", "generar shortId único")

RLS no reemplaza la lógica — la **complementa** impidiendo que se saltee por error de código.

---

## 13. Qué cambia en el día a día del desarrollo

### Antes
1. Levantar PostgreSQL en Contabo
2. Configurar PgBouncer
3. Correr backend Next.js en Vercel
4. Correr app móvil Expo en otro repo
5. Configurar Ably para realtime
6. Configurar Firebase para storage
7. Configurar NextAuth + JWT manual por separado
8. Tres flujos de deploy distintos (Vercel, Expo, scripts manuales)

### Ahora
1. Crear proyecto Supabase
2. Correr `prisma migrate deploy`
3. `git push origin main`

**Total de servicios externos necesarios: 2 (Supabase + Vercel)**, ambos con tier gratuito suficiente para el piloto.

---

## 14. Qué pasarle a cada agente constructor

| Agente construye | Archivos que debe recibir |
|---|---|
| Backend + API completo | `arquitectura_v2.md` (este) + `api.md` + `base_de_datos.md` |
| PWA Restaurante | `requerimientos-restaurante.md` + `api.md` + este doc |
| PWA Driver | `requerimientos-motorizado-pwa.md` + `api.md` + este doc |
| Panel Admin | `requerimientos-admin.md` + `api.md` + este doc |
| Página tracking público | `api.md` (sección pública) + este doc |
| Base de datos + migraciones + RLS | `base_de_datos.md` + este doc |

---

## 15. Resumen · qué ganamos con esta arquitectura

1. **Un solo repositorio.** No hay separación web/mobile.
2. **Dos proveedores externos** (Supabase + Vercel) en lugar de cinco.
3. **Una sola autenticación** para las tres apps, con cookies estándar.
4. **Realtime sin código servidor extra** gracias a `postgres_changes`.
5. **Seguridad a nivel de base de datos** (RLS) además de nivel de endpoint.
6. **Instalación de PWA más rápida** que distribuir un APK. Actualizaciones instantáneas sin pasar por ninguna tienda ni OTA tool.
7. **Costo operativo menor:** Supabase Free tier cubre el piloto. Vercel Free cubre el piloto.
8. **Menos superficie de bugs:** menos integraciones, menos código de pegamento, menos cosas que pueden romperse.

**El trade-off:** dependencia de Supabase. Si Supabase cae, todo cae (aunque Supabase tiene SLA 99.9 % en planes de pago). Para el volumen del piloto, es un riesgo manejable.

---

**Esta arquitectura está alineada con los tres documentos de requerimientos de producto (restaurante, driver PWA, admin). Cualquier historia de usuario en esos documentos puede implementarse con este stack sin agregar servicios externos.**
