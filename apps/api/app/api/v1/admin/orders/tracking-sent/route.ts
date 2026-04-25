import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/orders/tracking-sent
 *
 * Historial de pedidos con tracking ya enviado por WhatsApp
 * (`tracking_link_sent_at IS NOT NULL`). Sirve para auditar quién envió
 * qué y cuándo, sin importar si el pedido sigue en camino o ya fue
 * entregado.
 *
 * Orden: tracking_link_sent_at DESC (los enviados más recientes primero).
 * Limit 100 para evitar payloads enormes en operación normal.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color), drivers(full_name, phone, vehicle_type)')
    .not('tracking_link_sent_at', 'is', null)
    .order('tracking_link_sent_at', { ascending: false })
    .limit(100)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
