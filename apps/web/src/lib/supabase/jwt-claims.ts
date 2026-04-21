import type { Session } from '@supabase/supabase-js'

/**
 * Claims custom que inyectamos desde el Custom Access Token Hook de Supabase.
 * Ver: supabase/migrations/*_custom_access_token_hook.sql
 */
export type TindivoClaims = {
  user_role?: 'admin' | 'restaurant' | 'driver'
  is_active?: boolean
  restaurant_id?: string
  driver_id?: string
}

/**
 * Decodifica base64url (usado por JWT) a string UTF-8.
 * Isomórfico: usa `atob` en browser y `Buffer` en Node (middleware + SSR).
 */
function base64UrlDecode(input: string): string {
  // base64url → base64
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  if (typeof atob === 'function') {
    // Browser / Edge Runtime
    const binary = atob(padded)
    // Reinterpretar bytes como UTF-8
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  }
  // Node SSR
  // biome-ignore lint/suspicious/noExplicitAny: node Buffer
  return (globalThis as any).Buffer.from(padded, 'base64').toString('utf8')
}

/**
 * Decodifica los claims del JWT sin verificar firma.
 * Seguro para leer claims emitidos por Supabase — en el backend (API Routes)
 * SIEMPRE validar con `supabase.auth.getUser(token)` antes de confiar en ellos.
 */
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
 * Decide la ruta dashboard del usuario según su rol.
 */
export function homePathForRole(role: TindivoClaims['user_role']): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'restaurant':
      return '/restaurante'
    case 'driver':
      return '/motorizado'
    default:
      return '/login'
  }
}
