import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import {
  decodeJwtClaims,
  homePathForRole,
  type TindivoClaims,
} from './lib/supabase/jwt-claims'

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
 * Política de enrutamiento: decide si la request actual debe ser redirigida
 * antes de tocar el controlador de la página.
 *
 * Retorna el path destino, o `null` si la request puede continuar.
 *
 * Reglas (aplicadas en este orden):
 *   1. Sin sesión + ruta privada → `/login`
 *   2. Sesión inválida (sin `user_role`) → forzar a pasar por `/login`
 *   3. Usuario deshabilitado (`is_active = false`) → `/login?suspended=1`
 *   4. Usuario autenticado y sano visitando `/login` o `/` →
 *      rebota al home del rol (evita el flash del login).
 *   5. Usuario autenticado entrando al área de OTRO rol →
 *      rebota a su propia home (bloquea cross-role, no 403).
 *   6. En cualquier otro caso → null (continuar).
 */
function resolveRedirect(ctx: RedirectContext): string | null {
  const { pathname, role, isActive, hasSession } = ctx

  // (1) No autenticado → solo puede ver rutas públicas.
  if (!hasSession) {
    return isPublicPath(pathname) ? null : '/login'
  }

  // Autenticado a partir de aquí.

  // (2) Sesión sin rol: el JWT existe pero el usuario no tiene perfil
  //     en `public.users` (o el hook aún no corre). No debería pasar en
  //     producción; lo forzamos al login para que el LoginForm haga signOut.
  if (!role) {
    return pathname === '/login' ? null : '/login'
  }

  // (3) Usuario deshabilitado. Solo puede ver `/login` (con query flag para
  //     que el LoginForm muestre un mensaje), y tracking público.
  if (!isActive) {
    if (pathname === '/login' || isPublicPath(pathname)) return null
    return '/login?suspended=1'
  }

  // (4) Si ya está autenticado, ver el login o la raíz no tiene sentido —
  //     rebota a su dashboard.
  if (pathname === '/login' || pathname === '/') {
    return homePathForRole(role)
  }

  // (5) Cross-role: el path pertenece a un área de rol, pero no al rol del
  //     usuario. Lo mandamos a su propia home.
  const owner = ownerRoleOfPath(pathname)
  if (owner && owner !== role) {
    return homePathForRole(role)
  }

  // (6) Todo en orden: deja pasar.
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

  const redirectTo = resolveRedirect(ctx)

  if (redirectTo && redirectTo !== pathname) {
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    // Conservamos `?suspended=1` si el redirect lo trae embebido.
    if (redirectTo.includes('?')) {
      const [path, qs] = redirectTo.split('?')
      url.pathname = path as string
      url.search = qs ? `?${qs}` : ''
    } else {
      url.search = ''
    }
    return NextResponse.redirect(url)
  }

  return response
}

/**
 * matcher: corre middleware en todo salvo assets estáticos.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest).*)',
  ],
}
