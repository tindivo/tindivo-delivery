import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/cash-summary
 *
 * Agrupa pedidos pagados en efectivo (delivered) del día por restaurante.
 * Incluye el cash_settlement del día si existe para conocer el estado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const today = new Date()
  const todayDate = today.toISOString().slice(0, 10)
  const since = new Date(today)
  since.setHours(0, 0, 0, 0)

  const { data: orders, error } = await auth.auth.supabase
    .from('orders')
    .select('id, order_amount, restaurant_id, restaurants!inner(name, accent_color)')
    .eq('driver_id', auth.auth.driverId)
    .eq('status', 'delivered')
    .eq('payment_status', 'pending_cash')
    .gte('delivered_at', since.toISOString())

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const { data: settlements } = await auth.auth.supabase
    .from('cash_settlements')
    .select('id, restaurant_id, status, delivered_amount, confirmed_amount, reported_amount')
    .eq('driver_id', auth.auth.driverId)
    .eq('settlement_date', todayDate)

  const settlementByRestaurant = new Map<string, (typeof settlements extends (infer U)[] | null ? U : never)>()
  for (const s of settlements ?? []) settlementByRestaurant.set(s.restaurant_id, s)

  type Row = { restaurantId: string; restaurantName: string; accentColor: string; totalCash: number; orderCount: number; settlementId: string | null; settlementStatus: string | null }
  const byRestaurant = new Map<string, Row>()

  for (const o of orders ?? []) {
    const restaurant = Array.isArray(o.restaurants) ? o.restaurants[0] : o.restaurants
    if (!restaurant) continue
    const existing = byRestaurant.get(o.restaurant_id) ?? {
      restaurantId: o.restaurant_id,
      restaurantName: restaurant.name,
      accentColor: restaurant.accent_color,
      totalCash: 0,
      orderCount: 0,
      settlementId: null,
      settlementStatus: null,
    }
    existing.totalCash = Number((existing.totalCash + Number(o.order_amount)).toFixed(2))
    existing.orderCount += 1
    byRestaurant.set(o.restaurant_id, existing)
  }

  // Aplica settlement info + filtra confirmados (ya cerrados)
  const items: Row[] = []
  for (const row of byRestaurant.values()) {
    const settlement = settlementByRestaurant.get(row.restaurantId)
    if (settlement) {
      if (settlement.status === 'confirmed' || settlement.status === 'resolved') continue
      row.settlementId = settlement.id
      row.settlementStatus = settlement.status
    }
    items.push(row)
  }

  return NextResponse.json({ items })
}
