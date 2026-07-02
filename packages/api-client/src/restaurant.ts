import type { Restaurants } from '@tindivo/contracts'
import type { ApiClient } from './client'

export type RestaurantProfile = {
  id: string
  name: string
  phone: string
  address: string
  yapeNumber: string | null
  qrUrl: string | null
  accentColor: string
  isActive: boolean
  balanceDue: number
  email: string
}

export type RestaurantPaymentItem = {
  id: string
  amount: number
  paymentMethod: 'yape' | 'plin' | 'cash' | 'bank_transfer' | 'other'
  paymentNote: string | null
  paidAt: string
  createdAt: string
}

export type RestaurantPaymentsResponse = {
  balanceDue: number
  yapeNumber: string | null
  qrUrl: string | null
  items: RestaurantPaymentItem[]
}

export type Settlement = {
  id: string
  periodStart: string
  periodEnd: string
  orderCount: number
  totalAmount: number
  status: 'pending' | 'paid' | 'overdue'
  dueDate: string
  paidAt: string | null
  paymentMethod: string | null
  paymentNote: string | null
}

export type RestaurantSettlementsResponse = {
  balanceDue: number
  yapeNumber: string | null
  qrUrl: string | null
  items: Settlement[]
}

/**
 * Pedido entregado en efectivo del restaurante que el driver aún no liquidó
 * (status=delivered + payment_status=pending_cash + cash_settlement_id null).
 * Agrupado por driver en `RestaurantPendingCashGroup`.
 */
export type RestaurantPendingCashGroup = {
  driverId: string
  driverName: string
  driverPhone: string
  vehicleType: string
  totalCash: number
  orderCount: number
  orders: Array<{
    id: string
    shortId: string
    clientName: string | null
    orderAmount: number
    clientPaysWith: number | null
    cashOwed: number
    deliveredAt: string | null
  }>
}

// Row crudo de cash_settlements como viene del backend (snake_case con drivers anidado)
export type RestaurantCashSettlementRow = {
  id: string
  restaurant_id: string
  driver_id: string
  settlement_date: string
  total_cash: number
  order_count: number
  delivered_amount: number | null
  confirmed_amount: number | null
  reported_amount: number | null
  resolved_amount: number | null
  dispute_note: string | null
  resolution_note: string | null
  status: 'pending' | 'delivered' | 'confirmed' | 'disputed' | 'resolved'
  created_at: string
  updated_at: string
  drivers: {
    full_name: string
    phone: string
    vehicle_type: string
  } | null
  orders: Array<{
    id: string
    shortId: string
    clientName: string | null
    cashOwed: number
    deliveredAt: string | null
  }>
}

/**
 * Pedido en estado pending_acceptance que el restaurante debe aceptar para
 * definir prep_time real. Cron auto-cancela tras 5 min sin respuesta.
 */
export type PendingAcceptanceOrder = {
  id: string
  short_id: string
  client_name: string | null
  customer_phone: string | null
  delivery_address: string | null
  delivery_reference: string | null
  order_amount: number
  payment_status: string
  prep_minutes: number
  pending_acceptance_at: string | null
  notes: string | null
  source: 'restaurant_pwa' | 'customer_pwa'
  created_at: string
}

export type CustomerOrderItemDetail = {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  modifiersTotal: number
  lineTotal: number
  notes: string | null
  modifiers: Array<{ groupName: string; optionName: string; priceDelta: number }>
}

export type CustomerOrderItemsResponse = {
  source: 'restaurant_pwa' | 'customer_pwa'
  items: CustomerOrderItemDetail[]
}

export type AcceptOrderByRestaurantResponse = {
  id: string
  status: string
  estimatedReadyAt: string
  appearsInQueueAt: string
  prepMinutes: number
  autoAssign: { assigned: boolean; driverId: string | null; reason: string | null } | null
}

// Tipos snake_case (vienen directo de supabase) para el editor de menu
export type MenuCategoryRow = {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuItemRow = {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  prep_minutes: number | null
  is_available: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type MenuModifierGroupRow = {
  id: string
  menu_item_id: string
  name: string
  min_selected: number
  max_selected: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuModifierOptionRow = {
  id: string
  group_id: string
  name: string
  price_delta: number
  sort_order: number
  is_available: boolean
  created_at: string
  updated_at: string
}

export type RestaurantMenuTree = {
  categories: MenuCategoryRow[]
  items: MenuItemRow[]
  groups: MenuModifierGroupRow[]
  options: MenuModifierOptionRow[]
}

export function restaurantApi(client: ApiClient) {
  return {
    getProfile: () => client.get<RestaurantProfile>('restaurant/profile'),
    getHistory: (query?: {
      from?: string
      to?: string
      status?: 'delivered' | 'cancelled'
      cursor?: string
      limit?: number
    }) =>
      client.get<{
        items: unknown[]
        nextCursor: string | null
        summary: { deliveredCount: number; totalCommission: number }
      }>('restaurant/history', { query }),
    getFrequentCustomers: (query?: Restaurants.FrequentCustomersQuery) =>
      client.get<Restaurants.FrequentCustomersResponse>('restaurant/frequent-customers', { query }),
    getFrequentCustomerDetail: (phone: string, query?: Restaurants.FrequentCustomerDetailQuery) =>
      client.get<Restaurants.FrequentCustomerDetailResponse>(
        `restaurant/frequent-customers/${phone}/detail`,
        { query },
      ),
    getSettlements: () => client.get<RestaurantSettlementsResponse>('restaurant/settlements'),
    listMyPayments: () => client.get<RestaurantPaymentsResponse>('restaurant/payments'),
    listCashSettlements: () =>
      client.get<{ items: RestaurantCashSettlementRow[] }>('restaurant/cash-settlements'),
    confirmCashSettlement: (id: string, body: { receivedAmount: number }) =>
      client.post<{ settlementId: string; status: string }>(
        `restaurant/cash-settlements/${id}/confirm`,
        body,
      ),
    disputeCashSettlement: (id: string, body: { reportedAmount: number; note: string }) =>
      client.post<{ settlementId: string; status: string }>(
        `restaurant/cash-settlements/${id}/dispute`,
        body,
      ),
    getSupportPhone: () => client.get<{ phone: string }>('restaurant/support-phone'),
    listPendingCash: () =>
      client.get<{ items: RestaurantPendingCashGroup[] }>('restaurant/cash-pending'),
    listPendingAcceptance: () =>
      client.get<{ items: PendingAcceptanceOrder[] }>('restaurant/orders/pending-acceptance'),
    getOrderItems: (orderId: string) =>
      client.get<CustomerOrderItemsResponse>(`restaurant/orders/${orderId}/items`),
    acceptOrderByRestaurant: (
      orderId: string,
      body: { prepMinutes: number; readyEarly?: boolean },
    ) => client.post<AcceptOrderByRestaurantResponse>(`restaurant/orders/${orderId}/accept`, body),

    // Editor de menu (catalogo) — endpoints CRUD del restaurante
    getMenuTree: () => client.get<RestaurantMenuTree>('restaurant/menu'),
    createMenuCategory: (body: {
      name: string
      description?: string
      sortOrder?: number
      isActive?: boolean
    }) => client.post<MenuCategoryRow>('restaurant/menu/categories', body),
    updateMenuCategory: (
      id: string,
      body: {
        name?: string
        description?: string | null
        sortOrder?: number
        isActive?: boolean
      },
    ) => client.patch<MenuCategoryRow>(`restaurant/menu/categories/${id}`, body),
    deleteMenuCategory: (id: string) => client.delete<void>(`restaurant/menu/categories/${id}`),

    createMenuItem: (body: {
      categoryId?: string | null
      name: string
      description?: string
      price: number
      imageUrl?: string | null
      prepMinutes?: number
      isAvailable?: boolean
      isFeatured?: boolean
      sortOrder?: number
    }) => client.post<MenuItemRow>('restaurant/menu/items', body),
    updateMenuItem: (
      id: string,
      body: {
        categoryId?: string | null
        name?: string
        description?: string | null
        price?: number
        imageUrl?: string | null
        prepMinutes?: number | null
        isAvailable?: boolean
        isFeatured?: boolean
        sortOrder?: number
      },
    ) => client.patch<MenuItemRow>(`restaurant/menu/items/${id}`, body),
    deleteMenuItem: (id: string) => client.delete<void>(`restaurant/menu/items/${id}`),

    createModifierGroup: (body: {
      menuItemId: string
      name: string
      minSelected?: number
      maxSelected?: number
      sortOrder?: number
      isActive?: boolean
    }) => client.post<MenuModifierGroupRow>('restaurant/menu/modifier-groups', body),
    updateModifierGroup: (
      id: string,
      body: {
        name?: string
        minSelected?: number
        maxSelected?: number
        sortOrder?: number
        isActive?: boolean
      },
    ) => client.patch<MenuModifierGroupRow>(`restaurant/menu/modifier-groups/${id}`, body),
    deleteModifierGroup: (id: string) =>
      client.delete<void>(`restaurant/menu/modifier-groups/${id}`),

    createModifierOption: (body: {
      groupId: string
      name: string
      priceDelta?: number
      sortOrder?: number
      isAvailable?: boolean
    }) => client.post<MenuModifierOptionRow>('restaurant/menu/modifier-options', body),
    updateModifierOption: (
      id: string,
      body: {
        name?: string
        priceDelta?: number
        sortOrder?: number
        isAvailable?: boolean
      },
    ) => client.patch<MenuModifierOptionRow>(`restaurant/menu/modifier-options/${id}`, body),
    deleteModifierOption: (id: string) =>
      client.delete<void>(`restaurant/menu/modifier-options/${id}`),
  }
}
