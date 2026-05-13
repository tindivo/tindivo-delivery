import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/demand-heatmap?from=ISO&to=ISO
 * Heatmap día (0=domingo) × hora (0-23) en hora Lima.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_demand_heatmap', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const cells: AdminMetrics.HeatmapCell[] = (data ?? []).map((r) => ({
    dow: r.dow,
    hour: r.hour,
    orders: r.orders,
    delivered: r.delivered,
    cancelled: r.cancelled,
  }))

  const maxOrders = cells.reduce((m, c) => (c.orders > m ? c.orders : m), 0)

  const response: AdminMetrics.DemandHeatmapResponse = {
    range: rangeEnvelope(range),
    cells,
    maxOrders,
  }
  return NextResponse.json(response)
}
