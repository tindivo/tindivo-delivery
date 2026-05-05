'use client'
import { ApiClient, customerApi } from '@tindivo/api-client'

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

/**
 * Cliente HTTP para la PWA del consumidor final.
 *
 * Hoy los pedidos son anónimos: `getAuthToken` retorna `null` para que ningún
 * request vaya con `Authorization`. El backend valida los endpoints públicos
 * sin sesión. Cuando habilitemos cuentas de cliente (rol `customer`), cambiar
 * `getAuthToken` a leer `supabase.auth.getSession()` igual que en `apps/web`.
 */
export const api = new ApiClient({
  baseUrl,
  getAuthToken: async () => null,
})

export const customer = customerApi(api)
