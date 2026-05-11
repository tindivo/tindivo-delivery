# CLAUDE.md — Guía para agentes IA

Contexto rápido para futuras sesiones de Claude Code trabajando en este repo.

## Arquitectura

Monorepo Turborepo + pnpm workspaces con:
- 3 apps Next.js: `api` (REST, puerto 3001), `web` (back-office staff, 3000),
  `customer` (PWA pública del cliente final, 3002).
- 7 packages: core (DDD hexagonal), contracts (Zod), supabase, ui, api-client, config
- Backend: Supabase Cloud (Auth + Postgres + Realtime + Edge Functions)

### Hosts por app

- `apps/api` → `api.tindivo.com` (o subdominio de Vercel) — REST único.
- `apps/web` → `delivery.tindivo.com` — login admin/restaurant/driver.
- `apps/customer` → `tindivo.com` — marketplace + checkout + tracking público.

Cada app tiene su propio Service Worker, manifest, cookie jar (porque viven en
hosts distintos) y bundle. Reusan los mismos packages compartidos.

## Reglas estrictas

1. **`packages/core`** es dominio puro: NO importar Next.js, React, Supabase
   ni nada externo. Solo `@tindivo/supabase` en `infrastructure/`.
2. **Server Actions prohibidas**: toda mutación pasa por REST (`apps/api`)
   porque planeamos migrar a app móvil nativa.
3. **ORM**: NO Prisma, NO Drizzle. Usar `@supabase/supabase-js` directo con
   tipos generados (`pnpm db:types`).
4. **Vertical slicing por feature** en cada app
   (`apps/*/src/features/<feature>/{components,hooks,services,schemas}`).
5. **Zod en la boundary** (controllers HTTP + clientes), no en el dominio.
6. **Tipos de DB**: siempre `pnpm db:types` tras migrations. No escribir
   tipos a mano.
7. **Material Symbols** como único icon set. **Sin emojis** en código
   (excepto si el usuario lo pide explícitamente).
8. **Bordes muy redondeados** (1rem/2rem/3rem), glassmorfismo en top bars,
   fondo claro absoluto (no dark mode).
9. **Logout siempre con `signOutLocal()`** desde `@tindivo/supabase`.
   NUNCA llamar `supabase.auth.signOut()` directo: el default del SDK es
   `scope: 'global'` y cierra TODAS las sesiones del usuario en TODOS los
   dispositivos (PWA instalada + navegador). Usamos `'local'` para que
   cada dispositivo cierre solo su propia sesión.
10. **`apps/customer` es la PWA pública del cliente final** (tindivo.com).
    NO importar features de admin/restaurant/driver. NO usar `@tindivo/core`
    (es backend-only). NO compartir cookie/SW con `apps/web` — cada uno
    vive en su dominio y aísla sesión. Endpoints públicos en
    `apps/api/app/api/v1/public/*` (sin auth) y deben mantener CORS via
    `lib/http/cors.ts` para aceptar requests desde tindivo.com.
11. **Tracking público** (`/pedidos/:shortId`) vive solo en `apps/customer`.
    Cuando staff genera links del tracking para mandar por WhatsApp, usar
    `customerOrigin()` / `trackingUrl()` de `apps/web/src/lib/urls/customer.ts`
    que apunta a `NEXT_PUBLIC_CUSTOMER_URL` (default `https://tindivo.com`).

## Flujo de desarrollo

- Nueva feature → crear carpeta en `apps/<app>/src/features/<feature>/`
- Nueva entidad → módulo en `packages/core/src/modules/<nombre>/`
  con `domain/`, `application/`, `infrastructure/`
- Nuevo endpoint → archivo en `apps/api/app/api/v1/<path>/route.ts`
  + actualizar `packages/contracts` y `packages/api-client`
- Nuevo componente → `packages/ui/src/primitives/` (shadcn) o
  `packages/ui/src/patterns/` (Tindivo-specific)
- Nueva migration SQL → `supabase/migrations/<timestamp>_<name>.sql` + `pnpm db:push`

## Comandos clave

```bash
pnpm dev              # dev de todo (3 apps paralelas)
pnpm --filter <app> dev
pnpm db:types         # regenerar tipos de Supabase (requiere supabase CLI)
pnpm db:push          # aplicar migrations
pnpm build
pnpm type-check       # turbo: tsc --noEmit en cada paquete (8 packages)
pnpm check            # Biome lint + format
pnpm --filter @tindivo/core test   # vitest run (los tests del dominio)
```

- **Vitest solo está configurado en `packages/core`**. Las apps (`api`, `web`, `customer`) tienen scripts `lint` + `type-check` pero NO `test`.
- Si `supabase` CLI no está instalado globalmente, regenerar tipos vía MCP de Supabase (`generate_typescript_types`) y escribir el resultado a `packages/supabase/src/types.gen.ts`.
- Las migrations se pueden aplicar a producción vía MCP (`apply_migration`) sin necesidad de `pnpm db:push`.

## Módulos del dominio (`packages/core/src/modules/`)

`orders`, `restaurants`, `drivers`, `cash-settlements`, `settlements`, `notifications`, `users`, `platform`, `customer-account`. Cada uno con `domain/`, `application/` (use cases + ports), `infrastructure/` (adaptadores Supabase). El módulo `orders` es el más complejo (15+ use cases, máquina de estados, policy R1-R5 de asignación).

## Sistema de eventos (outbox + triggers + cron failsafe)

Arquitectura event-driven verificada en producción. Latencia P99 objetivo <5s.

- **Outbox**: tabla `domain_events` (`aggregate_type`, `aggregate_id`, `event_type`, `payload`, `published_at`, `retry_count`, `last_error`).
- **Publicación**: use cases del core hacen `events.publishAll(order.pullEvents())` después de `orders.save()`. NO publicar fuera de un use case.
- **Push notifications**: trigger `trg_domain_events_dispatch_push` invoca Edge Function `send-push` vía `pg_net.http_post()` tras cada INSERT en `domain_events`. Mapeo evento→push en `supabase/functions/send-push/index.ts`.
- **Asignación reactiva** (no cron polling):
  - Trigger `trg_orders_reactive_assign_aiu` en `orders` → invoca `/api/v1/internal/orders/assign-one` vía `pg_net` cuando un pedido entra a `status='waiting_driver' AND driver_id IS NULL AND appears_in_queue_at <= now()`.
  - Trigger `trg_rejections_reactive_assign_ai` en `order_assignment_rejections` → mismo endpoint, dispara reasignación tras rechazo.
  - Endpoint `/internal/orders/assign-one` requiere `Authorization: Bearer <SERVICE_ROLE_KEY>`. NO exponer al exterior.
  - Crons `*-failsafe` cada 5 min cubren si pg_net o el endpoint fallan.
- **Transferencia entre motorizados con timeout-as-accept**: en la pestaña Equipo del motorizado, Driver B solicita el pedido de Driver A. A tiene 30s para aceptar/rechazar. **Si no responde, se interpreta como aceptación** (el pedido se transfiere automáticamente). Implementado vía cron `process-expired-transfer-requests` (1 min) → endpoint `/api/v1/internal/transfer-requests/process-expired` → `AutoAcceptExpiredTransferRequestsUseCase`. Si al expirar el solicitante ya no es elegible (capacidad R3 / autorización), cae a `markExpired` (no transfiere). Eventos: `OrderTransferAutoAccepted` (push diferenciado a A y B vía `kind: 'from' | 'to'`), `OrderTransferExpired` (push a B con `reason`).
- **Lock pesimista**: RPC `claim_pending_orders(p_limit)` usa `FOR UPDATE SKIP LOCKED` para que cron y triggers concurrentes no toquen la misma fila. Llamar desde JS con `admin.rpc('claim_pending_orders', { p_limit: 50 })`.
- **`assigned_at`**: columna en `orders` mantenida por trigger `trg_orders_set_assigned_at` BEFORE UPDATE. Setea `now()` cuando `driver_id` pasa de NULL a no-NULL, limpia cuando vuelve a NULL. Usado por `timeout_unaccepted_assignments` (libera reservaciones >90s).

**Reglas de asignación R1-R5** (`driver-assignment.policy.ts`):
- `choose({ restaurantId, occupancySlots }, candidates, rules)` — pasar `order.occupancySlots.value` (no asumir 1).
- `totalAssignedDay` suma `delivered + active + reserved + cancelled + rejected` del día. Driver que rechaza mucho cae al fondo de R4 (self-correcting).
- `findAssignmentCandidates` calcula `rejectedTodayCount` consultando `order_assignment_rejections` filtrado por `expires_at > now()` (TTL 6h).

## Idempotencia en endpoints POST de creación (Stripe pattern)

Resuelve duplicados por doble click / retry de browser. Implementación en `apps/api/lib/http/idempotency.ts`.

- **Cliente** genera UUID v4 por formulario:
  ```ts
  const idem = useIdempotencyKey('restaurante:new-order')  // apps/web/src/lib/idempotency
  mutation.mutate({ body, idempotencyKey: idem.key }, {
    onSuccess: () => idem.consume(),
    onError: (e) => { if (e.status >= 400 && e.status < 500) idem.consume() },
  })
  ```
  - Persiste en `sessionStorage` por `formId` para sobrevivir recargas.
  - Consumir tras 2xx/4xx. NO consumir tras 5xx (permite retry seguro con misma key).

- **Servidor** envuelve el handler:
  ```ts
  return withIdempotency(req, 'restaurant_orders', body.data, admin, async () => {
    // ... lógica del endpoint
    return NextResponse.json(result, { status: 201 })
  })
  ```
  - Sin header `Idempotency-Key` → ejecuta tal cual (back-compat).
  - Misma key + mismo body → respuesta cacheada (status original).
  - Misma key + body distinto → 409 `IDEMPOTENCY_KEY_MISMATCH`.
  - Solo se cachean respuestas <500 (las 5xx permiten retry).
  - Tabla `idempotency_keys` con TTL 24h, prune diario.

- **CORS**: agregar headers nuevos a `apps/api/middleware.ts:40` (`Access-Control-Allow-Headers`). `Idempotency-Key` ya está incluido.

- **Cliente API**: el helper `ApiClient.post(path, body, { idempotencyKey })` lo propaga automáticamente.

## Cron jobs activos (no romper sin razón)

```sql
select jobname, schedule from cron.job order by jobid;
```

| Cron | Frecuencia | Propósito |
|---|---|---|
| `auto-cancel-pending-acceptance` | `* * * * *` | Cancela `pending_acceptance` >5 min sin aceptar (SLA) |
| `auto-close-drivers` | `* * * * *` | Cierra `driver_availability.is_available=true` cuando termina `platform_schedule.endHHMM` (idempotente) |
| `timeout-unaccepted-assignments` | `* * * * *` | Libera `driver_id` y crea rejection si pasaron 90s sin acceptBy |
| `assign-pending-orders-failsafe` | `*/5 * * * *` | Failsafe del trigger reactivo (assign-one) |
| `enqueue-orders-ready-for-drivers-failsafe` | `*/5 * * * *` | Emite `OrderReadyForDrivers` cuando `appears_in_queue_at <= now()` |
| `enqueue-overdue-orders-failsafe` | `*/5 * * * *` | Emite `OrderOverdue` si `estimated_ready_at` pasa sin asignación |
| `process-expired-transfer-requests` | `* * * * *` | Auto-acepta solicitudes de transferencia vencidas (30s) vía endpoint interno. Si solicitante ya no es elegible, marca `expired` (no transfiere) |
| `expire-transfer-requests-failsafe` | `*/5 * * * *` | Failsafe del cron anterior: si pg_net o el endpoint quedan down, marca pending vencidas como `expired` sin transferir |
| `prune-stale-push-subscriptions` | `0 4 * * *` | Limpia suscripciones inactivas >14d |
| `prune-idempotency-keys` | `0 5 * * *` | Limpia keys vencidas (TTL 24h) |
| `prune-expired-rejections` | `0 5 * * *` | Limpia rejections vencidos (TTL 6h) |

`pg_net` requiere secrets en `vault.decrypted_secrets`: `app_internal_api_url` y `service_role_key`. Sin estos, las funciones que invocan endpoints internos (`invoke_assign_one`, `invoke_assign_pending_orders`) loguean notice y retornan sin error.

## Stack reference

- Next.js 16 App Router + Turbopack
- React 19, TypeScript 5.8, Tailwind v4
- Supabase (Auth + Postgres + Realtime + Storage + Edge Functions Deno)
- `@supabase/ssr` para cookies en Next.js
- TanStack Query v5 + Zustand 5
- Motion v12 (ex Framer)
- Leaflet + react-leaflet + OpenStreetMap (NO MapLibre, NO Google Maps)
- Web Push VAPID + `web-push` en Edge Function Deno
- Biome (reemplaza ESLint + Prettier)

## Docs de referencia

- `Docs/arquitectura_v3.md`, `Docs/api_v3.md`, `Docs/base_de_datos_v3.md`
- Requerimientos: `Docs/tindivo-requerimientos-{admin,restaurante,motorizado-pwa}.md`
- Mockup visual: `Mockups/ejemplo.html`
- Plan completo: `C:\Users\mauri\.claude\plans\quiero-crear-un-ecosistema-swift-curry.md`

## Convenciones de nombres

- Archivos: `kebab-case.ts` / `PascalCase.tsx` para componentes
- Clases: `PascalCase`
- Funciones/hooks: `camelCase` (`useX`)
- Tipos/interfaces: `PascalCase`
- Value Objects: `PascalCase` sin "VO"/"Id" redundante
- Tablas DB: `snake_case` (orders, push_subscriptions)
- Enums DB: `snake_case` valor (`waiting_driver`)

## Sesiones multi-dispositivo: comportamiento verificado

Verificado contra producción (`https://delivery.tindivo.com` + GoTrue de
`nwcdxmebsozswnjlblip.supabase.co`):

- **Login con la misma cuenta en otro dispositivo NO invalida la sesión existente.**
  Cada `signInWithPassword` emite un refresh token independiente; los anteriores
  del mismo usuario siguen válidos hasta su expiración natural o hasta que se
  haga `signOutLocal()` desde ese dispositivo.
- **Logout local solo cierra el dispositivo actual.** `signOutLocal()` usa
  `scope: 'local'` (regla #9), que limpia la cookie `sb-*-auth-token` del cliente
  y revoca solo el refresh token de esta sesión en GoTrue. Las demás sesiones
  del usuario en otros dispositivos sobreviven.

## Web Push: limitaciones del SO (verificadas)

El pipeline de push funciona correctamente extremo a extremo (SW registrado en
root layout, Edge Function `send-push` retorna 200 OK consistente, trigger
`trg_domain_events_dispatch_push` invoca via pg_net, VAPID configurado).
La entrega real depende del SO:

- **iOS Safari**: aunque la PWA esté instalada en Home Screen e iOS sea ≥
  16.4, las push pueden tardar minutos en entregarse en background si la app
  no fue abierta recientemente (engagement signals de APNs). Abrir la PWA
  "calienta" el endpoint.
- **Android Chrome**: con Doze Mode/Battery Optimization, las notificaciones
  sin `requireInteraction: true` se tratan como "low priority" y el SO puede
  ocultarlas silenciosamente. Por eso el código añade `requireInteraction +
  vibrate` a los pushes críticos para drivers (`OrderReadyForDrivers`,
  `OrderAssigned`, `OrderOverdue`).
- **Tags**: nunca reutilizar `tag` entre eventos distintos del mismo agregado
  — colapsa el push anterior en FCM/APNs. Patrón usado:
  `tag = \`${event_type}-${shortId}\`` (deduplica retries del mismo evento,
  no eventos diferentes).
- **`silent: false` explícito**: NO declararlo. Algunos browsers tratan
  `silent: false` como "informativo". Omitir el campo deja al UA aplicar el
  default (sonido/vibración).

Para debug en dispositivo: USB debugging Android (`chrome://inspect`) o
Safari DevTools en macOS contra el iPhone — buscar logs `[sw:push]` en la
consola del Service Worker.

### PWA y navegador del mismo origen en el mismo dispositivo COMPARTEN cookie jar

Por diseño de los browsers (Chrome, Safari, Firefox), una PWA instalada en
modo standalone y el navegador normal del mismo origen comparten:

- `document.cookie` (incluyendo `sb-*-auth-token`).
- `localStorage`, `sessionStorage`, `IndexedDB`.
- Service Worker activo.

Por lo tanto **no es posible aislar sesiones** entre browser y PWA del mismo
origen en el mismo dispositivo sin renunciar a SSR cookie-based o cambiar a
subdominios distintos. Esto es comportamiento estándar (Twitter, Gmail,
WhatsApp Web hacen lo mismo).

Para testing multi-rol desde el mismo celular usar:
- Modo incógnito + modo normal (cookie jars distintos).
- Dos navegadores distintos (Chrome + Safari).
- Dos dispositivos físicos.
