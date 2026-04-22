'use client'
import { ApiClient, adminApi, driverApi, ordersApi, restaurantApi } from '@tindivo/api-client'
import { supabase } from '../supabase/client'

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export const api = new ApiClient({
  baseUrl,
  getAuthToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
})

export const orders = ordersApi(api)
export const driver = driverApi(api)
export const restaurant = restaurantApi(api)
export const admin = adminApi(api)
