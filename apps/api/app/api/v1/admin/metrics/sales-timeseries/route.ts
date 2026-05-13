import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/sales-timeseries?from=ISO&to=ISO
 *
 * Serie temporal por día (hora Lima) con GMV, comisión, AOV, desglose por
 * método de pago y por origen del pedido. Default: últimos 30 días.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_sales_timeseries', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows = data ?? []

  let totalOrders = 0
  let totalDelivered = 0
  let totalCancelled = 0
  let totalGmv = 0
  let totalCommission = 0

  const points = rows.map((r) => {
    totalOrders += r.orders
    totalDelivered += r.delivered
    totalCancelled += r.cancelled
    totalGmv += Number(r.gmv)
    totalCommission += Number(r.commission)
    return {
      day: r.day,
      orders: r.orders,
      delivered: r.delivered,
      cancelled: r.cancelled,
      gmv: Number(r.gmv),
      commission: Number(r.commission),
      aov: Number(r.aov),
      cashOrders: r.cash_orders,
      yapeOrders: r.yape_orders,
      mixedOrders: r.mixed_orders,
      prepaidOrders: r.prepaid_orders,
      marketplaceOrders: r.marketplace_orders,
      restaurantOrders: r.restaurant_orders,
    }
  })

  const response: AdminMetrics.SalesTimeseriesResponse = {
    range: rangeEnvelope(range),
    totals: {
      orders: totalOrders,
      delivered: totalDelivered,
      cancelled: totalCancelled,
      gmv: round2(totalGmv),
      commission: round2(totalCommission),
      aov: totalDelivered > 0 ? round2(totalGmv / totalDelivered) : 0,
    },
    points,
  }
  return NextResponse.json(response)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
