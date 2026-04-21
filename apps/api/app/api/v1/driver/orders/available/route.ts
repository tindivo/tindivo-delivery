import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/orders/available
 * Lista pedidos con status=waiting_driver y appears_in_queue_at <= now().
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response

  const now = new Date().toISOString()

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color, address, phone)')
    .eq('status', 'waiting_driver')
    .lte('appears_in_queue_at', now)
    .order('appears_in_queue_at', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
