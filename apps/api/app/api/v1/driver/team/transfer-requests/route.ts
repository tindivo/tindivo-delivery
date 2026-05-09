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
 * cada una via /accept o /reject. Las que pasen 30s las limpia el cron
 * `expire-transfer-requests`.
 *
 * Esta lista alimenta el banner sticky en la pestaña Equipo y el badge
 * numérico en el tab.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('order_transfer_requests')
    .select(
      '*, orders!inner(short_id, restaurants!inner(name)), drivers!order_transfer_requests_to_driver_id_fkey(full_name)',
    )
    .eq('from_driver_id', auth.auth.driverId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
