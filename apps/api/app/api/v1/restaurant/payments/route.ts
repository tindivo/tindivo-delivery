import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/payments
 * Self-service: el restaurante ve su deuda actual + historial de pagos
 * manuales registrados por el admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data: restaurant, error: restErr } = await auth.auth.supabase
    .from('restaurants')
    .select('id, balance_due, yape_number, qr_url')
    .eq('id', auth.auth.restaurantId)
    .maybeSingle()

  if (restErr) return problemCode('INTERNAL_ERROR', 500, restErr.message)
  if (!restaurant) return problemCode('RESTAURANT_NOT_FOUND', 404)

  const { data: payments, error: payErr } = await auth.auth.supabase
    .from('restaurant_payments')
    .select('id, amount, payment_method, payment_note, paid_at, created_at')
    .eq('restaurant_id', auth.auth.restaurantId)
    .order('paid_at', { ascending: false })
    .limit(100)

  if (payErr) return problemCode('INTERNAL_ERROR', 500, payErr.message)

  return NextResponse.json({
    balanceDue: Number(restaurant.balance_due),
    yapeNumber: restaurant.yape_number,
    qrUrl: restaurant.qr_url,
    items: (payments ?? []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentMethod: p.payment_method,
      paymentNote: p.payment_note,
      paidAt: p.paid_at,
      createdAt: p.created_at,
    })),
  })
}
