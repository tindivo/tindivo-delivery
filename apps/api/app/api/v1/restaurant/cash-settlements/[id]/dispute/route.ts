import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { CashSettlements } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/cash-settlements/[id]/dispute
 *
 * El cajero reporta diferencia en el monto recibido (HU-R-027). Genera
 * admin_alert para que Tindivo resuelva (HU-A-012). Emite domain event
 * con push al driver para que sepa que está "en revisión".
 * "No discutas en el local" — la app hace de intermediario.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, CashSettlements.DisputeCashRequest)
  if (!body.ok) return body.response

  const { data: current } = await auth.auth.supabase
    .from('cash_settlements')
    .select('id, status, restaurant_id, driver_id, delivered_amount')
    .eq('id', id)
    .maybeSingle()

  if (!current) return problemCode('SETTLEMENT_NOT_FOUND', 404)
  if (current.restaurant_id !== auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)
  if (current.status !== 'delivered') {
    return problemCode(
      'INVALID_STATE_TRANSITION',
      409,
      `No se puede disputar desde estado "${current.status}". Solo desde "delivered".`,
    )
  }

  const now = new Date().toISOString()
  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .update({
      status: 'disputed',
      reported_amount: body.data.reportedAmount,
      dispute_note: body.data.note,
      disputed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const admin = createAdminClient()

  // Alerta admin (RLS admin_alerts es admin-only → service-role)
  await admin.from('admin_alerts').insert({
    type: 'cash_settlement.disputed',
    payload: {
      settlement_id: id,
      restaurant_id: current.restaurant_id,
      driver_id: current.driver_id,
      delivered_amount: current.delivered_amount,
      reported_amount: body.data.reportedAmount,
      note: body.data.note,
    },
  })

  // Push al driver (HU-D-040 comunicación desde la app)
  await admin.from('domain_events').insert({
    aggregate_type: 'CashSettlement',
    aggregate_id: id,
    event_type: 'CashSettlementDisputed',
    payload: {
      driver_id: current.driver_id,
      restaurant_id: current.restaurant_id,
      delivered_amount: current.delivered_amount,
      reported_amount: body.data.reportedAmount,
      note: body.data.note,
    },
  })

  return NextResponse.json({ settlementId: data?.id, status: data?.status })
}
