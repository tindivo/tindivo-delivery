import {
  buildAcceptOrderByRestaurantUseCase,
  buildAutoAssignOrderUseCase,
} from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const AcceptSchema = z.object({
  prepMinutes: z
    .number()
    .int('prepMinutes debe ser entero')
    .min(10, 'mínimo 10 minutos')
    .max(50, 'máximo 50 minutos')
    .refine((minutes) => minutes % 5 === 0, 'prepMinutes debe ir en intervalos de 5 minutos'),
  readyEarly: z.boolean().optional(),
})

/**
 * POST /api/v1/restaurant/orders/[id]/accept
 *
 * El restaurante acepta un pedido `customer_pwa` en estado pending_acceptance,
 * define el prep_time real, y dispara la asignación automática a driver. El
 * cron auto-cancel ya no afectará este pedido.
 *
 * Body: { prepMinutes: 10..50 en intervalos de 5 }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) {
    return problemCode('FORBIDDEN', 403, 'El usuario no tiene restaurante asociado')
  }

  const body = await parseJson(req, AcceptSchema)
  if (!body.ok) return body.response

  const { id: orderId } = await params

  const acceptUseCase = buildAcceptOrderByRestaurantUseCase(auth.auth.supabase)
  const result = await acceptUseCase.execute({
    orderId,
    restaurantId: auth.auth.restaurantId,
    prepMinutes: body.data.prepMinutes,
    readyEarly: body.data.readyEarly,
  })

  if (result.isFailure) return problem(result.error)

  // Disparar asignación de driver inmediatamente (sin esperar al próximo
  // tick del cron). Usa admin client porque AutoAssignOrderUseCase necesita
  // bypass RLS para leer driver_restaurants y driver_availability.
  const admin = createAdminClient()
  const assign = await buildAutoAssignOrderUseCase(admin).execute({ orderId })
  if (assign.isFailure) return problem(assign.error)

  return NextResponse.json({
    ...result.value,
    autoAssign: assign.isSuccess
      ? {
          assigned: assign.value.assigned,
          driverId: assign.value.driverId,
          reason: assign.value.reason,
        }
      : null,
  })
}
