import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Row = {
  restaurantId: string
  restaurantName: string
  accentColor: string
  totalCash: number
  orderCount: number
  settlementId: string | null
  settlementStatus: string | null
}

/**
 * GET /api/v1/driver/cash-summary
 *
 * Agrupa efectivo PENDIENTE por restaurante. Dos buckets:
 *  1. Pedidos sin liquidar (cash_settlement_id IS NULL) — acumulado fresco que
 *     el driver aún no entregó. Se puede tocar "Entregar".
 *  2. Ciclos activos (status in delivered|disputed) — ya declarados pero sin
 *     confirmar. Se muestran con chip informativo (sin botón entregar).
 *
 * Tras confirmación del restaurante, el settlement queda con status=confirmed
 * y desaparece de la lista (ciclo cerrado). Si el driver entrega un pedido
 * nuevo en efectivo al mismo restaurante, se acumula en bucket (1) y el
 * driver ve una nueva card para declararlo → nuevo ciclo.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  // Bucket 1: pedidos pending_cash delivered que aún no están liquidados
  const { data: unsettledOrders, error: ordersErr } = await auth.auth.supabase
    .from('orders')
    .select('id, order_amount, restaurant_id, restaurants!inner(name, accent_color)')
    .eq('driver_id', auth.auth.driverId)
    .eq('status', 'delivered')
    .eq('payment_status', 'pending_cash')
    .is('cash_settlement_id', null)

  if (ordersErr) return problemCode('INTERNAL_ERROR', 500, ordersErr.message)

  // Bucket 2: settlements activos (delivered/disputed) del driver
  const { data: activeSettlements } = await auth.auth.supabase
    .from('cash_settlements')
    .select(
      'id, restaurant_id, status, delivered_amount, total_cash, order_count, restaurants!inner(name, accent_color)',
    )
    .eq('driver_id', auth.auth.driverId)
    .in('status', ['delivered', 'disputed'])

  const byRestaurant = new Map<string, Row>()

  // Agrupa pedidos sin liquidar (bucket 1)
  for (const o of unsettledOrders ?? []) {
    const r = Array.isArray(o.restaurants) ? o.restaurants[0] : o.restaurants
    if (!r) continue
    const existing = byRestaurant.get(o.restaurant_id) ?? {
      restaurantId: o.restaurant_id,
      restaurantName: r.name,
      accentColor: r.accent_color,
      totalCash: 0,
      orderCount: 0,
      settlementId: null,
      settlementStatus: null,
    }
    existing.totalCash = Number((existing.totalCash + Number(o.order_amount)).toFixed(2))
    existing.orderCount += 1
    byRestaurant.set(o.restaurant_id, existing)
  }

  // Sobrepone info de settlements activos (bucket 2) — si hay ciclo activo
  // para un restaurante y ya hay pedidos sin liquidar, mantenemos el ciclo
  // como status (el driver ve que su entrega sigue pendiente de confirmar y
  // además tiene pedidos nuevos por agregar al mismo ciclo).
  for (const s of activeSettlements ?? []) {
    const r = Array.isArray(s.restaurants) ? s.restaurants[0] : s.restaurants
    if (!r) continue
    const existing = byRestaurant.get(s.restaurant_id) ?? {
      restaurantId: s.restaurant_id,
      restaurantName: r.name,
      accentColor: r.accent_color,
      totalCash: Number(s.total_cash),
      orderCount: s.order_count,
      settlementId: null,
      settlementStatus: null,
    }
    existing.settlementId = s.id
    existing.settlementStatus = s.status
    // El totalCash y orderCount del bucket 1 representan lo NUEVO sin liquidar;
    // el delivered_amount del settlement está aparte. Si no hay unsettled y
    // solo hay settlement activo, mostramos el monto del settlement.
    if (existing.totalCash === 0) {
      existing.totalCash = Number(s.delivered_amount ?? s.total_cash)
      existing.orderCount = s.order_count
    }
    byRestaurant.set(s.restaurant_id, existing)
  }

  return NextResponse.json({ items: Array.from(byRestaurant.values()) })
}
