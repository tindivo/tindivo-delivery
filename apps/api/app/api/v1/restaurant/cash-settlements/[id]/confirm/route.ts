import { CashSettlements } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/cash-settlements/[id]/confirm
 *
 * El restaurante confirma que recibió el efectivo entregado por el driver.
 * Solo se permite si el settlement está en estado 'delivered' (no confirmado
 * ni disputado previamente). HU-R-026.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, CashSettlements.ConfirmCashRequest)
  if (!body.ok) return body.response

  // Verifico que el settlement pertenece al restaurante y está en 'delivered'
  const { data: current } = await auth.auth.supabase
    .from('cash_settlements')
    .select('id, status, restaurant_id')
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

  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .update({
      status: 'confirmed',
      confirmed_amount: body.data.receivedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ settlementId: data?.id, status: data?.status })
}
