# Tindivo

Ecosistema de delivery simplificado para pueblos y zonas de baja cobertura. Tres PWAs (admin, restaurante, motorizado) + tracking público + API REST, con arquitectura hexagonal + DDD lite y comunicación realtime.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript 5.8 · Tailwind v4 · shadcn/ui · Motion v12 · TanStack Query v5 · Zustand 5 · Zod · Serwist (PWA)
- **Backend:** Next.js API Routes REST (`apps/api/app/api/v1/*`) · Supabase (Auth + Postgres + Realtime + Storage + Edge Functions)
- **Mapas:** Leaflet + OpenStreetMap + Nominatim. Navegación externa vía Google Maps Directions.
- **Push:** Web Push API nativa (VAPID).
- **Monorepo:** pnpm workspaces + Turborepo + Biome.

## Estructura

```
tindivo/
├── apps/
│   ├── api/           # Backend REST (Next.js API Routes)
│   ├── admin/         # PWA admin (desktop-first)
│   ├── restaurant/    # PWA restaurante (mobile-first)
│   ├── driver/        # PWA motorizado (mobile-first)
│   └── tracking/      # Página pública /pedidos/[shortId]
├── packages/
│   ├── core/          # Dominio hexagonal + DDD lite
│   ├── contracts/     # Zod schemas + OpenAPI
│   ├── api-client/    # Cliente REST tipado
│   ├── supabase/      # Cliente Supabase + tipos generados
│   ├── realtime/      # Wrapper tipado Supabase Realtime
│   ├── ui/            # Design system compartido
│   ├── pwa/           # Utilidades PWA + Serwist
│   ├── i18n/          # Traducciones
│   ├── telemetry/     # Pino + Sentry + OpenTelemetry
│   ├── testing/       # Fixtures + factories
│   └── config/        # tsconfig, biome, tailwind preset
└── supabase/
    ├── migrations/    # Schema SQL + RLS + triggers + cron
    └── functions/     # Edge Functions Deno
```

## Requisitos

- Node.js 24+
- pnpm 9+
- Supabase CLI
- Cuenta Supabase Cloud (o `supabase start` para local)

## Primera vez

```bash
pnpm install
cp .env.example .env.local
# editar .env.local con tus credenciales Supabase

# Generar claves VAPID
npx web-push generate-vapid-keys
# copiar a .env.local

# Tipos desde Supabase
pnpm db:types

# Ejecutar todo en paralelo (api + 4 PWAs)
pnpm dev
```

Apps corren en:
- `api`: http://localhost:3001
- `admin`: http://localhost:3002
- `restaurant`: http://localhost:3003
- `driver`: http://localhost:3004
- `tracking`: http://localhost:3005

## Convenciones

- **Arquitectura hexagonal en `packages/core`** — dominio puro sin dependencias externas. Los adaptadores Supabase viven en `infrastructure/` de cada módulo.
- **Vertical slicing por feature** en cada app (`apps/*/src/features/<feature>/`).
- **REST** (no Server Actions) para soportar migración futura a app móvil nativa.
- **Zod en la boundary** (controllers + client), nunca en el dominio.
- **Tipos generados de Supabase** (`pnpm db:types`), nunca manuales.
- **Material Symbols** como único icon set (sin emojis).
- **Fondo claro** en todas las apps (sin dark mode).

## Scripts raíz

| Script | Descripción |
|---|---|
| `pnpm dev` | Levanta todo en paralelo |
| `pnpm build` | Build de todo |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format |
| `pnpm check` | Biome lint + format + imports |
| `pnpm type-check` | `tsc --noEmit` en cada paquete |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm db:types` | Genera tipos TypeScript desde Supabase |
| `pnpm db:reset` | Resetea DB local |
| `pnpm db:push` | Aplica migrations a Supabase |
| `pnpm db:start` | Inicia Supabase local (Docker) |

## Documentación fuente

- `Docs/arquitectura_v3.md` · Arquitectura de referencia
- `Docs/api_v3.md` · Catálogo de endpoints
- `Docs/base_de_datos_v3.md` · Schema DB
- `Docs/tindivo-requerimientos-admin.md` · Requerimientos admin
- `Docs/tindivo-requerimientos-restaurante.md` · Requerimientos restaurante
- `Docs/tindivo-requerimientos-motorizado-pwa.md` · Requerimientos motorizado
- `Mockups/ejemplo.html` · Referencia visual aprobada

Plan detallado: `C:\Users\mauri\.claude\plans\quiero-crear-un-ecosistema-swift-curry.md`
