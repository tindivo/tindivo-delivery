import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  CustomerOrderDetailWithItems,
  CustomerOrderHistoryItem,
  CustomerProfileRepository,
} from '../application/ports/customer-profile.repository'
import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from '../domain/entities/customer-profile'

function readPoint(coords: unknown): { lat: number; lng: number } | null {
  // Las columnas geography vuelven como string WKB hex en supabase-js. Para
  // simplicidad leemos lat/lng generated columns si existieran; si no, null.
  if (coords && typeof coords === 'object' && 'lat' in coords && 'lng' in coords) {
    const c = coords as { lat: number; lng: number }
    return { lat: Number(c.lat), lng: Number(c.lng) }
  }
  return null
}

export class SupabaseCustomerProfileRepository implements CustomerProfileRepository {
  constructor(private readonly sb: ServerClient) {}

  async findByUserId(userId: string): Promise<CustomerProfile | null> {
    const { data, error } = await this.sb
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new PersistenceError(error.message, error)
    if (!data) return null
    return {
      userId: data.user_id,
      fullName: data.full_name,
      phone: data.phone,
      defaultAddress: data.default_address,
      defaultReference: data.default_reference,
      defaultCoordinates: readPoint(data.default_coordinates),
      defaultLocationAccuracyM: data.default_location_accuracy_m,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  async insert(profile: CustomerProfile): Promise<void> {
    const { error } = await this.sb.from('customer_profiles').insert({
      user_id: profile.userId,
      full_name: profile.fullName,
      phone: profile.phone,
      default_address: profile.defaultAddress,
      default_reference: profile.defaultReference,
      default_coordinates: profile.defaultCoordinates
        ? `POINT(${profile.defaultCoordinates.lng} ${profile.defaultCoordinates.lat})`
        : null,
      default_location_accuracy_m: profile.defaultLocationAccuracyM,
    })
    if (error) throw new PersistenceError(error.message, error)
  }

  async update(userId: string, update: CustomerProfileUpdate): Promise<CustomerProfile> {
    type Row = {
      full_name?: string
      phone?: string | null
      default_address?: string | null
      default_reference?: string | null
      default_coordinates?: string | null
      default_location_accuracy_m?: number | null
    }
    const row: Row = {}
    if (update.fullName !== undefined) row.full_name = update.fullName
    if (update.phone !== undefined) row.phone = update.phone
    if (update.defaultAddress !== undefined) row.default_address = update.defaultAddress
    if (update.defaultReference !== undefined) row.default_reference = update.defaultReference
    if (update.defaultCoordinates !== undefined) {
      row.default_coordinates = update.defaultCoordinates
        ? `POINT(${update.defaultCoordinates.lng} ${update.defaultCoordinates.lat})`
        : null
    }
    if (update.defaultLocationAccuracyM !== undefined) {
      row.default_location_accuracy_m = update.defaultLocationAccuracyM
    }

    const { data, error } = await this.sb
      .from('customer_profiles')
      .update(row as never)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw new PersistenceError(error.message, error)
    return {
      userId: data.user_id,
      fullName: data.full_name,
      phone: data.phone,
      defaultAddress: data.default_address,
      defaultReference: data.default_reference,
      defaultCoordinates: readPoint(data.default_coordinates),
      defaultLocationAccuracyM: data.default_location_accuracy_m,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  async listOrders(userId: string, limit: number): Promise<CustomerOrderHistoryItem[]> {
    const { data, error } = await this.sb
      .from('orders')
      .select(
        'id, short_id, status, source, restaurant_id, order_amount, payment_status, created_at, delivered_at, cancelled_at, restaurants!inner(name, accent_color)',
      )
      .eq('customer_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map((row) => {
      // biome-ignore lint/suspicious/noExplicitAny: nested join
      const r = row as any
      return {
        id: r.id,
        shortId: r.short_id,
        status: r.status,
        source: r.source ?? 'restaurant_pwa',
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurants?.name ?? '',
        restaurantAccentColor: r.restaurants?.accent_color ?? 'ab3500',
        orderAmount: Number(r.order_amount),
        paymentStatus: r.payment_status,
        createdAt: r.created_at,
        deliveredAt: r.delivered_at,
        cancelledAt: r.cancelled_at,
      }
    })
  }

  async getOrderDetailWithItems(
    userId: string,
    orderId: string,
  ): Promise<CustomerOrderDetailWithItems | null> {
    const { data: order, error: oErr } = await this.sb
      .from('orders')
      .select(
        'id, short_id, restaurant_id, status, order_amount, payment_status, created_at, customer_user_id',
      )
      .eq('id', orderId)
      .maybeSingle()
    if (oErr) throw new PersistenceError(oErr.message, oErr)
    if (!order || order.customer_user_id !== userId) return null

    const { data: items, error: iErr } = await this.sb
      .from('customer_order_items')
      .select('id, menu_item_id, item_name, quantity, notes')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (iErr) throw new PersistenceError(iErr.message, iErr)

    // Cargar todos los modificadores de los items en una query y mapear por order_item_id
    const itemIds = (items ?? []).map((i) => i.id)
    const { data: modifiers } =
      itemIds.length > 0
        ? await this.sb
            .from('customer_order_item_modifiers')
            .select('order_item_id, group_name, option_name')
            .in('order_item_id', itemIds)
        : { data: [] }

    // Para reordenar necesitamos los IDs de los grupos/opciones actuales
    // (no los snapshots de nombres). Buscamos por restaurant + nombre exacto.
    const { data: groups } = await this.sb
      .from('menu_modifier_groups')
      .select('id, name, menu_item_id, menu_items!inner(restaurant_id)')
      .eq('menu_items.restaurant_id', order.restaurant_id)
      .eq('is_active', true)
    const { data: options } = await this.sb
      .from('menu_modifier_options')
      .select('id, name, group_id')
      .eq('is_available', true)

    const groupByMenuItemAndName = new Map<string, string>()
    // biome-ignore lint/suspicious/noExplicitAny: nested join
    for (const g of (groups ?? []) as any[]) {
      groupByMenuItemAndName.set(`${g.menu_item_id}|${g.name}`, g.id)
    }
    const optionByGroupAndName = new Map<string, string>()
    for (const o of options ?? []) {
      optionByGroupAndName.set(`${o.group_id}|${o.name}`, o.id)
    }

    const itemModifiers = new Map<
      string,
      Array<{ groupId: string; optionId: string }>
    >()
    for (const m of modifiers ?? []) {
      const item = items?.find((i) => i.id === m.order_item_id)
      if (!item?.menu_item_id) continue
      const groupId = groupByMenuItemAndName.get(`${item.menu_item_id}|${m.group_name}`)
      const optionId = groupId
        ? optionByGroupAndName.get(`${groupId}|${m.option_name}`)
        : undefined
      if (!groupId || !optionId) continue
      const list = itemModifiers.get(m.order_item_id) ?? []
      list.push({ groupId, optionId })
      itemModifiers.set(m.order_item_id, list)
    }

    return {
      id: order.id,
      shortId: order.short_id,
      restaurantId: order.restaurant_id,
      status: order.status,
      orderAmount: Number(order.order_amount),
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      items: (items ?? []).map((i) => ({
        menuItemId: i.menu_item_id,
        itemName: i.item_name,
        quantity: i.quantity,
        notes: i.notes,
        modifiers: itemModifiers.get(i.id) ?? [],
      })),
    }
  }
}
