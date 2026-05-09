import { buildAcceptTransferRequestUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/team/transfer-requests/:id/accept
 *
 * Driver A (dueño actual del pedido) acepta la solicitud de transferencia
 * de Driver B. Reusa Order.reassignTo() vía AcceptTransferRequestUseCase.
 * Las otras solicitudes pending del mismo order se invalidan automáticamente.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const useCase = buildAcceptTransferRequestUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    transferRequestId: id,
    ownerDriverId: auth.auth.driverId,
  })
  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
