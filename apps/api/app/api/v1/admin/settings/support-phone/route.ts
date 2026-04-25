import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d{0,15}$/, 'Solo dígitos, sin espacios ni signos.')
    .or(z.literal('')),
})

/**
 * GET /api/v1/admin/settings/support-phone
 * Devuelve el número de soporte Tindivo configurado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', 'support_phone')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({
    phone: data?.value ?? '',
    updatedAt: data?.updated_at ?? null,
  })
}

/**
 * PATCH /api/v1/admin/settings/support-phone
 * Actualiza el número de soporte. Body: `{ phone: string }` (solo dígitos,
 * vacío permitido para deshabilitar el botón "Llamar a Tindivo").
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, UpdateSchema)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .upsert(
      { key: 'support_phone', value: body.data.phone, updated_by: auth.auth.userId },
      { onConflict: 'key' },
    )
    .select('value, updated_at')
    .single()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({
    phone: data?.value ?? '',
    updatedAt: data?.updated_at ?? null,
  })
}
