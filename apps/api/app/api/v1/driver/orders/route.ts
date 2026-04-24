import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/orders
 * Lista pedidos activos del driver autenticado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color, address, phone, yape_number, qr_url)')
    .eq('driver_id', auth.auth.driverId)
    .in('status', ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up'])
    .order('created_at', { ascending: false })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
