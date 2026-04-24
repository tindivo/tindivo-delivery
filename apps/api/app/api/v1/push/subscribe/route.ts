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

  const { error } = await auth.auth.supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.auth.userId,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      user_agent: body.data.userAgent ?? null,
      device_label: body.data.deviceLabel ?? null,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ ok: true })
}
