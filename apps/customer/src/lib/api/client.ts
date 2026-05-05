'use client'
import { ApiClient, customerApi } from '@tindivo/api-client'
import { supabase } from '../supabase/client'

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

/**
 * Cliente HTTP para la PWA del consumidor final.
 *
 * Login OPCIONAL: si hay sesión activa de un usuario customer, se manda
 * Authorization Bearer y los endpoints públicos pueden vincular el pedido
 * a la cuenta. Sin sesión, sigue funcionando como flujo invitado (los
 * endpoints de checkout son CORS-públicos sin auth requerido).
 *
 * Los endpoints `/customer/*` (perfil, historial, reorder) sí requieren
 * sesión de customer y devuelven 401 sin auth.
 */
export const api = new ApiClient({
  baseUrl,
  getAuthToken: async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
})

export const customer = customerApi(api)
