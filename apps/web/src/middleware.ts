import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Role, decodeJwtClaims, getRoles, homePathForRoles } from './lib/supabase/jwt-claims'

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
const ROLE_PATH_PREFIX: Partial<Record<Role, string>> = {
  admin: '/admin',
  restaurant: '/restaurante',
  driver: '/motorizado',
}

const STAFF_ROLES: ReadonlySet<Role> = new Set(['admin', 'restaurant', 'driver'])

/**
 * Dado un path, ¿pertenece al área privada de algún rol staff?
 * Devuelve el rol dueño del path, o `null` si la ruta no corresponde a
 * ningún área rol-específica.
 */
function ownerRoleOfPath(pathname: string): Role | null {
  for (const [role, prefix] of Object.entries(ROLE_PATH_PREFIX) as [Role, string][]) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role
  }
  return null
}

/**
 * Customer puro (sin ningún rol staff) no debe poder usar el back-office.
 * Si llega aquí con sesión activa, lo expulsamos a /login con flag
 * `wrong-app=customer`. Lo mismo aplica para usuarios solo-`business`
 * (sus credenciales viven en tindivo.com, no acá).
 */
function isNonStaffOnly(roles: Role[]): boolean {
  return roles.length > 0 && !roles.some((r) => STAFF_ROLES.has(r))
}

type RedirectContext = {
  pathname: string
  roles: Role[]
  isActive: boolean
  hasSession: boolean
}

type RouteAction = { kind: 'redirect'; path: string } | null

/**
 * Política de enrutamiento del back-office staff:
 *   1. Sin sesión + ruta privada → redirect `/login`
 *   2. Sesión sin roles → redirect `/login`
 *   3. Usuario deshabilitado (`is_active = false`) → redirect `/login?suspended=1`
 *   4. Customer/business puro (sin staff role) → redirect `/login?wrong-app=customer`
 *   5. Autenticado visitando `/login` → redirect al home (prioridad de roles)
 *   6. Autenticado entrando a área de un rol que NO tiene → redirect a su propia home
 *   7. Cualquier otro caso → null (continuar).
 */
function resolveRedirect(ctx: RedirectContext): RouteAction {
  const { pathname, roles, isActive, hasSession } = ctx

  if (!hasSession) {
    return isPublicPath(pathname) ? null : { kind: 'redirect', path: '/login' }
  }

  if (roles.length === 0) {
    return pathname === '/login' ? null : { kind: 'redirect', path: '/login' }
  }

  if (!isActive) {
    if (pathname === '/login' || isPublicPath(pathname)) return null
    return { kind: 'redirect', path: '/login?suspended=1' }
  }

  if (isNonStaffOnly(roles)) {
    return pathname === '/login' ? null : { kind: 'redirect', path: '/login?wrong-app=customer' }
  }

  if (pathname === '/login') {
    return { kind: 'redirect', path: homePathForRoles(roles) }
  }

  const owner = ownerRoleOfPath(pathname)
  if (owner && !roles.includes(owner)) {
    return { kind: 'redirect', path: homePathForRoles(roles) }
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
    roles: getRoles(claims),
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
  matcher: [
    '/((?!_next/static|_next/image|favicon|manifest\\.webmanifest|sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js|icon-.*|apple-touch-icon.*|api/).*)',
  ],
}
