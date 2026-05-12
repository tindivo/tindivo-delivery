import type { CustomerProfile, CustomerProfileUpdate } from '../../domain/entities/customer-profile'

export type CustomerOrderHistoryItem = {
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

export type CustomerOrderDetailWithItems = {
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

export interface CustomerProfileRepository {
  findByUserId(userId: string): Promise<CustomerProfile | null>
  insert(profile: CustomerProfile): Promise<void>
  update(userId: string, update: CustomerProfileUpdate): Promise<CustomerProfile>
  listOrders(userId: string, limit: number): Promise<CustomerOrderHistoryItem[]>
  getOrderDetailWithItems(
    userId: string,
    orderId: string,
  ): Promise<CustomerOrderDetailWithItems | null>
}
