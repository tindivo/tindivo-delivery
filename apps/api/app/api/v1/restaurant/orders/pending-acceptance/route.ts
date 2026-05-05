import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/orders/pending-acceptance
 *
 * Lista los pedidos del restaurante en estado pending_acceptance. La PWA
 * del restaurante consume este endpoint para mostrar la pestaña "En espera"
 * con el countdown de 5 min y el botón "Aceptar".
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      'id, short_id, client_name, customer_phone, delivery_address, delivery_reference, order_amount, payment_status, prep_minutes, pending_acceptance_at, notes, source, created_at',
    )
    .eq('restaurant_id', auth.auth.restaurantId)
    .eq('status', 'pending_acceptance')
    .order('pending_acceptance_at', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
