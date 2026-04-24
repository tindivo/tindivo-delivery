import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const [{ data: settlements, error }, { data: restaurant }] = await Promise.all([
    auth.auth.supabase
      .from('settlements')
      .select(
        'id, period_start, period_end, order_count, total_amount, status, due_date, paid_at, payment_method, payment_note',
      )
      .eq('restaurant_id', auth.auth.restaurantId)
      .order('period_start', { ascending: false })
      .limit(20),
    auth.auth.supabase
      .from('restaurants')
      .select('balance_due, yape_number, qr_url')
      .eq('id', auth.auth.restaurantId)
      .maybeSingle(),
  ])

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({
    balanceDue: Number(restaurant?.balance_due ?? 0),
    yapeNumber: restaurant?.yape_number ?? null,
    qrUrl: restaurant?.qr_url ?? null,
    items: (settlements ?? []).map((s) => ({
      id: s.id,
      periodStart: s.period_start,
      periodEnd: s.period_end,
      orderCount: s.order_count,
      totalAmount: Number(s.total_amount),
      status: s.status,
      dueDate: s.due_date,
      paidAt: s.paid_at,
      paymentMethod: s.payment_method,
      paymentNote: s.payment_note,
    })),
  })
}
