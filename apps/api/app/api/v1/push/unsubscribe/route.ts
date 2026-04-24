import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Notifications } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Notifications.UnsubscribePushRequest)
  if (!body.ok) return body.response

  const { error } = await auth.auth.supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', auth.auth.userId)
    .eq('endpoint', body.data.endpoint)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ ok: true })
}
