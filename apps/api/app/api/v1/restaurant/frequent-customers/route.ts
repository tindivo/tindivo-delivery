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

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)
  const restaurantId = auth.auth.restaurantId
  const supabase = auth.auth.supabase

  const parsed = parseQuery(req.nextUrl.searchParams, Restaurants.FrequentCustomersQuery)
  if (!parsed.ok) return parsed.response

  const {
    from,
    to,
    min_orders,
    page,
    page_size,
    search,
    include_suspicious,
    sort_by,
    sort_dir,
  } = parsed.data

  const now = new Date()
  const fromYmd = from ?? shiftYmd(todayPeruYmd(now), -30)
  const toYmd = to ?? todayPeruYmd(now)

  const fromUtc = peruDayStartUtc(fromYmd)
  const toUtcExclusive = new Date(peruDayStartUtc(toYmd).getTime() + ONE_DAY_MS)

  if (fromUtc.getTime() >= toUtcExclusive.getTime()) {
    return problemCode('VALIDATION_ERROR', 400, '`from` no puede ser posterior a `to`')
  }

  const diffMs = toUtcExclusive.getTime() - fromUtc.getTime()
  const maxMs = 365 * ONE_DAY_MS
  if (diffMs > maxMs) {
    return problemCode('VALIDATION_ERROR', 400, 'El rango máximo de consulta es de 365 días')
  }

  const limit = page_size
  const offset = (page - 1) * page_size

  const { data, error } = await supabase.rpc('get_frequent_customers', {
    p_restaurant_id: restaurantId,
    p_from: fromUtc.toISOString(),
    p_to: toUtcExclusive.toISOString(),
    p_min_orders: min_orders,
    p_include_suspicious: include_suspicious,
    p_search: search || '',
    p_sort_by: sort_by,
    p_sort_dir: sort_dir,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return problemCode('INTERNAL_ERROR', 500, error.message)
  }

  const rows = (data as unknown as any[]) ?? []
  const total = Number(rows[0]?.total_count ?? 0)
  const items = rows.map((r) => ({
    client_phone: r.client_phone,
    client_name: r.client_name,
    order_count: Number(r.order_count),
    total_spent: Number(r.total_spent),
    avg_ticket: Number(r.avg_ticket),
    first_order_in_range: r.first_order_in_range,
    last_order_in_range: r.last_order_in_range,
    days_since_last_order: Number(r.days_since_last_order),
    category: r.category as 'vip' | 'active' | 'dormant',
  }))

  return NextResponse.json({
    data: items,
    total,
    page,
    page_size,
    filters_applied: {
      from: fromYmd,
      to: toYmd,
      min_orders,
      include_suspicious,
      search: search || undefined,
    },
  })
}
