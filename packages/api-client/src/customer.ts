import type { Customer } from '@tindivo/contracts'
import type { ApiClient } from './client'

export type CustomerProfileDto = {
  userId: string
  fullName: string
  phone: string | null
  defaultAddress: string | null
  defaultReference: string | null
  defaultCoordinates: { lat: number; lng: number } | null
  defaultLocationAccuracyM: number | null
  createdAt: string
  updatedAt: string
}

export type CustomerOrderHistoryDto = {
  id: string
  shortId: string
  status: string
  source: 'restaurant_pwa' | 'customer_pwa'
  restaurantId: string
  restaurantName: string
  restaurantAccentColor: string
  orderAmount: number
  paymentStatus: string
  createdAt: string
  deliveredAt: string | null
  cancelledAt: string | null
}

export type CustomerReorderDto = {
  id: string
  shortId: string
  restaurantId: string
  status: string
  orderAmount: number
  paymentStatus: string
  createdAt: string
  items: Array<{
    menuItemId: string | null
    itemName: string
    quantity: number
    notes: string | null
    modifiers: Array<{ groupId: string; optionId: string }>
  }>
}

export type RegisterCustomerInput = {
  email: string
  password: string
  fullName: string
  phone?: string
}

export type UpdateCustomerProfileInput = Partial<{
  fullName: string
  phone: string | null
  defaultAddress: string | null
  defaultReference: string | null
  defaultCoordinates: { lat: number; lng: number } | null
  defaultLocationAccuracyM: number | null
}>

export function customerApi(client: ApiClient) {
  return {
    listRestaurants: () =>
      client.get<{ items: Customer.PublicRestaurantSummary[] }>('public/restaurants'),
    getMenu: (restaurantId: string) =>
      client.get<Customer.PublicRestaurantMenu>(`public/restaurants/${restaurantId}/menu`),
    createOrder: (body: Customer.CreateCustomerOrderRequest) =>
      client.post<Customer.CreateCustomerOrderResponse>('public/customer-orders', body),

    register: (body: RegisterCustomerInput) =>
      client.post<{ userId: string; email: string; fullName: string }>(
        'public/customer-auth/register',
        body,
      ),

    getMyProfile: () => client.get<{ profile: CustomerProfileDto }>('customer/profile'),
    updateMyProfile: (body: UpdateCustomerProfileInput) =>
      client.patch<{ profile: CustomerProfileDto }>('customer/profile', body),
    listMyOrders: (limit = 20) =>
      client.get<{ items: CustomerOrderHistoryDto[] }>('customer/orders', {
        query: { limit: String(limit) },
      }),
    reorder: (orderId: string) =>
      client.post<{ order: CustomerReorderDto }>(`customer/orders/${orderId}/reorder`, {}),
  }
}
