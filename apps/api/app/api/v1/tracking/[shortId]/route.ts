import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/tracking/:shortId
 * Endpoint público sin autenticación. Devuelve info mínima del pedido.
 * Usa la función SQL `get_tracking(short_id)` SECURITY DEFINER.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(shortId)) {
    return problemCode('VALIDATION_ERROR', 400, 'shortId inválido')
  }

  const sb = createAdminClient()
  const { data, error } = await sb.rpc('get_tracking', { p_short_id: shortId })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('TRACKING_NOT_AVAILABLE', 404)

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
