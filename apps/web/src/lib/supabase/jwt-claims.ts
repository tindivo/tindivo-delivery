import type { Session } from '@supabase/supabase-js'

/**
 * Claims custom que inyectamos desde el Custom Access Token Hook de Supabase.
 * El hook emite tanto `user_role` (legacy, = roles[0]) como `user_roles`
 * (array completo). Frontend lee `user_roles ?? [user_role]` para back-compat.
 */
export type Role = 'admin' | 'restaurant' | 'driver' | 'customer' | 'business'

export type TindivoClaims = {
  user_role?: Role
  user_roles?: Role[]
  is_active?: boolean
  restaurant_id?: string
  driver_id?: string
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  if (typeof atob === 'function') {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  }
  // biome-ignore lint/suspicious/noExplicitAny: node Buffer
  return (globalThis as any).Buffer.from(padded, 'base64').toString('utf8')
}

export function decodeJwtClaims(accessToken: string): TindivoClaims & {
  sub?: string
  email?: string
  exp?: number
} {
  const payload = accessToken.split('.')[1]
  if (!payload) return {}
  try {
    return JSON.parse(base64UrlDecode(payload))
  } catch {
    return {}
  }
}

export function getClaimsFromSession(session: Session | null): TindivoClaims {
  if (!session?.access_token) return {}
  return decodeJwtClaims(session.access_token)
}

/**
 * Devuelve los roles del JWT. Usa `user_roles` (array) si el hook nuevo
 * lo emite; fallback a `[user_role]` para JWTs viejos durante la transición.
 */
export function getRoles(claims: TindivoClaims): Role[] {
  if (claims.user_roles && claims.user_roles.length > 0) return claims.user_roles
  if (claims.user_role) return [claims.user_role]
  return []
}

/**
 * Decide la ruta dashboard del usuario en el back-office staff
 * (delivery.tindivo.com). Prioriza admin > restaurant > driver. Si solo tiene
 * roles de customer/business (sin staff), retorna `/login` — esos roles
 * viven en `apps/customer` (tindivo.com) y deben redirigirse fuera del
 * dominio. El middleware detecta el caso y muestra `wrong-app`.
 */
export function homePathForRoles(roles: Role[]): string {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('restaurant')) return '/restaurante'
  if (roles.includes('driver')) return '/motorizado'
  return '/login'
}

/** @deprecated Usa homePathForRoles. Mantenido para callsites que aún pasan un solo rol. */
export function homePathForRole(role: Role | undefined): string {
  return homePathForRoles(role ? [role] : [])
}
