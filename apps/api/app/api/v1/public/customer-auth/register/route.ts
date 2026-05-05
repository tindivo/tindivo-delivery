import { problemCode } from '@/lib/http/problem'
import { parseJson } from '@/lib/http/validate'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const RegisterSchema = z.object({
  email: z.string().email('Email inválido').max(120),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
  fullName: z.string().min(2, 'Nombre muy corto').max(80),
  phone: z
    .string()
    .regex(/^9\d{8}$/, 'Celular debe tener 9 dígitos y empezar con 9')
    .optional(),
})

/**
 * POST /api/v1/public/customer-auth/register
 *
 * Crea cuenta de cliente final (rol='customer'). Endpoint público sin auth
 * (CORS whitelist tindivo.com). Crea en orden:
 *   1. auth.users (admin.auth.admin.createUser, email_confirm=true)
 *   2. public.users con role='customer'
 *   3. public.customer_profiles
 * Si alguno falla, hace rollback del paso anterior.
 *
 * Response 201: { userId, email, fullName }. Tras esto, el cliente debe
 * hacer signInWithPassword desde la PWA para obtener sesión.
 */
export async function POST(req: NextRequest) {
  const body = await parseJson(req, RegisterSchema)
  if (!body.ok) return body.response

  const admin = createAdminClient()

  // 1. Crear auth.user con email_confirm=true (sin doble opt-in para
  // simplificar UX en este flujo de delivery local)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: body.data.email,
    password: body.data.password,
    email_confirm: true,
    user_metadata: { full_name: body.data.fullName },
  })

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already registered')) {
      return problemCode('VALIDATION_ERROR', 409, 'Este email ya está registrado')
    }
    return problemCode('INTERNAL_ERROR', 500, authError?.message ?? 'No se pudo crear la cuenta')
  }

  const userId = authData.user.id

  // 2. Insertar en public.users con role='customer'
  const { error: usersError } = await admin
    .from('users')
    .insert({ id: userId, email: body.data.email, role: 'customer', is_active: true })

  if (usersError) {
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {
      /* best-effort cleanup */
    }
    return problemCode('INTERNAL_ERROR', 500, usersError.message)
  }

  // 3. Insertar customer_profile
  const { error: profileError } = await admin.from('customer_profiles').insert({
    user_id: userId,
    full_name: body.data.fullName,
    phone: body.data.phone ?? null,
  })

  if (profileError) {
    try {
      await admin.from('users').delete().eq('id', userId)
    } catch {
      /* best-effort cleanup */
    }
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {
      /* best-effort cleanup */
    }
    return problemCode('INTERNAL_ERROR', 500, profileError.message)
  }

  return NextResponse.json(
    {
      userId,
      email: body.data.email,
      fullName: body.data.fullName,
    },
    { status: 201 },
  )
}
