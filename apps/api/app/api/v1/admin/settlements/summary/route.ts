import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/settlements/summary
 * Resumen agrupado por restaurante: balance_due + settlements pending/overdue.
 * Usa la función RPC public.admin_settlements_summary (security definer, guard admin).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase.rpc('admin_settlements_summary')
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const items = (data ?? []).map((r) => ({
    restaurantId: r.restaurant_id,
    restaurantName: r.restaurant_name,
    accentColor: r.accent_color,
    yapeNumber: r.yape_number,
    qrUrl: r.qr_url,
    balanceDue: Number(r.balance_due ?? 0),
    pendingCount: Number(r.pending_count ?? 0),
    pendingAmount: Number(r.pending_amount ?? 0),
    overdueCount: Number(r.overdue_count ?? 0),
    overdueAmount: Number(r.overdue_amount ?? 0),
    lastPaidAt: r.last_paid_at,
  }))

  return NextResponse.json({ items })
}
