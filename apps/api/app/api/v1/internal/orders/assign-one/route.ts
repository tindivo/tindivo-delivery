import { buildAutoAssignOrderUseCase } from '@/lib/core/container'
import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const Body = z.object({
  orderId: z.string().uuid(),
})

/**
 * POST /api/v1/internal/orders/assign-one
 *
 * Endpoint INTERNO. Invocado por triggers PL/pgSQL (vía pg_net) en respuesta
 * a eventos que dejan un pedido elegible para asignación:
 *   - INSERT/UPDATE de `orders` que cumplan
 *     status='waiting_driver' AND driver_id IS NULL AND appears_in_queue_at <= now()
 *   - INSERT en `order_assignment_rejections` (reasignar al instante).
 *
 * A diferencia de `/assign-pending` (cron failsafe que escanea hasta 50 órdenes),
 * este endpoint trabaja sobre UN solo pedido. Latencia objetivo: <500ms.
 *
 * Auth: header `Authorization: Bearer <SERVICE_ROLE_KEY>`. Sin auth válida
 * retorna 401. No expuesto al exterior.
 */
export async function POST(req: NextRequest) {
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token || !expectedKey || token !== expectedKey) {
    return problemCode('UNAUTHENTICATED', 401, 'Internal endpoint requires service role key')
  }

  const raw = await req.json().catch(() => null)
  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    return problemCode('VALIDATION_ERROR', 400, 'orderId requerido (UUID)')
  }

  const admin = createAdminClient()
  const useCase = buildAutoAssignOrderUseCase(admin)
  const result = await useCase.execute({ orderId: parsed.data.orderId })

  if (result.isFailure) {
    // El use case puede fallar por RaceCondition (otra invocación ya lo asignó),
    // que es un no-op desde la perspectiva del trigger: log y devolver 200 con
    // el motivo. NO retornar 5xx para evitar reintentos automáticos de pg_net
    // que generarían carga inútil.
    return NextResponse.json(
      { assigned: false, error: result.error.code ?? 'unknown' },
      { status: 200 },
    )
  }

  return NextResponse.json({
    assigned: result.value.assigned,
    driverId: result.value.driverId,
    reason: result.value.reason,
  })
}
