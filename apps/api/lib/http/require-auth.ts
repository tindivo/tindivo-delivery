import { type ServerClient, createAdminClient, createClientFromJwt } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { problemCode } from './problem'

export type Role = 'admin' | 'restaurant' | 'driver' | 'customer' | 'business'

export type AuthContext = {
  userId: string
  email: string
  /** Roles activos del user. Multi-role: un dueño business puede operar también delivery. */
  roles: Role[]
  /** Primer rol (legacy/back-compat). Igual a roles[0]. */
  role: Role
  restaurantId: string | null
  driverId: string | null
  supabase: ServerClient
}

type AuthResult = { ok: true; auth: AuthContext } | { ok: false; response: Response }

/**
 * Extrae el JWT del header Authorization Bearer y valida el usuario contra Supabase.
 * Si `allowedRoles` está definido, valida que el user tenga al menos uno de
 * esos roles entre los suyos.
 */
export async function requireAuth(req: NextRequest, allowedRoles?: Role[]): Promise<AuthResult> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) {
    return {
      ok: false,
      response: problemCode('UNAUTHENTICATED', 401, 'Falta el header Authorization Bearer'),
    }
  }

  const admin = createAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)

  if (authError || !user) {
    return { ok: false, response: problemCode('INVALID_JWT', 401) }
  }

  const { data: profile } = await admin
    .from('users')
    .select(
      'id, email, role, roles, is_active, drivers:drivers!user_id(id, is_active), restaurants:restaurants!user_id(id, is_active)',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    return { ok: false, response: problemCode('FORBIDDEN', 403, 'Usuario inactivo o sin perfil') }
  }

  const roles = (profile.roles?.length ? profile.roles : [profile.role]) as Role[]

  // PostgREST devuelve los embeds como array (FK 1:1 vía user_id UNIQUE).
  const driverProfile = Array.isArray(profile.drivers) ? profile.drivers[0] : profile.drivers
  const restaurantProfile = Array.isArray(profile.restaurants)
    ? profile.restaurants[0]
    : profile.restaurants

  // Regla multi-rol estricta: si tiene rol driver/restaurant pero su perfil
  // vinculado está inactivo, bloquea aunque también tenga otros roles
  // (incluido admin). El hook JWT ya emite is_active=false para este caso,
  // pero verificamos también server-side para JWTs viejos en circulación.
  if (roles.includes('driver') && driverProfile && !driverProfile.is_active) {
    return {
      ok: false,
      response: problemCode('FORBIDDEN', 403, 'Perfil de motorizado desactivado'),
    }
  }
  if (roles.includes('restaurant') && restaurantProfile && !restaurantProfile.is_active) {
    return {
      ok: false,
      response: problemCode('FORBIDDEN', 403, 'Restaurante desactivado'),
    }
  }

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r))) {
    return {
      ok: false,
      response: problemCode('FORBIDDEN', 403, `Rol requerido: ${allowedRoles.join(', ')}`),
    }
  }

  const restaurantId = restaurantProfile?.id ?? null
  const driverId = driverProfile?.id ?? null

  const supabase = createClientFromJwt(token)

  return {
    ok: true,
    auth: {
      userId: profile.id,
      email: profile.email,
      roles,
      role: roles[0]!,
      restaurantId,
      driverId,
      supabase,
    },
  }
}
