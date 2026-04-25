import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/orders/available
 *
 * Devuelve TODOS los pedidos `waiting_driver`. El frontend los clasifica en
 * tiers (upcoming / pending / overdue) y los muestra en secciones diferentes:
 *  - pending + overdue → bandeja accionable con botón ACEPTAR
 *  - upcoming (>10 min) → sección "Próximos pedidos" (sin botón, visible pero
 *    no aceptable — HU-D-017)
 *
 * Orden ascendente por ready_at: overdue primero, luego pending por cercanía,
 * luego upcoming ordenados por llegada.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      '*, restaurants!inner(name, accent_color, address, phone, yape_number, qr_url, coordinates_lat, coordinates_lng)',
    )
    .eq('status', 'waiting_driver')
    .order('estimated_ready_at', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
