import { buildReorderMyOrderUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/customer/orders/[id]/reorder
 *
 * Devuelve el detalle (items + modificadores resueltos) de un pedido pasado
 * del cliente autenticado para que la PWA prefille el carrito. NO crea
 * pedido nuevo: solo retorna la estructura compatible con el flujo de
 * /public/customer-orders.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['customer'])
  if (!auth.ok) return auth.response

  const { id } = await params

  const useCase = buildReorderMyOrderUseCase(auth.auth.supabase)
  const result = await useCase.execute({ userId: auth.auth.userId, orderId: id })
  if (result.isFailure) return problem(result.error)
  if (!result.value) return problemCode('NOT_FOUND', 404, 'Pedido no encontrado')

  return NextResponse.json({ order: result.value })
}
