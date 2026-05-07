import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/restaurant-payments/summary
 * Resumen para la vista /admin/cobros: lista de restaurantes con balance_due
 * (incluye los con deuda 0 también para que el admin tenga el panorama
 * completo, pero la UI puede filtrar). Total acumulado.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .select('id, name, accent_color, balance_due, is_active, yape_number')
    .order('balance_due', { ascending: false })
    .order('name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const items = (data ?? []).map((row) => ({
    restaurantId: row.id,
    restaurantName: row.name,
    accentColor: row.accent_color,
    balanceDue: Number(row.balance_due),
    isActive: row.is_active,
    yapeNumber: row.yape_number,
  }))

  const totalDebt = items.reduce((sum, r) => sum + r.balanceDue, 0)

  return NextResponse.json({ items, totalDebt: Number(totalDebt.toFixed(2)) })
}
