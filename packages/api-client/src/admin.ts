import type { Drivers, Restaurants } from '@tindivo/contracts'
import type { ApiClient } from './client'

// El backend devuelve en snake_case (select '*' de Supabase sin mapping).
// Para el consumer del API, tipamos con los campos que efectivamente usa
// el UI; el tipo fuerte Zod es `Restaurants.RestaurantResponse` y puede
// usarse en el futuro si se agrega un mapper.
export type RestaurantRow = {
  id: string
  user_id: string
  name: string
  phone: string
  address: string
  yape_number: string | null
  qr_url: string | null
  accent_color: string
  coordinates_lat: number | null
  coordinates_lng: number | null
  is_active: boolean
  is_blocked: boolean
  block_reason: string | null
  balance_due: number
  created_at: string
  updated_at: string
}

export type DriverRow = {
  id: string
  user_id: string
  full_name: string
  phone: string
  vehicle_type: 'moto' | 'bicicleta' | 'pie' | 'auto'
  license_plate: string | null
  operating_days: string[]
  shift_start: string
  shift_end: string
  is_active: boolean
  created_at: string
  updated_at: string
  users?: { email: string } | null
  driver_availability?: { is_available: boolean } | null
}

export type AdminCashSettlementRow = {
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
  confirmed_at: string | null
  disputed_at: string | null
  resolved_at: string | null
  restaurants: { name: string; accent_color: string; phone: string } | null
  drivers: { full_name: string; phone: string; vehicle_type: string } | null
}

export type ResolveCashPayload = {
  resolvedAmount: number
  decision: 'accept_driver' | 'accept_restaurant' | 'split'
  notes: string
}

export type TrackingPendingRow = {
  id: string
  short_id: string
  status: string
  client_phone: string
  delivery_address: string | null
  order_amount: number
  picked_up_at: string | null
  tracking_link_sent_at: string | null
  created_at: string
  restaurants: { name: string; accent_color: string } | null
  drivers: { full_name: string; phone: string; vehicle_type: string } | null
}

export function adminApi(client: ApiClient) {
  return {
    listTrackingPending: () =>
      client.get<{ items: TrackingPendingRow[] }>('admin/orders/tracking-pending'),
    listRestaurants: () => client.get<{ items: RestaurantRow[] }>('admin/restaurants'),
    getRestaurant: (id: string) => client.get<RestaurantRow>(`admin/restaurants/${id}`),
    createRestaurant: (body: Restaurants.CreateRestaurantRequest) =>
      client.post<RestaurantRow>('admin/restaurants', body),
    updateRestaurant: (id: string, body: Restaurants.UpdateRestaurantRequest) =>
      client.patch<RestaurantRow>(`admin/restaurants/${id}`, body),

    listDrivers: () => client.get<{ items: DriverRow[] }>('admin/drivers'),
    getDriver: (id: string) => client.get<DriverRow>(`admin/drivers/${id}`),
    createDriver: (body: Drivers.CreateDriverRequest) =>
      client.post<DriverRow>('admin/drivers', body),
    updateDriver: (id: string, body: Drivers.UpdateDriverRequest) =>
      client.patch<DriverRow>(`admin/drivers/${id}`, body),

    listCashSettlements: (status?: 'disputed' | 'delivered' | 'confirmed' | 'resolved' | 'all') =>
      client.get<{ items: AdminCashSettlementRow[] }>('admin/cash-settlements', {
        query: { status },
      }),
    resolveCashSettlement: (id: string, body: ResolveCashPayload) =>
      client.post<{ settlementId: string; status: string }>(
        `admin/cash-settlements/${id}/resolve`,
        body,
      ),
  }
}
