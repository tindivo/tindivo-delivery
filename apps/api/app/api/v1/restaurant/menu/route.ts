import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/restaurant/menu
 *
 * Devuelve el árbol completo del catálogo del restaurante autenticado:
 * categorías + items + modificadores. RLS limita el acceso al
 * restaurant_id del usuario; el endpoint solo agrega + estructura.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const sb = auth.auth.supabase

  const { data: categories, error: catErr } = await sb
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', auth.auth.restaurantId)
    .order('sort_order')
  if (catErr) return problemCode('INTERNAL_ERROR', 500, catErr.message)

  const { data: items, error: itemErr } = await sb
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', auth.auth.restaurantId)
    .order('sort_order')
  if (itemErr) return problemCode('INTERNAL_ERROR', 500, itemErr.message)

  const itemIds = (items ?? []).map((i) => i.id)
  const { data: groups, error: gErr } =
    itemIds.length > 0
      ? await sb
          .from('menu_modifier_groups')
          .select('*')
          .in('menu_item_id', itemIds)
          .order('sort_order')
      : { data: [], error: null }
  if (gErr) return problemCode('INTERNAL_ERROR', 500, gErr.message)

  const groupIds = (groups ?? []).map((g) => g.id)
  const { data: options, error: oErr } =
    groupIds.length > 0
      ? await sb
          .from('menu_modifier_options')
          .select('*')
          .in('group_id', groupIds)
          .order('sort_order')
      : { data: [], error: null }
  if (oErr) return problemCode('INTERNAL_ERROR', 500, oErr.message)

  return NextResponse.json({
    categories: categories ?? [],
    items: items ?? [],
    groups: groups ?? [],
    options: options ?? [],
  })
}
