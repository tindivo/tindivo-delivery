import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/operations-funnel?from=ISO&to=ISO
 * Tiempos del flujo operacional + percentiles + on-time%.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_operations_funnel', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const row = (data ?? [])[0]
  const response: AdminMetrics.OperationsFunnelResponse = {
    range: rangeEnvelope(range),
    totalDelivered: row?.total_delivered ?? 0,
    avgMinToAssign: row?.avg_min_to_assign == null ? null : Number(row.avg_min_to_assign),
    avgMinToAccept: row?.avg_min_to_accept == null ? null : Number(row.avg_min_to_accept),
    avgMinInRouteToRestaurant:
      row?.avg_min_in_route_to_restaurant == null
        ? null
        : Number(row.avg_min_in_route_to_restaurant),
    avgMinWaitAtRestaurant:
      row?.avg_min_wait_at_restaurant == null ? null : Number(row.avg_min_wait_at_restaurant),
    avgMinPickupToDeliver:
      row?.avg_min_pickup_to_deliver == null ? null : Number(row.avg_min_pickup_to_deliver),
    avgMinTotal: row?.avg_min_total == null ? null : Number(row.avg_min_total),
    p50MinTotal: row?.p50_min_total == null ? null : Number(row.p50_min_total),
    p90MinTotal: row?.p90_min_total == null ? null : Number(row.p90_min_total),
    p95MinTotal: row?.p95_min_total == null ? null : Number(row.p95_min_total),
    onTimeCount: row?.on_time_count ?? 0,
    onTimePct: row?.on_time_pct == null ? null : Number(row.on_time_pct),
  }
  return NextResponse.json(response)
}
