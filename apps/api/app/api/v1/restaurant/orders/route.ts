import {
  buildAutoAssignOrderUseCase,
  buildCheckPlatformScheduleUseCase,
  buildCreateOrderUseCase,
} from '@/lib/core/container'
import { withIdempotency } from '@/lib/http/idempotency'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/orders
 * Crea un pedido nuevo. Solo rol `restaurant`.
 *
 * Idempotencia: si el cliente envía header `Idempotency-Key` (UUID v4), la
 * respuesta se cachea por 24h en `idempotency_keys`. Reintentos con la misma
 * key devuelven la respuesta original sin volver a crear el pedido.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Orders.CreateOrderRequest)
  if (!body.ok) return body.response

  if (!auth.auth.restaurantId) {
    return problemCode('FORBIDDEN', 403, 'El usuario no tiene restaurante asociado')
  }

  // El admin client se necesita tanto para el wrapper de idempotencia (lee/
  // escribe `idempotency_keys`) como para AutoAssignOrderUseCase (bypassea
  // RLS para asignar driver). Singleton — sin overhead.
  const admin = createAdminClient()
  const restaurantId = auth.auth.restaurantId

  return withIdempotency(req, 'restaurant_orders', body.data, admin, async () => {
    // Bloqueo por horario operativo: si la plataforma está cerrada en este
    // instante, rechazamos antes de tocar BD para evitar pedidos huérfanos.
    const platformCheck = await buildCheckPlatformScheduleUseCase(auth.auth.supabase).execute()
    if (platformCheck.isSuccess && !platformCheck.value.isOpen) {
      const nextOpen = platformCheck.value.nextOpenAt
      const detail = nextOpen
        ? `Tindivo está cerrado. Abrimos ${formatNextOpenLima(nextOpen)}.`
        : 'Tindivo está cerrado en este momento.'
      return problemCode('PLATFORM_CLOSED', 403, detail)
    }

    // Snapshot de la comisión actual del restaurante. Cambios futuros en
    // restaurants.commission_per_order NO afectan este pedido (consistencia
    // contable: cada pedido conserva su delivery_fee al momento de creación).
    const { data: restaurant, error: rErr } = await auth.auth.supabase
      .from('restaurants')
      .select('commission_per_order')
      .eq('id', restaurantId)
      .single()

    if (rErr || !restaurant) {
      return problemCode('INTERNAL_ERROR', 500, 'No se pudo leer la comisión del restaurante')
    }

    const useCase = buildCreateOrderUseCase(auth.auth.supabase)
    const result = await useCase.execute({
      ...body.data,
      restaurantId,
      commissionPerOrder: Number(restaurant.commission_per_order),
    })

    if (result.isFailure) return problem(result.error)

    const autoAssign = buildAutoAssignOrderUseCase(admin)
    const assignment = await autoAssign.execute({ orderId: result.value.id })
    if (assignment.isFailure) return problem(assignment.error)

    return NextResponse.json(result.value, { status: 201 })
  })
}

/**
 * GET /api/v1/restaurant/orders
 * Lista pedidos del restaurante autenticado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const status = req.nextUrl.searchParams.get('status')

  let query = auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color), drivers!orders_driver_id_fkey(full_name)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status as never)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data })
}

function formatNextOpenLima(date: Date): string {
  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}
