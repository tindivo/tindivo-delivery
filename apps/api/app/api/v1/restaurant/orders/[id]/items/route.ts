import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/orders/[id]/items
 *
 * Retorna los items del pedido (con modificadores) para que el restaurante
 * vea qué cocinar. Solo aplica a pedidos `source='customer_pwa'` que tienen
 * el desglose en `customer_order_items`. Para pedidos restaurant_pwa devuelve
 * lista vacía (el restaurante ya conoce los items que él mismo creó).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params

  // Validar que el pedido sea del restaurante autenticado
  const { data: order, error: oErr } = await auth.auth.supabase
    .from('orders')
    .select('id, restaurant_id, source')
    .eq('id', id)
    .maybeSingle()

  if (oErr) return problemCode('INTERNAL_ERROR', 500, oErr.message)
  if (!order) return problemCode('ORDER_NOT_FOUND', 404)
  if (order.restaurant_id !== auth.auth.restaurantId) {
    return problemCode('FORBIDDEN', 403, 'El pedido no pertenece a este restaurante')
  }

  // Cargar items + modifiers
  const { data: items, error: itemsErr } = await auth.auth.supabase
    .from('customer_order_items')
    .select(
      'id, item_name, quantity, unit_price, modifiers_total, line_total, notes, created_at',
    )
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  if (itemsErr) return problemCode('INTERNAL_ERROR', 500, itemsErr.message)

  const itemIds = (items ?? []).map((i) => i.id)
  const { data: modifiers } =
    itemIds.length > 0
      ? await auth.auth.supabase
          .from('customer_order_item_modifiers')
          .select('order_item_id, group_name, option_name, price_delta')
          .in('order_item_id', itemIds)
      : { data: [] }

  const modifiersByItem = new Map<
    string,
    Array<{ groupName: string; optionName: string; priceDelta: number }>
  >()
  for (const m of modifiers ?? []) {
    const list = modifiersByItem.get(m.order_item_id) ?? []
    list.push({
      groupName: m.group_name,
      optionName: m.option_name,
      priceDelta: Number(m.price_delta),
    })
    modifiersByItem.set(m.order_item_id, list)
  }

  return NextResponse.json({
    source: order.source,
    items: (items ?? []).map((i) => ({
      id: i.id,
      itemName: i.item_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      modifiersTotal: Number(i.modifiers_total),
      lineTotal: Number(i.line_total),
      notes: i.notes,
      modifiers: modifiersByItem.get(i.id) ?? [],
    })),
  })
}
