import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/cash-pending
 *
 * Lista pedidos del restaurante autenticado que están en estado `delivered`
 * con `payment_status = pending_cash` y `cash_settlement_id IS NULL` — es
 * decir, el motorizado YA ENTREGÓ el pedido al cliente y cobró efectivo,
 * pero aún no pasó por el restaurante a entregar el dinero (no abrió un
 * settlement). Agrupados por motorizado para que el dueño sepa exactamente
 * cuánto le debe cada uno y por cuántos pedidos.
 *
 * Esto cierra el gap actual: hasta ahora el restaurante solo veía settlements
 * `delivered` (ya enviados por el driver). Con este endpoint también ve la
 * cola previa — un driver puede tener efectivo del restaurante varios pedidos
 * antes de pasar a liquidar, y el restaurante necesita visibilidad en vivo.
 */
type DriverGroup = {
  driverId: string
  driverName: string
  driverPhone: string
  vehicleType: string
  totalCash: number
  orderCount: number
  orders: Array<{
    id: string
    shortId: string
    orderAmount: number
    clientPaysWith: number | null
    cashOwed: number
    deliveredAt: string | null
  }>
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      'id, short_id, order_amount, client_pays_with, delivered_at, driver_id, drivers!inner(id, full_name, phone, vehicle_type)',
    )
    .eq('restaurant_id', auth.auth.restaurantId)
    .eq('status', 'delivered')
    .eq('payment_status', 'pending_cash')
    .is('cash_settlement_id', null)
    .order('delivered_at', { ascending: false })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const byDriver = new Map<string, DriverGroup>()

  for (const o of data ?? []) {
    if (!o.driver_id) continue
    // biome-ignore lint/suspicious/noExplicitAny: join anidado dinámico
    const d = (Array.isArray(o.drivers) ? o.drivers[0] : o.drivers) as any
    if (!d) continue

    // El restaurante recibe el monto que el cliente pagó (client_pays_with)
    // porque adelantó el vuelto al cobrar antes de dar el pedido. Si no se
    // registró client_pays_with, asumimos pago justo (= order_amount).
    const cashOwed = Number(o.client_pays_with ?? o.order_amount)

    const existing: DriverGroup = byDriver.get(o.driver_id) ?? {
      driverId: o.driver_id,
      driverName: d.full_name,
      driverPhone: d.phone,
      vehicleType: d.vehicle_type,
      totalCash: 0,
      orderCount: 0,
      orders: [],
    }
    existing.totalCash = Number((existing.totalCash + cashOwed).toFixed(2))
    existing.orderCount += 1
    existing.orders.push({
      id: o.id,
      shortId: o.short_id,
      orderAmount: Number(o.order_amount),
      clientPaysWith: o.client_pays_with == null ? null : Number(o.client_pays_with),
      cashOwed,
      deliveredAt: o.delivered_at,
    })
    byDriver.set(o.driver_id, existing)
  }

  // Mayor monto adeudado primero — más urgente.
  const items = Array.from(byDriver.values()).sort((a, b) => b.totalCash - a.totalCash)

  return NextResponse.json({ items })
}
