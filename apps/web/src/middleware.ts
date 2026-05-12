import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type TindivoClaims, decodeJwtClaims, homePathForRole } from './lib/supabase/jwt-claims'

/**
 * Rutas que NO requieren sesión. Todo lo demás exige login.
 *
 * `apps/web` es el back-office del staff (admin/restaurant/driver) y vive en
 * `delivery.tindivo.com`. La PWA pública del cliente (marketplace + tracking)
 * vive en `apps/customer` (`tindivo.com`), no aquí. Por eso `/` y `/pedidos/*`
 * dejaron de ser rutas públicas en este host.
 */
const PUBLIC_PATHS = new Set(['/login'])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

/**
 * Prefijo de rutas por rol. Mantener en un solo sitio para que
 * `resolveRedirect` y el `LoginForm` compartan el mapeo.
 */
const ROLE_PATH_PREFIX: Partial<Record<NonNullable<TindivoClaims['user_role']>, string>> = {
  admin: '/admin',
  restaurant: '/restaurante',
  driver: '/motorizado',
}

/**
 * Dado un path, ¿pertenece al área privada de algún rol?
 * Devuelve el rol dueño del path, o `null` si la ruta no corresponde a ningún
 * área rol-específica.
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

/**
 * Cliente customer no debe poder usar el back-office staff. Si llega aquí
 * con sesión activa, el LoginForm o este middleware lo expulsan a /login
 * con flag wrong-app=customer para mostrarle "esta cuenta es de cliente".
 */
function isCustomerOnStaffApp(role: TindivoClaims['user_role']): boolean {
  return role === 'customer'
}

type RedirectContext = {
  pathname: string
  role: TindivoClaims['user_role']
  isActive: boolean
  hasSession: boolean
}

type RouteAction = { kind: 'redirect'; path: string } | null

/**
 * Política de enrutamiento del back-office staff:
 *   1. Sin sesión + ruta privada → redirect `/login`
 *   2. Sesión inválida (sin `user_role`) → redirect `/login`
 *   3. Usuario deshabilitado (`is_active = false`) → redirect `/login?suspended=1`
 *   4. Autenticado visitando `/login` → redirect al home del rol
 *   5. Autenticado entrando a área de OTRO rol → redirect a su propia home
 *   6. Cualquier otro caso → null (continuar).
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

  if (isCustomerOnStaffApp(role)) {
    return pathname === '/login' ? null : { kind: 'redirect', path: '/login?wrong-app=customer' }
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
  //  - favicon (ico, png con sufijos como -16, -32): tags <link rel="icon">
  //  - manifest.webmanifest: manifest PWA, cargado sin sesión por el browser
  //  - sw.js + workbox-*.js + swe-worker-*.js: Service Worker y su entry de
  //    @serwist/next (el browser rechaza registrar un SW detrás de cualquier
  //    redirect; además si lo recibe como text/html explota con
  //    "Unexpected token '<'" al ejecutarlo como JS)
  //  - icon-*, apple-touch-icon*: íconos del manifest cargados sin sesión
  //  - api/*: route handlers internos del web app (validan su propio auth y
  //    no deben recibir el redirect a /login si la sesión es inválida — el
  //    cliente debe poder llamarlos para CERRAR sesión, justamente)
  matcher: [
    '/((?!_next/static|_next/image|favicon|manifest\\.webmanifest|sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js|icon-.*|apple-touch-icon.*|api/).*)',
  ],
}
