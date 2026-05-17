import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/internal/push-debug?userId=<uuid>
 *
 * Endpoint INTERNO de diagnóstico de entregabilidad Web Push para un usuario.
 * Sin esto, responder "¿por qué este motorizado no recibe push?" requiere
 * leer logs crudos de la Edge Function y queries ad-hoc.
 *
 * Retorna:
 *  - subscriptions: lista de subs activas del user (endpoint anonimizado,
 *    p256dh/auth omitidos por seguridad).
 *  - deliveryStats: distribución de status_code en los últimos 7d.
 *  - lastAttempts: últimos 20 intentos con status y error_text.
 *
 * Auth: header `Authorization: Bearer <SERVICE_ROLE_KEY>`. Mismo patrón que
 * /internal/orders/assign-one. NO expuesto al exterior.
 */
export async function GET(req: NextRequest) {
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token || !expectedKey || token !== expectedKey) {
    return problemCode('UNAUTHENTICATED', 401, 'Internal endpoint requires service role key')
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return problemCode('VALIDATION_ERROR', 400, 'userId requerido (UUID)')
  }

  const admin = createAdminClient()

  const [subs, stats, attempts] = await Promise.all([
    admin
      .from('push_subscriptions')
      .select(
        'id, endpoint, user_agent, device_label, created_at, updated_at, last_success_at, consecutive_failures',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin
      .from('push_delivery_log')
      .select('status_code')
      .eq('user_id', userId)
      .gte('sent_at', new Date(Date.now() - 7 * 86400_000).toISOString()),
    admin
      .from('push_delivery_log')
      .select('subscription_id, event_type, status_code, error_text, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(20),
  ])

  // Agrupar status_code por bucket — distinguir 2xx/4xx/5xx/null sin
  // explotar la cardinalidad si hubo errores variados.
  const buckets = { ok: 0, gone: 0, clientError: 0, serverError: 0, unknown: 0 }
  for (const row of stats.data ?? []) {
    const c = row.status_code
    if (c == null) buckets.unknown++
    else if (c >= 200 && c < 300) buckets.ok++
    else if (c === 404 || c === 410) buckets.gone++
    else if (c >= 400 && c < 500) buckets.clientError++
    else if (c >= 500) buckets.serverError++
    else buckets.unknown++
  }

  return NextResponse.json({
    userId,
    subscriptions: (subs.data ?? []).map((s) => ({
      id: s.id,
      endpointPrefix: s.endpoint.slice(0, 50),
      userAgent: s.user_agent,
      deviceLabel: s.device_label,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      lastSuccessAt: s.last_success_at,
      consecutiveFailures: s.consecutive_failures,
    })),
    deliveryStats7d: buckets,
    lastAttempts: attempts.data ?? [],
  })
}
