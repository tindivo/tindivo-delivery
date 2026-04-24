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

  const useCase = buildCreateOrderUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    ...body.data,
    restaurantId: auth.auth.restaurantId,
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
