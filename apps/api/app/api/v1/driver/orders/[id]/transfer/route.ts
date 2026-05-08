import { buildTransferOrderToDriverUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/orders/:id/transfer
 *
 * El motorizado actual transfiere su pedido activo a otro compañero del
 * mismo restaurante. Casos de uso: accidente, moto descompuesta, emergencia
 * personal. Permitido en estados heading_to_restaurant, waiting_at_restaurant,
 * picked_up.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, Orders.TransferOrderRequest)
  if (!body.ok) return body.response

  const useCase = buildTransferOrderToDriverUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    fromDriverId: auth.auth.driverId,
    toDriverId: body.data.toDriverId,
    reason: body.data.reason,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
