import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type OrderStatus =
  | 'waiting_driver'
  | 'heading_to_restaurant'
  | 'waiting_at_restaurant'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

const VALID_STATUSES: OrderStatus[] = [
  'waiting_driver',
  'heading_to_restaurant',
  'waiting_at_restaurant',
  'picked_up',
  'delivered',
  'cancelled',
]

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const requested = statusParam
    ? statusParam
        .split(',')
        .filter((s): s is OrderStatus => (VALID_STATUSES as string[]).includes(s))
    : (['delivered', 'cancelled'] as OrderStatus[])
  const statuses = requested.length > 0 ? requested : (['delivered', 'cancelled'] as OrderStatus[])

  // Perú está en UTC-5 (sin DST): el inicio del día local es la medianoche
  // Perú expresada en UTC. Sin esto, un servidor en UTC saltaría a "mañana"
  // a las 19:00 hora Perú y excluiría los pedidos del día Perú.
  const now = new Date()
  const localNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const startLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0),
  )
  const since = new Date(startLocal.getTime() + 5 * 60 * 60 * 1000)

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, drivers(full_name)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .in('status', statuses)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ items: data ?? [] })
}
