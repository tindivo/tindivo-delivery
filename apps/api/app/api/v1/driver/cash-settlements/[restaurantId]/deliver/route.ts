import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({ amount: z.number().nonnegative() })

/**
 * POST /api/v1/driver/cash-settlements/[restaurantId]/deliver
 *
 * El driver declara que acaba de entregar el efectivo acumulado de pedidos
 * pending_cash al restaurante. Estrategia:
 *
 *  - Busca pedidos `delivered` + `pending_cash` del driver a ese restaurante
 *    que aún NO estén linkeados a ningún settlement (cash_settlement_id IS NULL).
 *  - Si no hay pedidos pendientes → error 409.
 *  - Si ya existe un settlement activo (status=delivered|disputed) con pedidos
 *    linkeados, lo actualiza sumando el nuevo efectivo.
 *  - Si NO hay settlement activo, crea uno nuevo (permite múltiples ciclos
 *    por día tras confirmación previa).
 *  - Marca los pedidos con cash_settlement_id = new settlement.
 *  - Inserta domain_event `CashSettlementDelivered` para notificar al cajero.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { restaurantId } = await params
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return problemCode('VALIDATION_ERROR', 400, parsed.error.message)

  const today = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()

  // 1) Pedidos pendientes de liquidación para este (driver, restaurant)
  // Incluimos pending_cash (todo en efectivo) y pending_mixed (parte en
  // efectivo). Para mixed, cash_amount marca el monto físico que pasó por
  // las manos del driver — el resto fue por Yape directo al restaurante.
  const { data: pendingOrders, error: ordersErr } = await auth.auth.supabase
    .from('orders')
    .select('id, order_amount, cash_amount, client_pays_with')
    .eq('driver_id', auth.auth.driverId)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .in('payment_status', ['pending_cash', 'pending_mixed'])
    .is('cash_settlement_id', null)

  if (ordersErr) return problemCode('INTERNAL_ERROR', 500, ordersErr.message)
  if (!pendingOrders || pendingOrders.length === 0) {
    return problemCode(
      'NO_PENDING_CASH',
      409,
      'No hay pedidos en efectivo pendientes por liquidar.',
    )
  }

  // total_cash refleja lo que físicamente pasó por las manos del driver:
  //   - cash puro: client_pays_with ?? order_amount
  //   - mixto: client_pays_with ?? cash_amount (la parte Yape NO entra)
  const totalCash = Number(
    pendingOrders
      .reduce((s, o) => s + Number(o.client_pays_with ?? o.cash_amount ?? o.order_amount), 0)
      .toFixed(2),
  )
  const orderCount = pendingOrders.length

  // 2) ¿Hay ya un ciclo activo (delivered/disputed) sin confirmar?
  const { data: activeCycle } = await auth.auth.supabase
    .from('cash_settlements')
    .select('id, status, delivered_amount, total_cash, order_count')
    .eq('driver_id', auth.auth.driverId)
    .eq('restaurant_id', restaurantId)
    .in('status', ['delivered', 'disputed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let settlementId: string
  let isNewCycle = false

  if (activeCycle) {
    // Ciclo activo: sumamos el nuevo efectivo al existente
    const prevDelivered = Number(activeCycle.delivered_amount ?? 0)
    const newDelivered = Number((prevDelivered + parsed.data.amount).toFixed(2))
    const newTotalCash = Number((Number(activeCycle.total_cash) + totalCash).toFixed(2))
    const newOrderCount = activeCycle.order_count + orderCount

    const { error: updErr } = await auth.auth.supabase
      .from('cash_settlements')
      .update({
        total_cash: newTotalCash,
        order_count: newOrderCount,
        delivered_amount: newDelivered,
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeCycle.id)

    if (updErr) return problemCode('INTERNAL_ERROR', 500, updErr.message)
    settlementId = activeCycle.id
  } else {
    // Nuevo ciclo: inserta fila fresca
    isNewCycle = true
    const { data: inserted, error: insErr } = await auth.auth.supabase
      .from('cash_settlements')
      .insert({
        restaurant_id: restaurantId,
        driver_id: auth.auth.driverId,
        settlement_date: today,
        total_cash: totalCash,
        order_count: orderCount,
        delivered_amount: parsed.data.amount,
        status: 'delivered',
      })
      .select('id')
      .single()

    if (insErr || !inserted) {
      return problemCode('INTERNAL_ERROR', 500, insErr?.message ?? 'No se pudo crear el cierre')
    }
    settlementId = inserted.id
  }

  // 3) Linkear los pedidos nuevos al settlement (inmutable para auditoría)
  const orderIds = pendingOrders.map((o) => o.id)
  const { error: linkErr } = await admin
    .from('orders')
    .update({ cash_settlement_id: settlementId })
    .in('id', orderIds)

  if (linkErr) return problemCode('INTERNAL_ERROR', 500, linkErr.message)

  // 4) Emitir domain event para push al restaurante (outbox → send-push)
  await admin.from('domain_events').insert({
    aggregate_type: 'CashSettlement',
    aggregate_id: settlementId,
    event_type: 'CashSettlementDelivered',
    payload: {
      restaurant_id: restaurantId,
      driver_id: auth.auth.driverId,
      delivered_amount: parsed.data.amount,
      order_count: orderCount,
      is_new_cycle: isNewCycle,
    },
  })

  return NextResponse.json({ settlementId, status: 'delivered' })
}
