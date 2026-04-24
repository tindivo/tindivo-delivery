import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/orders/tracking-pending
 *
 * Lista pedidos que están en camino al cliente (status=picked_up) y a los
 * que aún no se ha enviado el link de tracking por WhatsApp. El admin
 * usa este endpoint para el dashboard de "tracking pendiente".
 *
 * Orden: picked_up_at ASC (los más antiguos primero = más urgentes).
 * Incluye sólo pedidos con `client_phone` (sino no se puede enviar WhatsApp).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color), drivers(full_name, phone, vehicle_type)')
    .eq('status', 'picked_up')
    .is('tracking_link_sent_at', null)
    .not('client_phone', 'is', null)
    .order('picked_up_at', { ascending: true })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
