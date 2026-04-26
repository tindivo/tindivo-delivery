import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/push/me?endpoint=<url>
 *
 * Devuelve { owned: boolean } indicando si el endpoint dado pertenece
 * al usuario autenticado actual. Lo consume AutoHealPush en el cliente
 * para detectar cuando el SW devuelve un endpoint asociado a otra
 * cuenta (caso B inició sesión en device de A sin pasar por fullSignOut)
 * y forzar un re-subscribe limpio.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const endpoint = req.nextUrl.searchParams.get('endpoint')
  if (!endpoint) return problemCode('VALIDATION_ERROR', 400, 'endpoint requerido')

  const { data } = await auth.auth.supabase
    .from('push_subscriptions')
    .select('user_id')
    .eq('endpoint', endpoint)
    .maybeSingle()

  return NextResponse.json({ owned: data?.user_id === auth.auth.userId })
}
