import { buildRejectOrderAssignmentUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/orders/:id/reject
 *
 * El driver rechaza una asignación automática (cron AutoAssign). El pedido
 * vuelve a `driver_id=NULL` (status sigue waiting_driver) y se inserta una
 * fila en `order_assignment_rejections(order_id, driver_id, reason)` para
 * que el cron lo excluya de futuras candidaturas.
 *
 * Solo válido si el invocador es exactamente el driver asignado y el pedido
 * sigue en `waiting_driver`. Si ya transicionó (heading_to_restaurant o
 * posterior), debe usar el flujo de cancelación o reasignación admin.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, Orders.RejectAssignmentRequest)
  if (!body.ok) return body.response

  const useCase = buildRejectOrderAssignmentUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    driverId: auth.auth.driverId,
    reason: body.data.reason,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
