import type { Restaurants } from '@tindivo/contracts'
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
  is_active: boolean
  is_blocked: boolean
  block_reason: string | null
  balance_due: number
  created_at: string
  updated_at: string
}

export function adminApi(client: ApiClient) {
  return {
    listRestaurants: () =>
      client.get<{ items: RestaurantRow[] }>('admin/restaurants'),
    getRestaurant: (id: string) =>
      client.get<RestaurantRow>(`admin/restaurants/${id}`),
    createRestaurant: (body: Restaurants.CreateRestaurantRequest) =>
      client.post<RestaurantRow>('admin/restaurants', body),
    updateRestaurant: (id: string, body: Restaurants.UpdateRestaurantRequest) =>
      client.patch<RestaurantRow>(`admin/restaurants/${id}`, body),
  }
}
