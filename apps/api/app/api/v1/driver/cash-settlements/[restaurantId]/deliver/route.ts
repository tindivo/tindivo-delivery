import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

const Body = z.object({ amount: z.number().nonnegative() })

/**
 * POST /api/v1/driver/cash-settlements/[restaurantId]/deliver
 *
 * Marca efectivo como entregado por el driver al restaurante (pendiente de confirmación).
 * Upsert en cash_settlements con status=delivered y delivered_amount=amount.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { restaurantId } = await params
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return problemCode('INVALID_REQUEST', 400, parsed.error.message)

  const today = new Date().toISOString().slice(0, 10)

  // Calcular total_cash y order_count actuales en el día para este par driver/restaurant
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { data: orders } = await auth.auth.supabase
    .from('orders')
    .select('order_amount')
    .eq('driver_id', auth.auth.driverId)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .eq('payment_status', 'pending_cash')
    .gte('delivered_at', since.toISOString())

  const totalCash = (orders ?? []).reduce((s, o) => s + Number(o.order_amount), 0)
  const orderCount = (orders ?? []).length

  const { data: upserted, error } = await auth.auth.supabase
    .from('cash_settlements')
    .upsert(
      {
        restaurant_id: restaurantId,
        driver_id: auth.auth.driverId,
        settlement_date: today,
        total_cash: Number(totalCash.toFixed(2)),
        order_count: orderCount,
        delivered_amount: parsed.data.amount,
        status: 'delivered',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id,driver_id,settlement_date' },
    )
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ settlementId: upserted?.id, status: upserted?.status })
}
