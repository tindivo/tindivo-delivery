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
  isBlocked: boolean
  blockReason: string | null
  balanceDue: number
  email: string
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
}

export function restaurantApi(client: ApiClient) {
  return {
    getProfile: () => client.get<RestaurantProfile>('restaurant/profile'),
    getHistory: (query?: { status?: string }) =>
      client.get<{ items: unknown[] }>('restaurant/history', { query }),
    getSettlements: () => client.get<RestaurantSettlementsResponse>('restaurant/settlements'),
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
  }
}
