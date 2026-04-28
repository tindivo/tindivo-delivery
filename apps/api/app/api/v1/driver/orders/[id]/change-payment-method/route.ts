import { buildChangePaymentMethodUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/driver/orders/{id}/change-payment-method
 * Permite al motorizado cambiar el método de pago de un pedido en
 * status=picked_up. Caso real: el cliente cambia de idea en la puerta
 * (de Yape a efectivo o viceversa, o decide pagar parte y parte).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const body = await parseJson(req, Orders.ChangePaymentMethodRequest)
  if (!body.ok) return body.response

  const useCase = buildChangePaymentMethodUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    driverId: auth.auth.driverId,
    newPaymentStatus: body.data.paymentStatus,
    yapeAmount: body.data.yapeAmount,
    cashAmount: body.data.cashAmount,
    clientPaysWith: body.data.clientPaysWith,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
