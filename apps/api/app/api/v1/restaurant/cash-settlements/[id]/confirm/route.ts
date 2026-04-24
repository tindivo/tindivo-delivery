import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { CashSettlements } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/cash-settlements/[id]/confirm
 *
 * El cajero confirma que recibió el efectivo exacto declarado por el driver
 * (HU-R-026). Solo desde estado `delivered`. Guarda confirmado_* + timestamp
 * + user_id para auditoría. Emite domain event para push al driver.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, CashSettlements.ConfirmCashRequest)
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
      `No se puede confirmar desde estado "${current.status}". Solo desde "delivered".`,
    )
  }

  const now = new Date().toISOString()
  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .update({
      status: 'confirmed',
      confirmed_amount: body.data.receivedAmount,
      confirmed_at: now,
      confirmed_by: auth.auth.userId,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  // Push al driver
  const admin = createAdminClient()
  await admin.from('domain_events').insert({
    aggregate_type: 'CashSettlement',
    aggregate_id: id,
    event_type: 'CashSettlementConfirmed',
    payload: {
      driver_id: current.driver_id,
      restaurant_id: current.restaurant_id,
      confirmed_amount: body.data.receivedAmount,
    },
  })

  return NextResponse.json({ settlementId: data?.id, status: data?.status })
}
