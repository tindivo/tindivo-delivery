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
  accountType?: 'customer'
  fullName: string
  phone?: string
}

export type RegisterBusinessInput = {
  email: string
  password: string
  accountType: 'business'
  fullName: string
  phone: string
  businessName: string
  address: string
  description?: string
}

export type BusinessProfileDto = {
  id: string
  name: string
  phone: string
  address: string
  description: string | null
  accentColor: string
  isActive: boolean
  isPublished: boolean
  isVerified: boolean
  deliveryEnabled: boolean
  email: string
  createdAt: string
  updatedAt: string
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
    getMenu: (restaurantId: string, catalogType: 'delivery' | 'business' = 'delivery') =>
      client.get<Customer.PublicRestaurantMenu>(`public/restaurants/${restaurantId}/menu`, {
        query: { catalog: catalogType },
      }),
    createOrder: (body: Customer.CreateCustomerOrderRequest, opts?: { idempotencyKey?: string }) =>
      client.post<Customer.CreateCustomerOrderResponse>('public/customer-orders', body, {
        idempotencyKey: opts?.idempotencyKey,
      }),

    register: (body: RegisterCustomerInput | RegisterBusinessInput) =>
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

    getBusinessProfile: () => client.get<{ business: BusinessProfileDto }>('business/profile'),
    updateBusinessProfile: (
      body: Partial<{
        name: string
        phone: string
        address: string
        description: string | null
        accentColor: string
        isPublished: boolean
      }>,
    ) => client.patch<{ business: BusinessProfileDto }>('business/profile', body),
    getBusinessMenuTree: () => client.get<BusinessMenuTree>('business/menu'),
    createBusinessMenuCategory: (body: {
      name: string
      description?: string
      sortOrder?: number
      isActive?: boolean
    }) => client.post<MenuCategoryRow>('business/menu/categories', body),
    updateBusinessMenuCategory: (
      id: string,
      body: {
        name?: string
        description?: string | null
        sortOrder?: number
        isActive?: boolean
      },
    ) => client.patch<MenuCategoryRow>(`business/menu/categories/${id}`, body),
    deleteBusinessMenuCategory: (id: string) =>
      client.delete<void>(`business/menu/categories/${id}`),
    createBusinessMenuItem: (body: {
      categoryId?: string | null
      name: string
      description?: string
      price: number
      imageUrl?: string | null
      prepMinutes?: number
      isAvailable?: boolean
      isFeatured?: boolean
      sortOrder?: number
    }) => client.post<MenuItemRow>('business/menu/items', body),
    updateBusinessMenuItem: (
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
    ) => client.patch<MenuItemRow>(`business/menu/items/${id}`, body),
    deleteBusinessMenuItem: (id: string) => client.delete<void>(`business/menu/items/${id}`),
    createBusinessModifierGroup: (body: {
      menuItemId: string
      name: string
      minSelected?: number
      maxSelected?: number
      sortOrder?: number
      isActive?: boolean
    }) => client.post<MenuModifierGroupRow>('business/menu/modifier-groups', body),
    deleteBusinessModifierGroup: (id: string) =>
      client.delete<void>(`business/menu/modifier-groups/${id}`),
    createBusinessModifierOption: (body: {
      groupId: string
      name: string
      priceDelta?: number
      sortOrder?: number
      isAvailable?: boolean
    }) => client.post<MenuModifierOptionRow>('business/menu/modifier-options', body),
    deleteBusinessModifierOption: (id: string) =>
      client.delete<void>(`business/menu/modifier-options/${id}`),
  }
}

export type MenuCategoryRow = {
  id: string
  business_id?: string
  restaurant_id?: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuItemRow = {
  id: string
  business_id?: string
  restaurant_id?: string
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

export type BusinessMenuTree = {
  categories: MenuCategoryRow[]
  items: MenuItemRow[]
  groups: MenuModifierGroupRow[]
  options: MenuModifierOptionRow[]
}
