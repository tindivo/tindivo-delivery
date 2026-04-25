import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type MetricsResponse = {
  range: { from: string; to: string }
  totalOrders: number
  delivered: number
  cancelled: number
  avgAcceptSeconds: number | null
  avgWaitingSeconds: number | null
  avgReceivedSeconds: number | null
  avgPickupSeconds: number | null
  avgDeliverySeconds: number | null
  avgTotalSeconds: number | null
  overdueAcceptedCount: number
  acceptedTotal: number
  overduePct: number
  extensionsCount: number
  readyEarlyCount: number
}

/** Rango por defecto: hoy en hora San Jacinto (UTC-5, sin DST). */
function defaultRangeSanJacinto(): { from: Date; to: Date } {
  const now = new Date()
  // San Jacinto está en UTC-5 (mismo offset que America/Lima): suma -5h al
  // UTC y trunca al día para obtener el inicio del día local.
  const localNow = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const startLocal = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0),
  )
  const from = new Date(startLocal.getTime() + 5 * 60 * 60 * 1000)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  return { from, to }
}

function avgSeconds(rows: { from: string | null; to: string | null }[]): number | null {
  const diffs: number[] = []
  for (const r of rows) {
    if (!r.from || !r.to) continue
    const ms = new Date(r.to).getTime() - new Date(r.from).getTime()
    if (Number.isFinite(ms) && ms >= 0) diffs.push(ms / 1000)
  }
  if (diffs.length === 0) return null
  return Math.round(diffs.reduce((s, n) => s + n, 0) / diffs.length)
}

/**
 * GET /api/v1/admin/metrics?from=ISO&to=ISO
 *
 * Agregados operativos para el dashboard del admin. Default: hoy en TZ San Jacinto.
 * Calcula promedios por etapa solo sobre pedidos con timestamps válidos
 * (excluye nulls). Las métricas son sobre pedidos creados en el rango.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const fromQ = url.searchParams.get('from')
  const toQ = url.searchParams.get('to')
  const range =
    fromQ && toQ ? { from: new Date(fromQ), to: new Date(toQ) } : defaultRangeSanJacinto()

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      'status, created_at, accepted_at, heading_at, waiting_at, received_at, picked_up_at, delivered_at, cancelled_at, accept_countdown_seconds, prep_extended_at, ready_early_at',
    )
    .gte('created_at', range.from.toISOString())
    .lt('created_at', range.to.toISOString())

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows = data ?? []
  const delivered = rows.filter((r) => r.status === 'delivered')
  const accepted = rows.filter((r) => r.accepted_at)
  const overdueAccepted = accepted.filter(
    (r) => r.accept_countdown_seconds != null && r.accept_countdown_seconds < 0,
  )

  const response: MetricsResponse = {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    totalOrders: rows.length,
    delivered: delivered.length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    avgAcceptSeconds: avgSeconds(delivered.map((r) => ({ from: r.created_at, to: r.accepted_at }))),
    avgWaitingSeconds: avgSeconds(delivered.map((r) => ({ from: r.heading_at, to: r.waiting_at }))),
    avgReceivedSeconds: avgSeconds(
      delivered.map((r) => ({ from: r.waiting_at, to: r.received_at })),
    ),
    avgPickupSeconds: avgSeconds(
      delivered.map((r) => ({ from: r.received_at ?? r.waiting_at, to: r.picked_up_at })),
    ),
    avgDeliverySeconds: avgSeconds(
      delivered.map((r) => ({ from: r.picked_up_at, to: r.delivered_at })),
    ),
    avgTotalSeconds: avgSeconds(delivered.map((r) => ({ from: r.created_at, to: r.delivered_at }))),
    overdueAcceptedCount: overdueAccepted.length,
    acceptedTotal: accepted.length,
    overduePct:
      accepted.length > 0 ? Math.round((overdueAccepted.length / accepted.length) * 100) : 0,
    extensionsCount: rows.filter((r) => r.prep_extended_at).length,
    readyEarlyCount: rows.filter((r) => r.ready_early_at).length,
  }

  return NextResponse.json(response)
}
