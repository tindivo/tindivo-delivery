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

export function restaurantApi(client: ApiClient) {
  return {
    getProfile: () => client.get<RestaurantProfile>('restaurant/profile'),
    getHistory: (query?: { status?: string }) =>
      client.get<{ items: unknown[] }>('restaurant/history', { query }),
    getSettlements: () => client.get<RestaurantSettlementsResponse>('restaurant/settlements'),
  }
}
