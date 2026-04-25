import { buildCreateOrderUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/orders
 * Crea un pedido nuevo. Solo rol `restaurant`.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Orders.CreateOrderRequest)
  if (!body.ok) return body.response

  if (!auth.auth.restaurantId) {
    return problemCode('FORBIDDEN', 403, 'El usuario no tiene restaurante asociado')
  }

  // Snapshot de la comisión actual del restaurante. Cambios futuros en
  // restaurants.commission_per_order NO afectan este pedido (consistencia
  // contable: cada pedido conserva su delivery_fee al momento de creación).
  const { data: restaurant, error: rErr } = await auth.auth.supabase
    .from('restaurants')
    .select('commission_per_order')
    .eq('id', auth.auth.restaurantId)
    .single()

  if (rErr || !restaurant) {
    return problemCode('INTERNAL_ERROR', 500, 'No se pudo leer la comisión del restaurante')
  }

  const useCase = buildCreateOrderUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    ...body.data,
    restaurantId: auth.auth.restaurantId,
    commissionPerOrder: Number(restaurant.commission_per_order),
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value, { status: 201 })
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
    .select('*, restaurants!inner(name, accent_color), drivers(full_name)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status as never)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data })
}
