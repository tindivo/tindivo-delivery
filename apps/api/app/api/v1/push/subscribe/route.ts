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

  // Cleanup global: si el endpoint ya pertenece a OTRO user (caso B
  // inicia sesión en device de A sin pasar por fullSignOut), borramos
  // la fila previa antes de upsert. La unique constraint ahora es
  // unique(endpoint) global, así que el upsert sin este DELETE
  // sobreescribiría user_id pero queremos un cierre quirúrgico.
  await auth.auth.supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.data.endpoint)
    .neq('user_id', auth.auth.userId)

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
    { onConflict: 'endpoint' },
  )

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ ok: true })
}
