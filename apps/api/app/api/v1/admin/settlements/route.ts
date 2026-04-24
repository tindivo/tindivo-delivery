import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SettlementStatus = 'pending' | 'paid' | 'overdue'

/**
 * GET /api/v1/admin/settlements?status=pending|paid|overdue|all&restaurantId=<uuid>
 * Lista liquidaciones con el nombre/color/yape del restaurante asociado.
 * Default: status=pending. Orden: due_date asc (las más urgentes primero).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const status = (url.searchParams.get('status') ?? 'pending') as SettlementStatus | 'all'
  const restaurantId = url.searchParams.get('restaurantId')

  let query = auth.auth.supabase
    .from('settlements')
    .select('*, restaurants(name, accent_color, yape_number)')
    .order('due_date', { ascending: true })

  if (status !== 'all') query = query.eq('status', status)
  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const items = (data ?? []).map((row) => {
    const { restaurants, ...rest } = row as typeof row & {
      restaurants: { name: string; accent_color: string; yape_number: string | null } | null
    }
    return {
      ...rest,
      restaurant_name: restaurants?.name ?? '',
      accent_color: restaurants?.accent_color ?? 'FF6B35',
      yape_number: restaurants?.yape_number ?? null,
    }
  })

  return NextResponse.json({ items })
}
