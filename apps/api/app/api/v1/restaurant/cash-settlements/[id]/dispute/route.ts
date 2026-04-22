import { CashSettlements } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/cash-settlements/[id]/dispute
 *
 * El restaurante reporta una diferencia en el monto recibido. Solo se permite
 * desde estado 'delivered'. Se genera una fila en admin_alerts para que el
 * admin resuelva. HU-R-027 + HU-A-012.
 *
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

  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .update({
      status: 'disputed',
      reported_amount: body.data.reportedAmount,
      dispute_note: body.data.note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  // Alerta para el admin (HU-A-012). Usamos admin client porque la RLS de
  // admin_alerts solo permite al rol admin escribir; el restaurante levanta
  // la alerta y el service-role la persiste.
  const adminClient = createAdminClient()
  await adminClient.from('admin_alerts').insert({
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

  return NextResponse.json({ settlementId: data?.id, status: data?.status })
}
