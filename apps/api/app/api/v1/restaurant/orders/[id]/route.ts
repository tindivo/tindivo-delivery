import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
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
    .select('*, order_status_history(*), drivers(full_name, phone, vehicle_type)')
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
