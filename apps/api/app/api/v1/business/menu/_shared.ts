import { problemCode } from '@/lib/http/problem'
import type { ServerClient } from '@tindivo/supabase'

export async function getBusinessId(sb: ServerClient, userId: string) {
  const { data, error } = await sb
    .from('marketplace_businesses')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error)
    return { ok: false as const, response: problemCode('INTERNAL_ERROR', 500, error.message) }
  if (!data) return { ok: false as const, response: problemCode('FORBIDDEN', 403) }
  return { ok: true as const, id: data.id as string }
}
