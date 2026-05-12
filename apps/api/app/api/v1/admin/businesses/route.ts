import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/businesses
 * Lista los locales publicados en el marketplace (tindivo.com). Despues
 * de la unificacion, son filas de `restaurants` con
 * `is_marketplace_published=true`. Solo admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .select(
      'id, name, phone, address, description, accent_color, commission_per_order, is_active, is_marketplace_published, is_verified, is_delivery_enabled, created_at, updated_at, user_id, users!inner(email)',
    )
    .eq('is_marketplace_published', true)
    .order('created_at', { ascending: false })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
