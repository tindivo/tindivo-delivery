/**
 * Edge Function: generate-weekly-settlements
 *
 * pg_cron invoca esta función cada lunes 10:00 AM.
 * Agrega los pedidos `delivered` no facturados de la semana anterior
 * por restaurante y crea una settlement pendiente.
 */

import { createServiceRoleClient } from '../_shared/supabase.ts'

function lastMondayToSunday(now: Date): { start: string; end: string; due: string } {
  const monday = new Date(now)
  const day = monday.getDay() // 0..6 (0 dom)
  const diffToMonday = (day + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - diffToMonday - 7)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  const due = new Date(now)
  due.setUTCDate(due.getUTCDate() + 4)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    due: due.toISOString().slice(0, 10),
  }
}

Deno.serve(async () => {
  const sb = createServiceRoleClient()
  const { start, end, due } = lastMondayToSunday(new Date())

  const { data: orders } = await sb
    .from('orders')
    .select('id, restaurant_id, delivery_fee')
    .eq('status', 'delivered')
    .gte('delivered_at', `${start}T00:00:00Z`)
    .lte('delivered_at', `${end}T23:59:59Z`)

  const byRestaurant: Record<string, { count: number; total: number }> = {}
  for (const o of orders ?? []) {
    const rid = o.restaurant_id
    const fee = Number(o.delivery_fee)
    if (!byRestaurant[rid]) byRestaurant[rid] = { count: 0, total: 0 }
    byRestaurant[rid].count++
    byRestaurant[rid].total += fee
  }

  const inserts = Object.entries(byRestaurant).map(([restaurant_id, v]) => ({
    restaurant_id,
    period_start: start,
    period_end: end,
    order_count: v.count,
    total_amount: Math.round(v.total * 100) / 100,
    status: 'pending' as const,
    due_date: due,
  }))

  if (inserts.length === 0) {
    return new Response(JSON.stringify({ generated: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await sb.from('settlements').upsert(inserts, {
    onConflict: 'restaurant_id,period_start,period_end',
    ignoreDuplicates: true,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ generated: inserts.length, period: { start, end, due } }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
