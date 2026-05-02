import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  // Perú está en UTC-5 (sin DST): el inicio del día local es la medianoche
  // Perú expresada en UTC. Sin esto, un servidor en UTC saltaría a "mañana"
  // a las 19:00 hora Perú y excluiría los pedidos del día Perú.
  const now = new Date()
  const localNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const startLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0),
  )
  const since = new Date(startLocal.getTime() + 5 * 60 * 60 * 1000)
  const sinceIso = since.toISOString()

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color)')
    .eq('driver_id', auth.auth.driverId)
    .in('status', ['delivered', 'cancelled'] as const)
    .or(`delivered_at.gte.${sinceIso},cancelled_at.gte.${sinceIso}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ items: data ?? [] })
}
