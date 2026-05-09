import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/team/orders
 *
 * Lista pedidos activos de OTROS drivers en restaurantes que el driver
 * autenticado atiende. Pestaña "Equipo" del motorizado.
 *
 * Incluye:
 *  - waiting_driver con driver_id != self (pre-asignados a otros, antes de
 *    que acepten/rechacen)
 *  - heading_to_restaurant, waiting_at_restaurant, picked_up
 *
 * Excluye:
 *  - Pedidos del propio driver (van en "Mis pedidos")
 *  - Pedidos sin driver_id (van en "En espera")
 *  - delivered, cancelled (terminales)
 *
 * Cada item incluye datos del owner driver (nombre, vehículo) y un flag
 * `hasPendingRequest` indicando si el driver autenticado ya solicitó
 * este pedido (para mostrar "Esperando respuesta..." en vez de botón).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const admin = createAdminClient()
  const driverId = auth.auth.driverId

  // RPC SQL devuelve los IDs ordenados; el SELECT enriquecido carga embeds.
  const { data: rpcRows, error: rpcError } = await admin.rpc('list_team_orders', {
    p_driver_id: driverId,
  })
  if (rpcError) return problemCode('INTERNAL_ERROR', 500, rpcError.message)

  const ids = (rpcRows ?? []).map((r) => r.id)
  if (ids.length === 0) return NextResponse.json({ items: [] })

  // SELECT con embeds: restaurant + driver actual del pedido.
  const { data, error } = await admin
    .from('orders')
    .select(
      '*, restaurants!inner(name, accent_color), drivers!orders_driver_id_fkey(full_name, vehicle_type)',
    )
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  // Pending requests del driver autenticado para los orders que está viendo,
  // así el frontend marca "Esperando respuesta..." sin polling adicional.
  const { data: myPending } = await admin
    .from('order_transfer_requests')
    .select('order_id')
    .eq('to_driver_id', driverId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
  const pendingOrderIds = new Set((myPending ?? []).map((r) => r.order_id))

  const items = (data ?? []).map((o) => ({
    ...o,
    has_pending_request: pendingOrderIds.has(o.id),
  }))

  return NextResponse.json({ items })
}
