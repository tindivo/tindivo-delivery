import { buildClaimUrgentOrderUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/orders/:id/claim
 *
 * Un driver toma manualmente un pedido de la cola "Urgente". Combina assignTo
 * + acceptBy en una sola transición atómica (FCFS sin reglas R1-R5). El use
 * case valida:
 *  - Pedido existe en status='waiting_driver' AND urgent_since IS NOT NULL
 *  - Driver tiene fila en `driver_restaurants` para ese restaurante
 *  - Driver tiene espacio en mochila (R3)
 *
 * Si dos drivers tap-ean simultáneamente, el optimistic lock de
 * `OrderRepository.claimUrgent` (UPDATE atómico con WHERE compuesto)
 * garantiza que solo el primero gana — el segundo recibe 409 ORDER_ALREADY_ACCEPTED.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const useCase = buildClaimUrgentOrderUseCase(auth.auth.supabase)
  const result = await useCase.execute({ orderId: id, driverId: auth.auth.driverId })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
