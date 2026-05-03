import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/daily-summary
 *
 * Resumen del día (hora Lima/UTC-5) para el dashboard admin:
 *  - Totales: pedidos, delivered, cancelled, in-progress
 *  - Comerciales: GMV, comisión Tindivo (revenue), AOV
 *  - Operacionales: on-time rate (sobre delivered), tiempo total promedio
 *  - Cash flow: efectivo total a entregar al restaurante
 *  - Breakdown por restaurante: pedidos, delivered, cancelled, GMV, comisión
 *  - Breakdown por driver: pedidos, delivered, in-progress, comisión generada
 *
 * Una sola query a `orders` con joins en `restaurants` y `drivers` (RLS admin).
 * Todo se calcula en memoria sobre las filas crudas — la cardinalidad diaria
 * es chica (cientos de pedidos máx), no requiere agregaciones SQL.
 */

type RestaurantRow = {
  restaurantId: string
  name: string
  accentColor: string
  total: number
  delivered: number
  cancelled: number
  gmv: number
  commission: number
}

type DriverRow = {
  driverId: string
  fullName: string
  vehicleType: string | null
  total: number
  delivered: number
  inProgress: number
  cancelled: number
  commissionGenerated: number
}

type DailySummary = {
  range: { from: string; to: string }
  totals: {
    orders: number
    delivered: number
    cancelled: number
    inProgress: number
    cancellationPct: number
  }
  commercials: {
    gmv: number
    commissionRevenue: number
    avgOrderValue: number | null
  }
  operations: {
    avgTotalSeconds: number | null
    onTimePct: number | null
    overdueAcceptedCount: number
    acceptedTotal: number
  }
  cash: {
    pendingDeliveredToRestaurant: number
    cashOrdersDelivered: number
  }
  byRestaurant: RestaurantRow[]
  byDriver: DriverRow[]
}

function defaultRangeLima(): { from: Date; to: Date } {
  const now = new Date()
  const localNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const startLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0),
  )
  const from = new Date(startLocal.getTime() + 5 * 60 * 60 * 1000)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  return { from, to }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const fromQ = url.searchParams.get('from')
  const toQ = url.searchParams.get('to')
  const range = fromQ && toQ ? { from: new Date(fromQ), to: new Date(toQ) } : defaultRangeLima()

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      `id, status, payment_status, order_amount, delivery_fee, cash_amount, client_pays_with,
       created_at, accepted_at, delivered_at, accept_countdown_seconds,
       restaurant_id, driver_id,
       restaurants!inner(name, accent_color),
       drivers(full_name, vehicle_type)`,
    )
    .gte('created_at', range.from.toISOString())
    .lt('created_at', range.to.toISOString())

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  type Row = {
    id: string
    status: string
    payment_status: string
    order_amount: string | number
    delivery_fee: string | number
    cash_amount: string | number | null
    client_pays_with: string | number | null
    created_at: string
    accepted_at: string | null
    delivered_at: string | null
    accept_countdown_seconds: number | null
    restaurant_id: string
    driver_id: string | null
    restaurants: { name: string; accent_color: string } | null
    drivers: { full_name: string; vehicle_type: string | null } | null
  }
  const rows = (data ?? []) as unknown as Row[]

  let delivered = 0
  let cancelled = 0
  let inProgress = 0
  let gmv = 0
  let commissionRevenue = 0
  let cashPending = 0
  let cashOrdersDelivered = 0
  const totalSeconds: number[] = []
  let overdueAccepted = 0
  let acceptedTotal = 0

  const byRestaurant = new Map<string, RestaurantRow>()
  const byDriver = new Map<string, DriverRow>()

  for (const o of rows) {
    const orderAmount = Number(o.order_amount) || 0
    const fee = Number(o.delivery_fee) || 0
    const isDelivered = o.status === 'delivered'
    const isCancelled = o.status === 'cancelled'

    if (isDelivered) {
      delivered++
      gmv += orderAmount
      commissionRevenue += fee
      if (o.delivered_at && o.created_at) {
        const ms = new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()
        if (Number.isFinite(ms) && ms >= 0) totalSeconds.push(ms / 1000)
      }
    } else if (isCancelled) {
      cancelled++
    } else {
      inProgress++
    }

    if (o.accepted_at) {
      acceptedTotal++
      if (o.accept_countdown_seconds != null && o.accept_countdown_seconds < 0) overdueAccepted++
    }

    if (
      isDelivered &&
      (o.payment_status === 'pending_cash' || o.payment_status === 'pending_mixed')
    ) {
      cashOrdersDelivered++
      cashPending += Number(o.client_pays_with ?? o.cash_amount ?? o.order_amount) || 0
    }

    const r = o.restaurants
    if (r) {
      const existing: RestaurantRow = byRestaurant.get(o.restaurant_id) ?? {
        restaurantId: o.restaurant_id,
        name: r.name,
        accentColor: r.accent_color,
        total: 0,
        delivered: 0,
        cancelled: 0,
        gmv: 0,
        commission: 0,
      }
      existing.total++
      if (isDelivered) {
        existing.delivered++
        existing.gmv = round2(existing.gmv + orderAmount)
        existing.commission = round2(existing.commission + fee)
      } else if (isCancelled) {
        existing.cancelled++
      }
      byRestaurant.set(o.restaurant_id, existing)
    }

    if (o.driver_id) {
      const dr = o.drivers
      const existing: DriverRow = byDriver.get(o.driver_id) ?? {
        driverId: o.driver_id,
        fullName: dr?.full_name ?? 'Sin nombre',
        vehicleType: dr?.vehicle_type ?? null,
        total: 0,
        delivered: 0,
        inProgress: 0,
        cancelled: 0,
        commissionGenerated: 0,
      }
      existing.total++
      if (isDelivered) {
        existing.delivered++
        existing.commissionGenerated = round2(existing.commissionGenerated + fee)
      } else if (isCancelled) {
        existing.cancelled++
      } else {
        existing.inProgress++
      }
      byDriver.set(o.driver_id, existing)
    }
  }

  const total = rows.length
  const cancellationPct = total > 0 ? Math.round((cancelled / total) * 100) : 0
  const onTimePct =
    acceptedTotal > 0 ? Math.round(((acceptedTotal - overdueAccepted) / acceptedTotal) * 100) : null

  const summary: DailySummary = {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    totals: {
      orders: total,
      delivered,
      cancelled,
      inProgress,
      cancellationPct,
    },
    commercials: {
      gmv: round2(gmv),
      commissionRevenue: round2(commissionRevenue),
      avgOrderValue: delivered > 0 ? round2(gmv / delivered) : null,
    },
    operations: {
      avgTotalSeconds:
        totalSeconds.length > 0
          ? Math.round(totalSeconds.reduce((s, n) => s + n, 0) / totalSeconds.length)
          : null,
      onTimePct,
      overdueAcceptedCount: overdueAccepted,
      acceptedTotal,
    },
    cash: {
      pendingDeliveredToRestaurant: round2(cashPending),
      cashOrdersDelivered,
    },
    byRestaurant: Array.from(byRestaurant.values()).sort((a, b) => b.total - a.total),
    byDriver: Array.from(byDriver.values()).sort((a, b) => b.delivered - a.delivered),
  }

  return NextResponse.json(summary)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
