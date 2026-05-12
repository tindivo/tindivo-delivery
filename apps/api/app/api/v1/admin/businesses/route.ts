import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/businesses
 * Lista todos los negocios del marketplace publico (tindivo.com) con info del
 * restaurant enlazado (si lo tienen). Solo admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('marketplace_businesses')
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_published, is_verified, delivery_restaurant_id, created_at, updated_at, user_id, users!inner(email), restaurants(id, name, is_active)',
    )
    .order('created_at', { ascending: false })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
