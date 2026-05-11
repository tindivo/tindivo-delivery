import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/team/transfer-requests
 *
 * Lista solicitudes pendientes RECIBIDAS por este driver (es decir, otros
 * drivers le están pidiendo sus pedidos). El driver tiene 30s para responder
 * cada una via /accept o /reject. Las que pasen 30s las procesa el cron
 * `process-expired-transfer-requests` (auto-aceptación).
 *
 * Esta lista alimenta el banner sticky en la pestaña Equipo y el badge
 * numérico en el tab.
 *
 * NO filtramos por `expires_at > now()` aquí: la solicitud pending vencida
 * debe seguir visible para que el banner pase a estado "Transferencia
 * automática..." (naranja) durante el gap entre el timeout y el cron (30-90s).
 * El cron eventualmente la marca como `accepted` o `expired` y Realtime
 * invalida el cache del cliente, removiendo la card.
 *
 * Filtro defensivo: solicitudes con `expires_at` >5min en el pasado se
 * excluyen para no mostrar pending huérfanas si pg_net + endpoint quedan
 * down (el failsafe limpiará después).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('order_transfer_requests')
    .select(
      '*, orders!inner(short_id, restaurants!inner(name)), drivers!order_transfer_requests_to_driver_id_fkey(full_name)',
    )
    .eq('from_driver_id', auth.auth.driverId)
    .eq('status', 'pending')
    .gt('expires_at', cutoff)
    .order('created_at', { ascending: true })
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
