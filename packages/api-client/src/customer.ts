import type { Customer } from '@tindivo/contracts'
import type { ApiClient } from './client'

export function customerApi(client: ApiClient) {
  return {
    listRestaurants: () =>
      client.get<{ items: Customer.PublicRestaurantSummary[] }>('public/restaurants'),
    getMenu: (restaurantId: string) =>
      client.get<Customer.PublicRestaurantMenu>(`public/restaurants/${restaurantId}/menu`),
    createOrder: (body: Customer.CreateCustomerOrderRequest) =>
      client.post<Customer.CreateCustomerOrderResponse>('public/customer-orders', body),
  }
}
