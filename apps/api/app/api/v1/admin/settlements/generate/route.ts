import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Body opcional: si no llega, el backend usa la semana anterior
// (lunes→domingo) con due_date = period_end + 4 días.
const Body = z
  .object({
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    dueDate: z.string().date().optional(),
  })
  .optional()
  .default({})

/**
 * POST /api/v1/admin/settlements/generate
 * Agrupa los orders delivered del período por restaurant y upserta una fila
 * pending en settlements. Idempotente por UNIQUE (restaurant_id, period_start,
 * period_end). Requiere rol admin (requireAuth + RLS settlements_admin_all).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const raw = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    return problemCode('VALIDATION_ERROR', 400, 'Fechas inválidas')
  }

  const { periodStart, periodEnd, dueDate } = resolvePeriod(parsed.data)

  // 1) Agrupar orders delivered del período
  const { data: orders, error: ordersErr } = await auth.auth.supabase
    .from('orders')
    .select('restaurant_id, delivery_fee, delivered_at')
    .eq('status', 'delivered')
    .gte('delivered_at', `${periodStart}T00:00:00Z`)
    .lte('delivered_at', `${periodEnd}T23:59:59Z`)

  if (ordersErr) return problemCode('INTERNAL_ERROR', 500, ordersErr.message)

  const grouped = new Map<string, { total: number; count: number }>()
  for (const o of orders ?? []) {
    const curr = grouped.get(o.restaurant_id) ?? { total: 0, count: 0 }
    curr.total += Number(o.delivery_fee)
    curr.count += 1
    grouped.set(o.restaurant_id, curr)
  }

  if (grouped.size === 0) {
    return NextResponse.json(
      { period: { periodStart, periodEnd, dueDate }, generated: [] },
      { status: 201 },
    )
  }

  // 2) Insert idempotente. Si ya hay una fila para ese período (restaurant_id,
  // period_start, period_end), NO se toca — evita pisar `status='paid'` con
  // `pending`. Si el admin necesita regenerar, debe borrar la fila existente.
  const rows = Array.from(grouped.entries()).map(([restaurant_id, agg]) => ({
    restaurant_id,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: dueDate,
    order_count: agg.count,
    total_amount: Number(agg.total.toFixed(2)),
    status: 'pending' as const,
  }))

  const { data: upserted, error: upsertErr } = await auth.auth.supabase
    .from('settlements')
    .upsert(rows, {
      onConflict: 'restaurant_id,period_start,period_end',
      ignoreDuplicates: true,
    })
    .select('*, restaurants(name, accent_color, yape_number)')

  if (upsertErr) return problemCode('INTERNAL_ERROR', 500, upsertErr.message)

  const generated = (upserted ?? []).map((row) => {
    const { restaurants, ...rest } = row as typeof row & {
      restaurants: { name: string; accent_color: string; yape_number: string | null } | null
    }
    return {
      ...rest,
      restaurant_name: restaurants?.name ?? '',
      accent_color: restaurants?.accent_color ?? 'FF6B35',
      yape_number: restaurants?.yape_number ?? null,
    }
  })

  return NextResponse.json(
    {
      period: { periodStart, periodEnd, dueDate },
      generated,
    },
    { status: 201 },
  )
}

function resolvePeriod(input: {
  periodStart?: string
  periodEnd?: string
  dueDate?: string
}): { periodStart: string; periodEnd: string; dueDate: string } {
  if (input.periodStart && input.periodEnd && input.dueDate) {
    return {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      dueDate: input.dueDate,
    }
  }

  // Semana anterior: lunes..domingo previo al hoy.
  const today = new Date()
  const day = today.getUTCDay() // 0=dom, 1=lun, ..., 6=sáb
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const thisMonday = new Date(today)
  thisMonday.setUTCDate(today.getUTCDate() - daysSinceMonday)
  thisMonday.setUTCHours(0, 0, 0, 0)

  const lastMonday = new Date(thisMonday)
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7)

  const lastSunday = new Date(thisMonday)
  lastSunday.setUTCDate(thisMonday.getUTCDate() - 1)

  const due = new Date(lastSunday)
  due.setUTCDate(lastSunday.getUTCDate() + 4)

  const iso = (d: Date) => d.toISOString().slice(0, 10)

  return {
    periodStart: input.periodStart ?? iso(lastMonday),
    periodEnd: input.periodEnd ?? iso(lastSunday),
    dueDate: input.dueDate ?? iso(due),
  }
}
