import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SettlementOrderItem = {
  id: string
  shortId: string
  clientName: string | null
  cashOwed: number
  deliveredAt: string | null
}

/**
 * GET /api/v1/restaurant/cash-settlements
 *
 * Lista las liquidaciones de efectivo pendientes de confirmación del
 * restaurante autenticado, más historial reciente. HU-R-025.
 *
 * Cada settlement incluye su desglose de pedidos vinculados (vía
 * `orders.cash_settlement_id`) para que el restaurante pueda ver qué
 * clientes / short_ids componen el monto antes de confirmar.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('cash_settlements')
    .select('*, drivers!inner(full_name, phone, vehicle_type)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .in('status', ['delivered', 'confirmed', 'disputed', 'resolved'])
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const settlements = data ?? []
  const settlementIds = settlements.map((s) => s.id)

  const ordersBySettlementId = new Map<string, SettlementOrderItem[]>()
  if (settlementIds.length > 0) {
    const { data: ordersData, error: ordersErr } = await auth.auth.supabase
      .from('orders')
      .select(
        'id, short_id, client_name, order_amount, cash_amount, client_pays_with, cash_settlement_id, delivered_at',
      )
      .in('cash_settlement_id', settlementIds)

    if (ordersErr) return problemCode('INTERNAL_ERROR', 500, ordersErr.message)

    for (const o of ordersData ?? []) {
      if (!o.cash_settlement_id) continue
      // Misma fórmula que cash-pending y driver/cash-summary: lo que físicamente
      // pasó por manos del driver — cash puro o parte cash de un mixto.
      const cashOwed = Number(o.client_pays_with ?? o.cash_amount ?? o.order_amount)
      const list = ordersBySettlementId.get(o.cash_settlement_id) ?? []
      list.push({
        id: o.id,
        shortId: o.short_id,
        clientName: o.client_name,
        cashOwed: Number(cashOwed.toFixed(2)),
        deliveredAt: o.delivered_at,
      })
      ordersBySettlementId.set(o.cash_settlement_id, list)
    }
  }

  const items = settlements.map((s) => ({
    ...s,
    orders: ordersBySettlementId.get(s.id) ?? [],
  }))

  return NextResponse.json({ items })
}
