import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/admin/orders/:id/tracking-link-sent
 * Registra que el admin envió el link de tracking por WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const now = new Date().toISOString()

  const { error } = await auth.auth.supabase
    .from('orders')
    .update({
      tracking_link_sent_at: now,
      tracking_link_sent_by: auth.auth.userId,
    })
    .eq('id', id)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ ok: true, sentAt: now })
}
