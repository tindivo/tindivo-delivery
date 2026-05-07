import { buildCheckPlatformScheduleUseCase, buildCreateOrderUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { parseJson } from '@/lib/http/validate'
import { Customer } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type CartLine = {
  menuItemId: string
  itemName: string
  quantity: number
  unitPrice: number
  modifiersTotal: number
  lineTotal: number
  notes: string | null
  modifiers: Array<{ groupName: string; optionName: string; priceDelta: number }>
  prepMinutes: number | null
}

export async function POST(req: NextRequest) {
  const body = await parseJson(req, Customer.CreateCustomerOrderRequest)
  if (!body.ok) return body.response

  const sb = createAdminClient() as any

  const platformCheck = await buildCheckPlatformScheduleUseCase(sb).execute()
  if (platformCheck.isSuccess && !platformCheck.value.isOpen) {
    const nextOpenAt = platformCheck.value.nextOpenAt?.toISOString() ?? null
    return problemCode(
      'PLATFORM_CLOSED',
      403,
      nextOpenAt
        ? `Tindivo esta cerrado. Proxima apertura: ${nextOpenAt}.`
        : 'Tindivo esta cerrado.',
    )
  }

  const { data: restaurant, error: restaurantError } = await sb
    .from('restaurants')
    .select('id, name, is_active, commission_per_order')
    .eq('id', body.data.restaurantId)
    .maybeSingle()

  if (restaurantError) return problemCode('INTERNAL_ERROR', 500, restaurantError.message)
  if (!restaurant || !restaurant.is_active) return problemCode('RESTAURANT_NOT_FOUND', 404)

  const cart = await priceCart(sb, body.data.items, body.data.restaurantId)
  if ('response' in cart) return cart.response

  const subtotal = roundMoney(cart.lines.reduce((sum, line) => sum + line.lineTotal, 0))
  if (subtotal <= 0) return problemCode('VALIDATION_ERROR', 400, 'El carrito no tiene monto')
  if (body.data.paymentStatus === 'pending_cash' && (body.data.clientPaysWith ?? 0) < subtotal) {
    return problemCode('VALIDATION_ERROR', 400, 'El efectivo debe cubrir el total del pedido')
  }

  const prepMinutes = Math.max(10, ...cart.lines.map((line) => line.prepMinutes ?? 20))
  const notes = buildOrderNotes(body.data.notes, cart.lines)

  const createOrder = buildCreateOrderUseCase(sb)
  const created = await createOrder.execute({
    restaurantId: body.data.restaurantId,
    prepMinutes,
    paymentStatus: body.data.paymentStatus,
    orderAmount: subtotal,
    clientPaysWith:
      body.data.paymentStatus === 'pending_cash' ? body.data.clientPaysWith : undefined,
    clientName: body.data.customerName,
    notes,
    commissionPerOrder: Number(restaurant.commission_per_order),
    // 'customer_pwa' marca el pedido para que nazca en pending_acceptance,
    // espere aceptación del restaurante, y NO dispare auto-assign hasta
    // que el restaurante confirme prep_time real.
    source: 'customer_pwa',
  })

  if (created.isFailure) return problem(created.error)

  const orderId = created.value.id

  // Si hay Authorization Bearer con sesión válida de un usuario customer,
  // vinculamos el pedido a su cuenta para que aparezca en su historial.
  // Sin auth (flujo invitado), customer_user_id queda NULL.
  let customerUserId: string | null = null
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (token) {
    const { data: userData } = await sb.auth.getUser(token)
    if (userData?.user) {
      const { data: profile } = await sb
        .from('users')
        .select('id, role, is_active')
        .eq('id', userData.user.id)
        .maybeSingle()
      if (profile?.role === 'customer' && profile.is_active) {
        customerUserId = profile.id
      }
    }
  }

  const update = await sb
    .from('orders')
    .update({
      client_name: body.data.customerName,
      client_phone: body.data.customerPhone,
      customer_phone: body.data.customerPhone,
      customer_user_id: customerUserId,
      delivery_address: body.data.deliveryAddress,
      customer_address: body.data.deliveryAddress,
      delivery_reference: body.data.deliveryReference?.trim() || null,
      delivery_coordinates: `POINT(${body.data.deliveryCoordinates.lng} ${body.data.deliveryCoordinates.lat})`,
      customer_location_accuracy_m: body.data.locationAccuracyM ?? null,
      customer_order_subtotal: subtotal,
    })
    .eq('id', orderId)

  if (update.error) {
    await sb.from('orders').delete().eq('id', orderId)
    return problemCode('INTERNAL_ERROR', 500, update.error.message)
  }

  const itemRows = cart.lines.map((line) => ({
    order_id: orderId,
    menu_item_id: line.menuItemId,
    item_name: line.itemName,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    modifiers_total: line.modifiersTotal,
    line_total: line.lineTotal,
    notes: line.notes,
  }))
  const { data: insertedItems, error: itemError } = await sb
    .from('customer_order_items')
    .insert(itemRows)
    .select('id, menu_item_id')

  if (itemError) {
    await sb.from('orders').delete().eq('id', orderId)
    return problemCode('INTERNAL_ERROR', 500, itemError.message)
  }

  const orderItemIdByMenuItem = new Map<string, string[]>()
  for (const row of insertedItems ?? []) {
    const list = orderItemIdByMenuItem.get(row.menu_item_id) ?? []
    list.push(row.id)
    orderItemIdByMenuItem.set(row.menu_item_id, list)
  }

  const modifierRows: any[] = []
  for (const line of cart.lines) {
    const itemId = orderItemIdByMenuItem.get(line.menuItemId)?.shift()
    if (!itemId) continue
    for (const modifier of line.modifiers) {
      modifierRows.push({
        order_item_id: itemId,
        group_name: modifier.groupName,
        option_name: modifier.optionName,
        price_delta: modifier.priceDelta,
      })
    }
  }

  if (modifierRows.length > 0) {
    const { error: modifierError } = await sb
      .from('customer_order_item_modifiers')
      .insert(modifierRows)
    if (modifierError) {
      await sb.from('orders').delete().eq('id', orderId)
      return problemCode('INTERNAL_ERROR', 500, modifierError.message)
    }
  }

  // Pedido queda en pending_acceptance. El restaurante debe aceptar y
  // definir prep_time real desde su PWA. Cuando lo haga, el endpoint
  // /restaurant/orders/[id]/accept transiciona a waiting_driver y dispara
  // AutoAssignOrderUseCase. Si en 5 min no responde, el cron
  // auto_cancel_unaccepted_orders cancela el pedido.

  return NextResponse.json(
    {
      id: created.value.id,
      shortId: created.value.shortId,
      status: created.value.status,
      estimatedReadyAt: created.value.estimatedReadyAt,
      // Path relativo: el cliente lo concatena con su propio host
      // (`tindivo.com/pedidos/...`) mediante `router.push()`.
      trackingUrl: `/pedidos/${created.value.shortId}`,
      orderAmount: subtotal,
      changeToGive: created.value.changeToGive,
    },
    { status: 201 },
  )
}

async function priceCart(
  sb: any,
  items: Customer.CreateCustomerOrderRequest['items'],
  restaurantId: string,
): Promise<{ lines: CartLine[] } | { response: Response }> {
  const itemIds = [...new Set(items.map((item) => item.menuItemId))]
  const { data: menuItems, error: itemsError } = await sb
    .from('menu_items')
    .select('id, restaurant_id, name, price, prep_minutes, is_available')
    .in('id', itemIds)
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)

  if (itemsError) return { response: problemCode('INTERNAL_ERROR', 500, itemsError.message) }

  const menuItemById = new Map<string, any>((menuItems ?? []).map((item: any) => [item.id, item]))
  if (menuItemById.size !== itemIds.length) {
    return { response: problemCode('VALIDATION_ERROR', 400, 'Hay productos no disponibles') }
  }

  const { data: groups, error: groupsError } = await sb
    .from('menu_modifier_groups')
    .select('id, menu_item_id, name, min_selected, max_selected, is_active')
    .in('menu_item_id', itemIds)
    .eq('is_active', true)

  if (groupsError) return { response: problemCode('INTERNAL_ERROR', 500, groupsError.message) }

  const groupIds = (groups ?? []).map((group: any) => group.id)
  const { data: options, error: optionsError } =
    groupIds.length > 0
      ? await sb
          .from('menu_modifier_options')
          .select('id, group_id, name, price_delta, is_available')
          .in('group_id', groupIds)
          .eq('is_available', true)
      : { data: [], error: null }

  if (optionsError) return { response: problemCode('INTERNAL_ERROR', 500, optionsError.message) }

  const groupsByItem = new Map<string, any[]>()
  const groupById = new Map<string, any>()
  for (const group of groups ?? []) {
    const list = groupsByItem.get(group.menu_item_id) ?? []
    list.push(group)
    groupsByItem.set(group.menu_item_id, list)
    groupById.set(group.id, group)
  }

  const optionById = new Map<string, any>()
  for (const option of options ?? []) optionById.set(option.id, option)

  const lines: CartLine[] = []
  for (const requested of items) {
    const item = menuItemById.get(requested.menuItemId)
    if (!item) {
      return { response: problemCode('VALIDATION_ERROR', 400, 'Hay productos no disponibles') }
    }
    const selectedByGroup = new Map<string, any[]>()
    for (const selected of requested.modifiers ?? []) {
      const group = groupById.get(selected.groupId)
      const option = optionById.get(selected.optionId)
      if (!group || !option || option.group_id !== group.id || group.menu_item_id !== item.id) {
        return { response: problemCode('VALIDATION_ERROR', 400, 'Agregado invalido') }
      }
      const list = selectedByGroup.get(group.id) ?? []
      list.push({ group, option })
      selectedByGroup.set(group.id, list)
    }

    for (const group of groupsByItem.get(item.id) ?? []) {
      const selectedCount = selectedByGroup.get(group.id)?.length ?? 0
      if (selectedCount < group.min_selected || selectedCount > group.max_selected) {
        return {
          response: problemCode('VALIDATION_ERROR', 400, `Seleccion invalida en ${group.name}`),
        }
      }
    }

    const modifiers = [...selectedByGroup.values()].flat().map(({ group, option }) => ({
      groupName: group.name,
      optionName: option.name,
      priceDelta: Number(option.price_delta),
    }))
    const modifiersTotal = roundMoney(
      modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0),
    )
    const unitPrice = Number(item.price)
    const lineTotal = roundMoney((unitPrice + modifiersTotal) * requested.quantity)

    lines.push({
      menuItemId: item.id,
      itemName: item.name,
      quantity: requested.quantity,
      unitPrice,
      modifiersTotal,
      lineTotal,
      notes: requested.notes?.trim() || null,
      modifiers,
      prepMinutes: item.prep_minutes,
    })
  }

  return { lines }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function buildOrderNotes(notes: string | undefined, lines: CartLine[]): string {
  const summary = lines
    .map((line) => {
      const mods =
        line.modifiers.length > 0 ? ` (${line.modifiers.map((m) => m.optionName).join(', ')})` : ''
      const lineNotes = line.notes ? ` - ${line.notes}` : ''
      return `${line.quantity}x ${line.itemName}${mods}${lineNotes}`
    })
    .join('; ')
  return [notes?.trim(), summary].filter(Boolean).join(' | ').slice(0, 300)
}
