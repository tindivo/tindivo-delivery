import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/support-phone
 * Devuelve el número de soporte Tindivo configurado por el admin. Lo usa el
 * UrgentCallCard cuando un pedido del restaurante queda sin driver al vencer
 * el prep_time. Solo rol `restaurant`.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'support_phone')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ phone: data?.value ?? '' })
}
