import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type TindivoClaims, decodeJwtClaims, homePathForRole } from './lib/supabase/jwt-claims'

/**
 * Rutas que NO requieren sesión. Todo lo demás exige login.
 * - `/login` — pantalla de autenticación (trata aparte: un usuario ya logueado
 *   rebota a su dashboard en lugar de quedarse aquí).
 * - `/pedidos/:shortId` — tracking público para clientes (link de WhatsApp).
 */
const PUBLIC_PATHS = new Set(['/login'])
const PUBLIC_PREFIXES = ['/pedidos/']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Prefijo de rutas por rol. Mantener en un solo sitio para que
 * `resolveRedirect` y el `LoginForm` compartan el mapeo.
 */
const ROLE_PATH_PREFIX: Record<NonNullable<TindivoClaims['user_role']>, string> = {
  admin: '/admin',
  restaurant: '/restaurante',
  driver: '/motorizado',
}

/**
 * Dado un path, ¿pertenece al área privada de algún rol?
 * Devuelve el rol dueño del path, o `null` si la ruta no corresponde a ningún
 * área rol-específica (ej. `/` o rutas sin matchear).
 */
function ownerRoleOfPath(pathname: string): NonNullable<TindivoClaims['user_role']> | null {
  for (const [role, prefix] of Object.entries(ROLE_PATH_PREFIX) as [
    NonNullable<TindivoClaims['user_role']>,
    string,
  ][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role
  }
  return null
}

type RedirectContext = {
  pathname: string
  role: TindivoClaims['user_role']
  isActive: boolean
  hasSession: boolean
}

/**
 * Acción de enrutamiento. `rewrite` es resolución interna (sin 3xx); `redirect`
 * emite 307/308. Se usa `rewrite` para `/` autenticado porque Serwist cachea
 * navegaciones y iOS Safari rechaza Responses con `redirected: true` en PWA
 * modo standalone ("Response served by service worker has redirections").
 */
type RouteAction = { kind: 'redirect'; path: string } | { kind: 'rewrite'; path: string } | null

/**
 * Política de enrutamiento: decide si la request actual debe ser desviada
 * antes de tocar el controlador de la página.
 *
 * Reglas (aplicadas en este orden):
 *   1. Sin sesión + ruta privada → redirect `/login`
 *   2. Sesión inválida (sin `user_role`) → redirect `/login`
 *   3. Usuario deshabilitado (`is_active = false`) → redirect `/login?suspended=1`
 *   4. Autenticado visitando `/` → **rewrite** al home del rol (sin 3xx, por iOS PWA)
 *   5. Autenticado visitando `/login` → redirect al home del rol
 *   6. Autenticado entrando a área de OTRO rol → redirect a su propia home
 *   7. Cualquier otro caso → null (continuar).
 */
function resolveRedirect(ctx: RedirectContext): RouteAction {
  const { pathname, role, isActive, hasSession } = ctx

  if (!hasSession) {
    return isPublicPath(pathname) ? null : { kind: 'redirect', path: '/login' }
  }

  if (!role) {
    return pathname === '/login' ? null : { kind: 'redirect', path: '/login' }
  }

  if (!isActive) {
    if (pathname === '/login' || isPublicPath(pathname)) return null
    return { kind: 'redirect', path: '/login?suspended=1' }
  }

  // `/` autenticado: rewrite interno. Safari iOS en PWA standalone rechaza
  // responses servidas por el SW con `redirected: true`, y Serwist cachea
  // navegaciones. Con rewrite no hay 3xx que cachear.
  if (pathname === '/') {
    return { kind: 'rewrite', path: homePathForRole(role) }
  }

  if (pathname === '/login') {
    return { kind: 'redirect', path: homePathForRole(role) }
  }

  const owner = ownerRoleOfPath(pathname)
  if (owner && owner !== role) {
    return { kind: 'redirect', path: homePathForRole(role) }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Fast path: tracking público sin tocar Supabase.
  // `/login` NO lo cortamos acá porque sí queremos redirigir si ya hay sesión.
  if (isPublicPath(pathname) && pathname !== '/login') {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    // biome-ignore lint/style/noNonNullAssertion: validated at boot
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // biome-ignore lint/style/noNonNullAssertion: validated at boot
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value } of cookies) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookies) {
            response.cookies.set(name, value, options as never)
          }
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const claims = session?.access_token ? decodeJwtClaims(session.access_token) : {}

  const ctx: RedirectContext = {
    pathname,
    role: claims.user_role,
    isActive: claims.is_active ?? false,
    hasSession: Boolean(session),
  }

  const action = resolveRedirect(ctx)

  if (action && action.path !== pathname) {
    const url = request.nextUrl.clone()
    const [path, qs] = action.path.split('?')
    url.pathname = path as string
    url.search = qs ? `?${qs}` : ''

    if (action.kind === 'rewrite') {
      // Preservar cookies acumuladas por Supabase en `response` (token refresh),
      // sino se pierden al construir el rewrite desde cero.
      const rewriteResponse = NextResponse.rewrite(url, { request })
      for (const cookie of response.cookies.getAll()) {
        rewriteResponse.cookies.set(cookie)
      }
      return rewriteResponse
    }

    return NextResponse.redirect(url)
  }

  return response
}

/**
 * matcher: corre middleware en todo salvo assets estáticos.
 */
export const config = {
  // Excluimos rutas que NO deben pasar por auth/redirect:
  //  - _next/static, _next/image: assets de Next
  //  - favicon, manifest.webmanifest: assets PWA
  //  - sw.js + workbox-*.js: Service Worker (el browser rechaza registrar un
  //    SW detrás de cualquier redirect, incluido uno del middleware)
  //  - icon-*, apple-touch-icon*: íconos del manifest cargados sin sesión
  //  - api/*: route handlers internos del web app (validan su propio auth y
  //    no deben recibir el redirect a /login si la sesión es inválida — el
  //    cliente debe poder llamarlos para CERRAR sesión, justamente)
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|workbox-.*\\.js|icon-.*|apple-touch-icon.*|api/).*)',
  ],
}
