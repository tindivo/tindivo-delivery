import { problemCode } from '@/lib/http/problem'
import type { ServerClient } from '@tindivo/supabase'

/**
 * Retorna el restaurant.id del user actual. Despues de la unificacion,
 * los negocios SON restaurants (con flags is_delivery_enabled / is_marketplace_published).
 * Reusa el nombre business en la API publica para no romper api-client.
 */
export async function getBusinessId(sb: ServerClient, userId: string) {
  const { data, error } = await sb
    .from('restaurants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error)
    return { ok: false as const, response: problemCode('INTERNAL_ERROR', 500, error.message) }
  if (!data) return { ok: false as const, response: problemCode('FORBIDDEN', 403) }
  return { ok: true as const, id: data.id as string }
}
