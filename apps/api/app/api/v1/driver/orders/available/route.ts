import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

// Ventana en la que el pedido se muestra al driver: desde <= ready_at + 10 min
// hasta ready_at < now (overdue). Pedidos con ready_at - now > 10 min se
// ocultan (tier 'upcoming') para no saturar el feed con trabajo futuro.
const URGENCY_WINDOW_MS = 10 * 60 * 1000

/**
 * GET /api/v1/driver/orders/available
 *
 * Muestra pedidos `waiting_driver` en tier 'pending' (<= 10 min para listo)
 * y 'overdue' (ya listos o atrasados). Los 'upcoming' (>10 min) quedan fuera.
 * Orden ascendente por ready_at: overdue primero (los más vencidos arriba),
 * luego pending ordenados por cercanía al listo.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response

  const thresholdIso = new Date(Date.now() + URGENCY_WINDOW_MS).toISOString()

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color, address, phone)')
    .eq('status', 'waiting_driver')
    .lte('estimated_ready_at', thresholdIso)
    .order('estimated_ready_at', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
