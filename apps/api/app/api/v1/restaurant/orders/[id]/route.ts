import { buildEditOrderByRestaurantUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      '*, order_status_history(*), drivers!orders_driver_id_fkey(full_name, phone, vehicle_type)',
    )
    .eq('id', id)
    .eq('restaurant_id', auth.auth.restaurantId)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('ORDER_NOT_FOUND', 404)

  // Cambios de método de pago hechos por el motorizado en picked_up.
  // domain_events no tiene RLS legible (solo service_role), por eso usamos
  // admin client. Devolvemos el último cambio para que el restaurante vea
  // un badge "Método modificado por motorizado · {fecha}".
  const admin = createAdminClient()
  const { data: paymentChanges } = await admin
    .from('domain_events')
    .select('payload, occurred_at')
    .eq('aggregate_type', 'Order')
    .eq('aggregate_id', id)
    .eq('event_type', 'PaymentMethodChanged')
    .order('occurred_at', { ascending: false })
    .limit(1)

  return NextResponse.json({ ...data, payment_changes: paymentChanges ?? [] })
}

/**
 * PATCH /api/v1/restaurant/orders/[id]
 * Edita campos del pedido por parte del restaurante (nombre cliente, método
 * de pago, monto). Solo permitido en estados waiting_driver,
 * heading_to_restaurant y waiting_at_restaurant. La lógica vive en el
 * UseCase del dominio (packages/core).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, Orders.EditOrderByRestaurantRequest)
  if (!body.ok) return body.response

  const useCase = buildEditOrderByRestaurantUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    restaurantId: auth.auth.restaurantId,
    ...body.data,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
