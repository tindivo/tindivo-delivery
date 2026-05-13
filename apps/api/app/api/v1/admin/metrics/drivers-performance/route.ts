import { parseMetricsRange, rangeEnvelope } from '@/lib/http/metrics-range'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { AdminMetrics } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/metrics/drivers-performance?from=ISO&to=ISO
 * Performance por motorizado: entregas, cancelados, GMV, comisión generada,
 * efectivo cobrado, tiempo promedio, rechazos.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const range = parseMetricsRange(req)
  const { data, error } = await auth.auth.supabase.rpc('admin_drivers_performance', {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows: AdminMetrics.DriverPerformanceRow[] = (data ?? []).map((r) => ({
    driverId: r.driver_id,
    fullName: r.full_name,
    vehicleType: r.vehicle_type,
    isActive: r.is_active,
    delivered: r.delivered,
    cancelled: r.cancelled,
    totalAssigned: r.total_assigned,
    gmvDelivered: Number(r.gmv_delivered),
    commissionGenerated: Number(r.commission_generated),
    cashCollected: Number(r.cash_collected),
    avgDeliveryMinutes: r.avg_delivery_minutes == null ? null : Number(r.avg_delivery_minutes),
    avgPickupToDeliverMinutes:
      r.avg_pickup_to_deliver_minutes == null ? null : Number(r.avg_pickup_to_deliver_minutes),
    rejectionsCount: r.rejections_count,
  }))

  const response: AdminMetrics.DriversPerformanceResponse = {
    range: rangeEnvelope(range),
    rows,
  }
  return NextResponse.json(response)
}
