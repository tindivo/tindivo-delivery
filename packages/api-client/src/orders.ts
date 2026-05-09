import type { Orders } from '@tindivo/contracts'
import type { ApiClient } from './client'

export function ordersApi(client: ApiClient) {
  return {
    // Restaurant
    createOrder: (body: Orders.CreateOrderRequest, opts?: { idempotencyKey?: string }) =>
      client.post<Orders.CreateOrderResponse>('restaurant/orders', body, {
        idempotencyKey: opts?.idempotencyKey,
      }),
    listRestaurantOrders: (query?: { status?: string }) =>
      client.get<{ items: Orders.OrderSummaryResponse[] }>('restaurant/orders', { query }),
    getRestaurantOrder: (id: string) =>
      client.get<Orders.OrderDetailResponse>(`restaurant/orders/${id}`),
    markReadyEarly: (id: string) => client.post<void>(`restaurant/orders/${id}/ready-early`),
    requestExtension: (id: string, body: Orders.RequestExtensionRequest) =>
      client.post<void>(`restaurant/orders/${id}/extension`, body),
    cancelByRestaurant: (id: string, body: Orders.CancelOrderRequest) =>
      client.post<void>(`restaurant/orders/${id}/cancel`, body),
    editRestaurantOrder: (id: string, body: Orders.EditOrderByRestaurantRequest) =>
      client.patch<{
        id: string
        clientName: string | null
        paymentStatus: string
        orderAmount: number
        yapeAmount: number | null
        cashAmount: number | null
        clientPaysWith: number | null
        changeToGive: number | null
      }>(`restaurant/orders/${id}`, body),

    // Driver
    listAvailable: () =>
      client.get<{ items: Orders.OrderSummaryResponse[] }>('driver/orders/available'),
    listDriverOrders: () => client.get<{ items: Orders.OrderSummaryResponse[] }>('driver/orders'),
    acceptOrder: (id: string) =>
      client.post<Orders.AcceptOrderResponse>(`driver/orders/${id}/accept`),
    claimUrgent: (id: string, opts?: { idempotencyKey?: string }) =>
      client.post<Orders.ClaimUrgentOrderResponse>(`driver/orders/${id}/claim`, undefined, {
        idempotencyKey: opts?.idempotencyKey,
      }),
    rejectAssignment: (id: string, body: Orders.RejectAssignmentRequest) =>
      client.post<Orders.RejectAssignmentResponse>(`driver/orders/${id}/reject`, body),
    listPeers: (restaurantId: string) =>
      client.get<Orders.ListPeersResponse>('driver/peers', { query: { restaurantId } }),
    transferOrder: (id: string, body: Orders.TransferOrderRequest) =>
      client.post<Orders.TransferOrderResponse>(`driver/orders/${id}/transfer`, body),
    markArrived: (id: string, body?: Orders.MarkArrivedRequest) =>
      client.post<void>(`driver/orders/${id}/arrived`, body),
    markReceived: (id: string) =>
      client.post<Orders.MarkReceivedResponse>(`driver/orders/${id}/received`),
    saveCustomerData: (id: string, body: Orders.SaveCustomerDataRequest) =>
      client.post<Orders.SaveCustomerDataResponse>(`driver/orders/${id}/customer-data`, body),
    markPickedUp: (id: string, body: Orders.MarkPickedUpRequest) =>
      client.post<Orders.PickedUpResponse>(`driver/orders/${id}/picked-up`, body),
    markDelivered: (id: string) => client.post<void>(`driver/orders/${id}/delivered`),
    changePaymentMethod: (id: string, body: Orders.ChangePaymentMethodRequest) =>
      client.post<Orders.ChangePaymentMethodResponse>(
        `driver/orders/${id}/change-payment-method`,
        body,
      ),

    // Driver — Equipo (request-based transfer)
    listTeamOrders: () => client.get<{ items: Orders.TeamOrderItem[] }>('driver/team/orders'),
    listReceivedTransferRequests: () =>
      client.get<{ items: Orders.ReceivedTransferRequest[] }>('driver/team/transfer-requests'),
    requestOrderTransfer: (orderId: string, opts?: { idempotencyKey?: string }) =>
      client.post<Orders.RequestOrderTransferResponse>(
        `driver/team/orders/${orderId}/request`,
        undefined,
        { idempotencyKey: opts?.idempotencyKey },
      ),
    acceptTransferRequest: (id: string) =>
      client.post<Orders.AcceptTransferRequestResponse>(
        `driver/team/transfer-requests/${id}/accept`,
      ),
    rejectTransferRequest: (id: string) =>
      client.post<Orders.RejectTransferRequestResponse>(
        `driver/team/transfer-requests/${id}/reject`,
      ),

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
