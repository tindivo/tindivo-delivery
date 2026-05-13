import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/restaurants-performance?from=ISO&to=ISO
 * Performance por restaurante: GMV, comisión, AOV, repeat customers, deuda.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_restaurants_performance', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows: AdminMetrics.RestaurantPerformanceRow[] = (data ?? []).map((r) => ({
    restaurantId: r.restaurant_id,
    name: r.name,
    accentColor: r.accent_color,
    commissionPerOrder: Number(r.commission_per_order),
    balanceDue: Number(r.balance_due),
    delivered: r.delivered,
    cancelled: r.cancelled,
    total: r.total,
    gmv: Number(r.gmv),
    commission: Number(r.commission),
    aov: Number(r.aov),
    avgPrepMinutes: r.avg_prep_minutes == null ? null : Number(r.avg_prep_minutes),
    uniquePhones: r.unique_phones,
    repeatPhones: r.repeat_phones,
  }))

  const response: AdminMetrics.RestaurantsPerformanceResponse = {
    range: rangeEnvelope(range),
    rows,
  }
  return NextResponse.json(response)
}
