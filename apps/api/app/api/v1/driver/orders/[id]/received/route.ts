import { buildMarkReceivedUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/orders/:id/received
 * Marca el momento en que el driver presionó "Recibí el pedido". El status
 * sigue waiting_at_restaurant — solo persiste received_at. Idempotente.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const useCase = buildMarkReceivedUseCase(auth.auth.supabase)
  const result = await useCase.execute({ orderId: id, driverId: auth.auth.driverId })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
