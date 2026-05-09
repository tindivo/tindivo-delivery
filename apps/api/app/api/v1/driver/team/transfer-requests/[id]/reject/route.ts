import { buildRejectTransferRequestUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/team/transfer-requests/:id/reject
 *
 * Driver A (dueño) rechaza explícitamente la solicitud. El pedido NO cambia
 * de dueño. B recibe push para que busque otro pedido en Equipo.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const useCase = buildRejectTransferRequestUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    transferRequestId: id,
    ownerDriverId: auth.auth.driverId,
  })
  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
