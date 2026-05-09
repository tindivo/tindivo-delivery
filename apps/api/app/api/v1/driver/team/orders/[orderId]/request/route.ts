import { buildRequestOrderTransferUseCase } from '@/lib/core/container'
import { withIdempotency } from '@/lib/http/idempotency'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/team/orders/:orderId/request
 *
 * Driver B (autenticado) solicita el pedido :orderId al dueño actual (driver A).
 * Crea una entrada pending en order_transfer_requests con TTL 30s. A recibe
 * push y debe responder vía /accept o /reject.
 *
 * Soporta Idempotency-Key (doble-click safety). El UNIQUE constraint en BD
 * es la barrera real — el wrapper de idempotencia es defensa adicional.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { orderId } = await params
  const admin = createAdminClient()
  const requesterDriverId = auth.auth.driverId

  return withIdempotency(req, 'request_order_transfer', { orderId, requesterDriverId }, admin, async () => {
    const useCase = buildRequestOrderTransferUseCase(auth.auth.supabase)
    const result = await useCase.execute({ orderId, requesterDriverId })
    if (result.isFailure) return problem(result.error)
    return NextResponse.json(result.value, { status: 201 })
  })
}
