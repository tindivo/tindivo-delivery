import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getBusinessId } from './_shared'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['business', 'restaurant'])
  if (!auth.ok) return auth.response

  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response

  const { data: categories, error: catErr } = await sb
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', business.id)
    .order('sort_order')
  if (catErr) return problemCode('INTERNAL_ERROR', 500, catErr.message)

  const { data: items, error: itemErr } = await sb
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', business.id)
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
