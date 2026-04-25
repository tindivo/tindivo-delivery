# CLAUDE.md — Guía para agentes IA

Contexto rápido para futuras sesiones de Claude Code trabajando en este repo.

## Arquitectura

Monorepo Turborepo + pnpm workspaces con:
- 4 apps Next.js 16 (api, admin, restaurant, driver, tracking)
- 7 packages: core (DDD hexagonal), contracts (Zod), supabase, ui, api-client, config
- Backend: Supabase Cloud (Auth + Postgres + Realtime + Edge Functions)

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
pnpm dev              # dev de todo (5 apps paralelas)
pnpm --filter <app> dev
pnpm db:types         # regenerar tipos de Supabase
pnpm db:push          # aplicar migrations
pnpm build
pnpm type-check
pnpm check            # Biome lint + format
```

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
