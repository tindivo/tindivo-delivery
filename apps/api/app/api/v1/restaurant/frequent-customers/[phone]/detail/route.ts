import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseQuery } from '@/lib/http/validate'
import { Restaurants } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PERU_OFFSET_MS = 5 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function peruDayStartUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d) + PERU_OFFSET_MS)
}

function todayPeruYmd(now: Date): string {
  return new Date(now.getTime() - PERU_OFFSET_MS).toISOString().slice(0, 10)
}

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params

  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)
  const restaurantId = auth.auth.restaurantId
  const supabase = auth.auth.supabase

  const parsed = parseQuery(req.nextUrl.searchParams, Restaurants.FrequentCustomerDetailQuery)
  if (!parsed.ok) return parsed.response

  const { from, to } = parsed.data

  const now = new Date()
  const fromYmd = from ?? shiftYmd(todayPeruYmd(now), -30)
  const toYmd = to ?? todayPeruYmd(now)

  const fromUtc = peruDayStartUtc(fromYmd)
  const toUtcExclusive = new Date(peruDayStartUtc(toYmd).getTime() + ONE_DAY_MS)

  if (fromUtc.getTime() >= toUtcExclusive.getTime()) {
    return problemCode('VALIDATION_ERROR', 400, '`from` no puede ser posterior a `to`')
  }

  // 1. Obtener métricas agrupadas y comportamiento de la RPC
  const { data, error } = await supabase.rpc('get_frequent_customer_detail', {
    p_restaurant_id: restaurantId,
    p_client_phone: phone,
    p_from: fromUtc.toISOString(),
    p_to: toUtcExclusive.toISOString(),
  })

  if (error) {
    return problemCode('INTERNAL_ERROR', 500, error.message)
  }

  const row = (data as any[])?.[0]
  if (!row) {
    return problemCode('NOT_FOUND', 404, 'Cliente no encontrado o sin historial en este periodo')
  }

  // 2. Obtener los últimos 5 pedidos entregados
  const { data: recentOrders, error: recentOrdersError } = await supabase
    .from('orders')
    .select('id, short_id, created_at, order_amount')
    .eq('restaurant_id', restaurantId)
    .eq('client_phone', phone)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentOrdersError) {
    return problemCode('INTERNAL_ERROR', 500, recentOrdersError.message)
  }

  return NextResponse.json({
    client_phone: row.client_phone,
    client_name: row.client_name,
    category: row.category,
    summary: {
      order_count: Number(row.order_count),
      total_spent: Number(row.total_spent),
      avg_ticket: Number(row.avg_ticket),
      first_order_in_range: row.first_order_in_range,
      last_order_in_range: row.last_order_in_range,
      days_since_last_order: Number(row.days_since_last_order),
      avg_days_between_orders:
        row.avg_days_between_orders !== null ? Number(row.avg_days_between_orders) : null,
    },
    behavior: {
      favorite_day_of_week: row.favorite_day_of_week,
      favorite_day_count: Number(row.favorite_day_count),
      favorite_time_range: row.favorite_time_range as any,
      favorite_time_range_count: Number(row.favorite_time_range_count),
      restaurant_avg_ticket: Number(row.restaurant_avg_ticket),
      ticket_vs_restaurant: row.ticket_vs_restaurant as any,
    },
    recent_orders: (recentOrders ?? []).map((o) => ({
      id: o.id,
      short_id: o.short_id,
      created_at: o.created_at,
      order_amount: Number(o.order_amount),
    })),
  })
}
