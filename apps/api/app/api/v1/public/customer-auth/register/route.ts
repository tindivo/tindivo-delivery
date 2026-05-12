import { problemCode } from '@/lib/http/problem'
import { parseJson } from '@/lib/http/validate'
import { createAdminClient } from '@tindivo/supabase'
import type { TablesInsert } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const RegisterSchema = z
  .object({
    accountType: z.enum(['customer', 'business']).default('customer'),
    email: z.string().email('Email invalido').max(120),
    password: z.string().min(8, 'Minimo 8 caracteres').max(72, 'Maximo 72 caracteres'),
    fullName: z.string().min(2, 'Nombre muy corto').max(80),
    phone: z
      .string()
      .regex(/^9\d{8}$/, 'Celular debe tener 9 digitos y empezar con 9')
      .optional(),
    businessName: z.string().min(2).max(100).optional(),
    address: z.string().min(5).max(220).optional(),
    description: z.string().max(500).optional(),
  })
  .refine((data) => data.accountType === 'customer' || Boolean(data.businessName), {
    message: 'Nombre del negocio requerido',
    path: ['businessName'],
  })
  .refine((data) => data.accountType === 'customer' || Boolean(data.phone), {
    message: 'Celular del negocio requerido',
    path: ['phone'],
  })
  .refine((data) => data.accountType === 'customer' || Boolean(data.address), {
    message: 'Direccion del negocio requerida',
    path: ['address'],
  })

/**
 * POST /api/v1/public/customer-auth/register
 *
 * Crea cuenta de cliente final (rol='customer') o negocio publico
 * (rol='business'). El negocio se crea como una fila en `restaurants` con
 * `is_delivery_enabled=false, is_marketplace_published=true`. Cuando admin
 * "Habilita delivery", se prende el flag (sin crear nada nuevo).
 */
export async function POST(req: NextRequest) {
  const body = await parseJson(req, RegisterSchema)
  if (!body.ok) return body.response

  const admin = createAdminClient()
  const role = body.data.accountType === 'business' ? 'business' : 'customer'

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: body.data.email,
    password: body.data.password,
    email_confirm: true,
    user_metadata: { full_name: body.data.fullName },
  })

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already registered')) {
      return problemCode('VALIDATION_ERROR', 409, 'Este email ya esta registrado')
    }
    return problemCode('INTERNAL_ERROR', 500, authError?.message ?? 'No se pudo crear la cuenta')
  }

  const userId = authData.user.id

  const { error: usersError } = await admin
    .from('users')
    .insert({ id: userId, email: body.data.email, role, is_active: true })

  if (usersError) {
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {
      /* best-effort cleanup */
    }
    return problemCode('INTERNAL_ERROR', 500, usersError.message)
  }

  let profileError: { message: string } | null = null
  if (role === 'business') {
    const restaurantInsert: TablesInsert<'restaurants'> = {
      user_id: userId,
      name: body.data.businessName as string,
      phone: body.data.phone as string,
      address: body.data.address as string,
      description: body.data.description ?? null,
      accent_color: Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')
        .toUpperCase(),
      commission_per_order: 3.0,
      is_active: true,
      is_marketplace_published: true,
      is_delivery_enabled: false,
      is_verified: false,
    }
    const { error } = await admin.from('restaurants').insert(restaurantInsert)
    profileError = error
  } else {
    const { error } = await admin.from('customer_profiles').insert({
      user_id: userId,
      full_name: body.data.fullName,
      phone: body.data.phone ?? null,
    })
    profileError = error
  }

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
      accountType: role,
    },
    { status: 201 },
  )
}
