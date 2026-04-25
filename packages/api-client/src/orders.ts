import type { Orders } from '@tindivo/contracts'
import type { ApiClient } from './client'

export function ordersApi(client: ApiClient) {
  return {
    // Restaurant
    createOrder: (body: Orders.CreateOrderRequest) =>
      client.post<Orders.CreateOrderResponse>('restaurant/orders', body),
    listRestaurantOrders: (query?: { status?: string }) =>
      client.get<{ items: Orders.OrderSummaryResponse[] }>('restaurant/orders', { query }),
    getRestaurantOrder: (id: string) =>
      client.get<Orders.OrderDetailResponse>(`restaurant/orders/${id}`),
    markReadyEarly: (id: string) => client.post<void>(`restaurant/orders/${id}/ready-early`),
    requestExtension: (id: string, body: Orders.RequestExtensionRequest) =>
      client.post<void>(`restaurant/orders/${id}/extension`, body),
    cancelByRestaurant: (id: string, body: Orders.CancelOrderRequest) =>
      client.post<void>(`restaurant/orders/${id}/cancel`, body),

    // Driver
    listAvailable: () =>
      client.get<{ items: Orders.OrderSummaryResponse[] }>('driver/orders/available'),
    listDriverOrders: () => client.get<{ items: Orders.OrderSummaryResponse[] }>('driver/orders'),
    acceptOrder: (id: string) =>
      client.post<Orders.AcceptOrderResponse>(`driver/orders/${id}/accept`),
    markArrived: (id: string, body?: Orders.MarkArrivedRequest) =>
      client.post<void>(`driver/orders/${id}/arrived`, body),
    markReceived: (id: string) =>
      client.post<Orders.MarkReceivedResponse>(`driver/orders/${id}/received`),
    markPickedUp: (id: string, body: Orders.MarkPickedUpRequest) =>
      client.post<Orders.PickedUpResponse>(`driver/orders/${id}/picked-up`, body),
    markDelivered: (id: string) => client.post<void>(`driver/orders/${id}/delivered`),

    // Admin
    listAdminOrders: (query?: Partial<Orders.AdminOrderFiltersRequest>) =>
      client.get<{ items: Orders.OrderSummaryResponse[] }>('admin/orders', { query }),
    getAdminOrder: (id: string) => client.get<Orders.OrderDetailResponse>(`admin/orders/${id}`),
    cancelByAdmin: (id: string, body: Orders.CancelOrderRequest) =>
      client.post<void>(`admin/orders/${id}/cancel`, body),
    editClientPhone: (id: string, body: Orders.EditClientPhoneRequest) =>
      client.patch<void>(`admin/orders/${id}/client-phone`, body),
    reassignOrder: (id: string, body: Orders.ReassignOrderRequest) =>
      client.post<void>(`admin/orders/${id}/reassign`, body),
    logTrackingLinkSent: (id: string) => client.post<void>(`admin/orders/${id}/tracking-link-sent`),
  }
}
