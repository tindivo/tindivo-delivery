import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/cash-settlements
 *
 * Lista cierres de efectivo para el panel admin (HU-A-036). Query params:
 *  ?status=disputed  — solo disputas pendientes de resolver (default si
 *                      no se especifica para priorizar el trabajo del admin)
 *  ?status=all       — todos los estados
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const status = req.nextUrl.searchParams.get('status') ?? 'disputed'

  let query = auth.auth.supabase
    .from('cash_settlements')
    .select(
      '*, restaurants!inner(name, accent_color, phone), drivers!inner(full_name, phone, vehicle_type)',
    )
    .order('updated_at', { ascending: false })
    .limit(100)

  if (status !== 'all') query = query.eq('status', status as never)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
