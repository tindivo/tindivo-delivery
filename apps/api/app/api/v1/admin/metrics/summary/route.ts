import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/summary?from=ISO&to=ISO
 *
 * Banner agregado del dashboard /admin/metricas: totales del rango +
 * retención (repeat customers) + actores activos. Combina dos RPCs.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const [restaurants, drivers] = await Promise.all([
    auth.auth.supabase.rpc('admin_restaurants_performance', {
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
    }),
    auth.auth.supabase.rpc('admin_drivers_performance', {
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
    }),
  ])

  if (restaurants.error) return problemCode('INTERNAL_ERROR', 500, restaurants.error.message)
  if (drivers.error) return problemCode('INTERNAL_ERROR', 500, drivers.error.message)

  const rRows = restaurants.data ?? []
  const dRows = drivers.data ?? []

  let orders = 0
  let delivered = 0
  let cancelled = 0
  let gmv = 0
  let commission = 0
  let uniquePhones = 0
  let repeatPhones = 0
  let activeRestaurants = 0

  for (const r of rRows) {
    orders += r.total
    delivered += r.delivered
    cancelled += r.cancelled
    gmv += Number(r.gmv)
    commission += Number(r.commission)
    uniquePhones += r.unique_phones
    repeatPhones += r.repeat_phones
    if (r.delivered > 0 || r.total > 0) activeRestaurants++
  }

  const activeDrivers = dRows.filter((d) => d.delivered > 0 || d.total_assigned > 0).length

  const response: AdminMetrics.MetricsSummaryResponse = {
    range: rangeEnvelope(range),
    orders,
    delivered,
    cancelled,
    cancellationPct: orders > 0 ? Math.round((cancelled / orders) * 1000) / 10 : 0,
    gmv: round2(gmv),
    commission: round2(commission),
    aov: delivered > 0 ? round2(gmv / delivered) : 0,
    uniquePhones,
    repeatPhones,
    repeatRatePct: uniquePhones > 0 ? Math.round((repeatPhones / uniquePhones) * 1000) / 10 : 0,
    activeDrivers,
    activeRestaurants,
  }

  return NextResponse.json(response)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
