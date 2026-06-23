import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseQuery } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { ServerClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Perú está en UTC-5 fijo (sin DST).
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Día-Perú (YYYY-MM-DD) → instante UTC de su medianoche local. */
function peruDayStartUtc(ymd: string): Date {
  // El schema Zod garantiza el formato YYYY-MM-DD, así que el tuple es seguro.
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d) + PERU_OFFSET_MS)
}

/** Fecha actual expresada como día-Perú (YYYY-MM-DD). */
function todayPeruYmd(now: Date): string {
  return new Date(now.getTime() - PERU_OFFSET_MS).toISOString().slice(0, 10)
}

// Cursor opaco para keyset pagination sobre (created_at desc, id desc).
function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}|${id}`
}
function decodeCursor(cursor: string): { ts: string; id: string } | null {
  const i = cursor.lastIndexOf('|')
  if (i <= 0) return null
  return { ts: cursor.slice(0, i), id: cursor.slice(i + 1) }
}

/**
 * Resumen del periodo (pedidos entregados + comisión total que el restaurante
 * debe a Tindivo) para el rango [fromIso, toIso). Camino canónico: la función
 * SQL `get_restaurant_history_summary` (SUM exacto a cualquier escala, sin tope
 * de filas del cliente). Si la migración aún no está aplicada, cae a una suma
 * en server: el conteo sigue siendo exacto (count) y el total es correcto salvo
 * que el proyecto limite filas de PostgREST y haya un volumen enorme de
 * entregados en el rango — escenario que la RPC resuelve una vez desplegada.
 */
async function loadHistorySummary(
  supabase: ServerClient,
  restaurantId: string,
  fromIso: string,
  toIso: string,
): Promise<{ deliveredCount: number; totalCommission: number }> {
  const rpc = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: Array<{ delivered_count: number; total_commission: number | string }> | null
      error: { message: string } | null
    }>
  )('get_restaurant_history_summary', {
    p_restaurant_id: restaurantId,
    p_from: fromIso,
    p_to: toIso,
  })
  if (!rpc.error && rpc.data?.[0]) {
    return {
      deliveredCount: Number(rpc.data[0].delivered_count ?? 0),
      totalCommission: Number(rpc.data[0].total_commission ?? 0),
    }
  }

  const { data: feeRows, count } = await supabase
    .from('orders')
    .select('delivery_fee', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
  const totalCommission = (feeRows ?? []).reduce(
    (sum, r) => sum + Number((r as { delivery_fee: number | string | null }).delivery_fee ?? 0),
    0,
  )
  return { deliveredCount: count ?? 0, totalCommission }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)
  const restaurantId = auth.auth.restaurantId
  const supabase = auth.auth.supabase

  const parsed = parseQuery(req.nextUrl.searchParams, Orders.RestaurantHistoryQuery)
  if (!parsed.ok) return parsed.response
  const { from, to, status, cursor, limit } = parsed.data

  // Default sin fecha = "Hoy" (día-Perú). La UI siempre manda rango; el default
  // protege llamadas directas de barrer todo el histórico por accidente.
  const now = new Date()
  const fromYmd = from ?? todayPeruYmd(now)
  const toYmd = to ?? fromYmd
  const fromUtc = peruDayStartUtc(fromYmd)
  // `to` es inclusivo a nivel de día ⇒ corte superior exclusivo = día siguiente.
  const toUtcExclusive = new Date(peruDayStartUtc(toYmd).getTime() + ONE_DAY_MS)
  if (fromUtc.getTime() >= toUtcExclusive.getTime()) {
    return problemCode('VALIDATION_ERROR', 400, '`from` no puede ser posterior a `to`')
  }

  const statuses: ('delivered' | 'cancelled')[] = status ? [status] : ['delivered', 'cancelled']
  const fromIso = fromUtc.toISOString()
  const toIso = toUtcExclusive.toISOString()

  // ── Página de items (keyset sobre created_at desc, id desc) ──
  let q = supabase
    .from('orders')
    .select('*, drivers!orders_driver_id_fkey(full_name)')
    .eq('restaurant_id', restaurantId)
    .in('status', statuses)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // +1 para detectar si hay página siguiente

  if (cursor) {
    const c = decodeCursor(cursor)
    // Filas estrictamente "después" del cursor en el orden (created_at, id) desc.
    if (c) q = q.or(`created_at.lt.${c.ts},and(created_at.eq.${c.ts},id.lt.${c.id})`)
  }

  const { data, error } = await q
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last.created_at, last.id) : null

  // Resumen del rango COMPLETO (no solo la página): entregados + comisión total
  // del periodo. Prefiere la función SQL; cae a suma en server si no existe aún.
  const summary = await loadHistorySummary(supabase, restaurantId, fromIso, toIso)

  return NextResponse.json({ items, nextCursor, summary })
}
