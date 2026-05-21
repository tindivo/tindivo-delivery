import { buildMarkPickedUpUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Transición waiting_at_restaurant → picked_up. El body declara la ocupación
 * en mochila (`occupancySlots`, default 1) — el driver lo establece en el
 * modal de confirmación de pickup. Los datos del cliente (phone + coords)
 * deben haberse guardado previamente vía POST /driver/orders/:id/customer-data.
 * Si faltan, el dominio retorna CustomerDataMissing y la UI redirige al form.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, Orders.MarkPickedUpRequest)
  if (!body.ok) return body.response

  const useCase = buildMarkPickedUpUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    driverId: auth.auth.driverId,
    occupancySlots: body.data.occupancySlots,
    deliveryDistanceBand: body.data.deliveryDistanceBand,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
