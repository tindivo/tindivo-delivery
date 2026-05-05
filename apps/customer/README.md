# @tindivo/customer

PWA pública para el cliente final. Marketplace de restaurantes + carrito + checkout + tracking en tiempo real.

- Host prod: `https://tindivo.com`
- Host dev: `http://localhost:3002`
- Backend: `apps/api` (mismas envs que `apps/web`)

## Variables de entorno

```bash
# Supabase (compartidas con apps/web)
NEXT_PUBLIC_SUPABASE_URL=https://nwcdxmebsozswnjlblip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo para tracking RPC en server side

# REST API
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1   # dev
# NEXT_PUBLIC_API_URL=https://api.tindivo.com/api/v1   # prod
```

`apps/web` además necesita `NEXT_PUBLIC_CUSTOMER_URL` (apunta a este host) para
construir links de tracking que envía por WhatsApp:

```bash
# .env.local de apps/web
NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3002   # dev
# NEXT_PUBLIC_CUSTOMER_URL=https://tindivo.com   # prod
```

`apps/api` necesita `ALLOWED_ORIGINS` con esta app y `apps/web`:

```bash
# .env.local de apps/api
ALLOWED_ORIGINS=https://tindivo.com,https://delivery.tindivo.com,http://localhost:3000,http://localhost:3002
```

## Levantar local

Desde la raíz del monorepo:

```bash
pnpm install
pnpm dev
```

Esto levanta los 3 dev servers en paralelo:
- `apps/api` en `:3001`
- `apps/web` en `:3000`
- `apps/customer` en `:3002`

Solo este paquete:
```bash
pnpm --filter @tindivo/customer dev
```

## Estructura

```
src/
├── app/
│   ├── layout.tsx        # Root: PWA register + Providers + InstallBanner
│   ├── providers.tsx     # QueryClient (sin RealtimeAuthBridge — anónimo)
│   ├── manifest.ts       # PWA manifest
│   ├── page.tsx          # Marketplace
│   └── pedidos/[shortId]/page.tsx   # Tracking público
├── features/
│   ├── marketplace/      # Lista de locales, menús, carrito, checkout
│   │   ├── components/
│   │   ├── hooks/use-cart.ts
│   │   ├── lib/pricing.ts
│   │   └── services/geolocation.ts
│   ├── tracking/         # Tracking + realtime via RPC get_tracking
│   └── pwa/              # RegisterPWA + InstallPromptBanner
├── lib/
│   ├── api/client.ts     # ApiClient con anon (sin Bearer)
│   └── supabase/
│       ├── client.ts     # createBrowserClient
│       └── use-realtime-channel.ts
├── middleware.ts         # Hoy: passthrough (cliente anónimo)
└── sw.ts                 # Service Worker (offline cache, sin push handlers)
```

## Cuando agreguemos cuentas de cliente

1. Migration: `ALTER TYPE user_role ADD VALUE 'customer'` + tabla `customers`.
2. Extender `custom_access_token_hook` con `customer_id` cuando rol = `customer`.
3. `lib/api/client.ts`: cambiar `getAuthToken: async () => null` a leer la sesión.
4. `middleware.ts`: validar sesión para `/cuenta`, `/mis-pedidos`, `/favoritos`.
5. Agregar páginas `/login`, `/registro` en `app/`.
6. Push notifications: copiar handlers de `apps/web/src/sw.ts` y `auto-heal-push`.

Como cookie jar se aísla por dominio, una sesión en `tindivo.com` NO compite
con sesiones de staff en `delivery.tindivo.com`.
