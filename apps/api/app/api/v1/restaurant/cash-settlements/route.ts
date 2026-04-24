import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/cash-settlements
 *
 * Lista las liquidaciones de efectivo pendientes de confirmación del
 * restaurante autenticado, más historial reciente. HU-R-025.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .select('*, drivers!inner(full_name, phone, vehicle_type)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .in('status', ['delivered', 'confirmed', 'disputed', 'resolved'])
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ items: data ?? [] })
}
