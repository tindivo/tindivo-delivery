import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { Orders } from '@tindivo/contracts'
import {
  SupabaseCustomerAddressRepository,
  SupabaseOrderRepository,
} from '@tindivo/core/modules/orders'
import { OrderId } from '@tindivo/core/modules/orders'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const raw = await req.json().catch(() => null as unknown)
  const parsed = Orders.LogAddressCaptureEventRequest.safeParse(raw ?? {})
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        type: 'https://tindivo.pe/errors/validation-error',
        title: 'Datos inválidos',
        status: 400,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
    )
  }

  const { id } = await params
  const orderRepo = new SupabaseOrderRepository(auth.auth.supabase)
  const order = await orderRepo.findById(OrderId.of(id))
  if (!order) {
    return problemCode('NOT_FOUND', 404)
  }

  const customerAddresses = new SupabaseCustomerAddressRepository(auth.auth.supabase)
  try {
    await customerAddresses.logEvent({
      orderId: order.id.value,
      driverId: auth.auth.driverId,
      phone: order.clientPhone,
      action: parsed.data.action,
      accuracyReported: parsed.data.accuracyReported ?? null,
      distanceDraggedM: parsed.data.distanceDraggedM ?? null,
      metadata: parsed.data.metadata ?? {},
    })
  } catch (err) {
    console.error('Error logging address capture event (non-blocking):', err)
  }

  return NextResponse.json({ ok: true })
}
