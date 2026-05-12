import { withIdempotency } from '@/lib/http/idempotency'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getBusinessId } from '../_shared'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['business', 'restaurant'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response

  const body = await parseJson(req, Business.CreateGroup)
  if (!body.ok) return body.response

  const { data: item } = await sb
    .from('menu_items')
    .select('id')
    .eq('id', body.data.menuItemId)
    .eq('restaurant_id', business.id)
    .maybeSingle()
  if (!item) return problemCode('FORBIDDEN', 403)

  const admin = createAdminClient()
  return withIdempotency(req, 'business_modifier_groups', body.data, admin, async () => {
    const { data, error } = await sb
      .from('menu_modifier_groups')
      .insert({
        menu_item_id: body.data.menuItemId,
        name: body.data.name,
        min_selected: body.data.minSelected,
        max_selected: body.data.maxSelected,
        sort_order: body.data.sortOrder,
        is_active: body.data.isActive,
      })
      .select('*')
      .single()
    if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
    return NextResponse.json(data, { status: 201 })
  })
}
