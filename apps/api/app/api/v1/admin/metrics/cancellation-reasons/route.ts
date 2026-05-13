import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/cancellation-reasons?from=ISO&to=ISO
 * Distribución de motivos de cancelación + flag de datos incompletos.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_cancellation_reasons', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows: AdminMetrics.CancellationReasonRow[] = (data ?? []).map((r) => ({
    cancelReasonCode: r.cancel_reason_code,
    count: r.count,
    avgAmountLost: Number(r.avg_amount_lost),
  }))

  const total = rows.reduce((s, r) => s + r.count, 0)
  const unspecified = rows.find((r) => r.cancelReasonCode === 'unspecified')?.count ?? 0
  const unspecifiedPct = total > 0 ? Math.round((unspecified / total) * 1000) / 10 : 0

  const response: AdminMetrics.CancellationReasonsResponse = {
    range: rangeEnvelope(range),
    rows,
    total,
    unspecifiedPct,
  }
  return NextResponse.json(response)
}
