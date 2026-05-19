import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Drivers } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/admin/drivers/[id]/active
 * Toggle is_active del motorizado. Si va a inactivo y tiene pedidos asignados
 * activos (no entregados ni cancelados), responde 409 con la lista bloqueante.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, Drivers.SetDriverActiveRequest)
  if (!body.ok) return body.response
  const { isActive } = body.data

  if (!isActive) {
    const { data: activeOrders, error: ordersErr } = await auth.auth.supabase
      .from('orders')
      .select('id, short_id, status, client_name')
      .eq('driver_id', id)
      .not('status', 'in', '(delivered,cancelled)')
      .limit(50)

    if (ordersErr) return problemCode('INTERNAL_ERROR', 500, ordersErr.message)

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        {
          type: 'https://tindivo.pe/errors/active-orders-blocking',
          title: 'No se puede desactivar',
          status: 409,
          code: 'ACTIVE_ORDERS_BLOCKING',
          detail: `El motorizado tiene ${activeOrders.length} pedido(s) asignados activos. Reasígnalos o espera a que se completen antes de desactivar.`,
          activeOrders: activeOrders.map((o) => ({
            id: o.id,
            shortId: o.short_id,
            status: o.status,
            customerName: o.client_name,
          })),
        },
        { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
  }

  const { data, error } = await auth.auth.supabase
    .from('drivers')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, users(email), driver_availability(is_available)')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('DRIVER_NOT_FOUND', 404)

  // Al desactivar, invalidar todas las sesiones vivas del usuario para
  // que no siga operando con su JWT viejo (que sería válido hasta ~1h por
  // el access_token). La RPC borra auth.sessions y revoca auth.refresh_tokens
  // del usuario; el próximo refresh falla -> middleware redirige al login.
  // Best-effort: si la RPC falla, NO bloqueamos el toggle (el refresh
  // natural del JWT recogerá igualmente is_active=false del hook).
  if (!isActive && data.user_id) {
    const admin = createAdminClient()
    const { error: revokeErr } = await admin.rpc('revoke_user_sessions', {
      p_user_id: data.user_id,
    })
    if (revokeErr) {
      console.warn('[drivers/active] revoke_user_sessions failed', {
        driverId: id,
        userId: data.user_id,
        error: revokeErr.message,
      })
    }
  }

  return NextResponse.json(data)
}
