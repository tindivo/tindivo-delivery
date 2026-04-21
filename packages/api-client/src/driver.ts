import type { ApiClient } from './client'

export type DriverProfile = {
  id: string
  fullName: string
  phone: string
  vehicleType: 'moto' | 'bicicleta' | 'pie' | 'auto'
  licensePlate: string | null
  operatingDays: string[]
  shiftStart: string
  shiftEnd: string
  isActive: boolean
  isAvailable: boolean
  email: string
}

export type CashSummaryItem = {
  restaurantId: string
  restaurantName: string
  accentColor: string
  totalCash: number
  orderCount: number
  settlementId: string | null
  settlementStatus: 'pending' | 'delivered' | 'confirmed' | 'disputed' | 'resolved' | null
}

export function driverApi(client: ApiClient) {
  return {
    getProfile: () => client.get<DriverProfile>('driver/profile'),
    toggleAvailability: (body: { isAvailable: boolean }) =>
      client.patch<void>('driver/availability', body),
    getHistory: () => client.get<{ items: unknown[] }>('driver/history'),
    getCashSummary: () => client.get<{ items: CashSummaryItem[] }>('driver/cash-summary'),
    deliverCash: (restaurantId: string, body: { amount: number }) =>
      client.post<{ settlementId: string; status: string }>(
        `driver/cash-settlements/${restaurantId}/deliver`,
        body,
      ),
  }
}
