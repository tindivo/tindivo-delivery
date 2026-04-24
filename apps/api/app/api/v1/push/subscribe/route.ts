import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Notifications } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Notifications.SubscribePushRequest)
  if (!body.ok) return body.response

  // Dedupe por dispositivo: si llega un endpoint nuevo desde el mismo
  // user_agent del mismo usuario, borramos las subs previas de ese
  // dispositivo. Los browsers rotan endpoints sin avisar y sin este
  // dedupe acumulamos subs muertas que generan intentos fallidos.
  // Dispositivos distintos (otro user_agent) se preservan → multidispositivo.
  if (body.data.userAgent) {
    await auth.auth.supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', auth.auth.userId)
      .eq('user_agent', body.data.userAgent)
      .neq('endpoint', body.data.endpoint)
  }

  const { error } = await auth.auth.supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.auth.userId,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      user_agent: body.data.userAgent ?? null,
      device_label: body.data.deviceLabel ?? null,
      consecutive_failures: 0,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ ok: true })
}
