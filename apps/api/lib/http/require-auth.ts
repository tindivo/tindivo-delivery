import { type ServerClient, createAdminClient, createClientFromJwt } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { problemCode } from './problem'

export type AuthContext = {
  userId: string
  email: string
  role: 'admin' | 'restaurant' | 'driver'
  restaurantId: string | null
  driverId: string | null
  supabase: ServerClient
}

type Role = AuthContext['role']

type AuthResult = { ok: true; auth: AuthContext } | { ok: false; response: Response }

/**
 * Extrae el JWT del header Authorization Bearer y valida el usuario contra Supabase.
 * Si `allowedRoles` está definido, valida que el rol del usuario esté permitido.
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

  // 1. Valida el JWT y obtiene el auth.user (service_role + jwt)
  const admin = createAdminClient()
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token)

  if (authError || !user) {
    return { ok: false, response: problemCode('INVALID_JWT', 401) }
  }

  // 2. Obtiene perfil del usuario en public.users (con service role para bypass RLS)
  const { data: profile } = await admin
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    return { ok: false, response: problemCode('FORBIDDEN', 403, 'Usuario inactivo o sin perfil') }
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return {
      ok: false,
      response: problemCode('FORBIDDEN', 403, `Rol requerido: ${allowedRoles.join(', ')}`),
    }
  }

  // 3. Obtiene restaurantId/driverId según rol
  let restaurantId: string | null = null
  let driverId: string | null = null

  if (profile.role === 'restaurant') {
    const { data } = await admin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    restaurantId = data?.id ?? null
  } else if (profile.role === 'driver') {
    const { data } = await admin.from('drivers').select('id').eq('user_id', user.id).maybeSingle()
    driverId = data?.id ?? null
  }

  // 4. Crea cliente con JWT del usuario (para queries que respeten RLS)
  const supabase = createClientFromJwt(token)

  return {
    ok: true,
    auth: {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      restaurantId,
      driverId,
      supabase,
    },
  }
}
