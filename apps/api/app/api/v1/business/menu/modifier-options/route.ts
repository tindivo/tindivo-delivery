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
  const auth = await requireAuth(req, ['business'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response

  const body = await parseJson(req, Business.CreateOption)
  if (!body.ok) return body.response

  const { data: group } = await sb
    .from('marketplace_menu_modifier_groups')
    .select('id, marketplace_menu_items!inner(business_id)')
    .eq('id', body.data.groupId)
    .eq('marketplace_menu_items.business_id', business.id)
    .maybeSingle()
  if (!group) return problemCode('FORBIDDEN', 403)

  const admin = createAdminClient()
  return withIdempotency(req, 'business_modifier_options', body.data, admin, async () => {
    const { data, error } = await sb
      .from('marketplace_menu_modifier_options')
      .insert({
        group_id: body.data.groupId,
        name: body.data.name,
        price_delta: body.data.priceDelta,
        sort_order: body.data.sortOrder,
        is_available: body.data.isAvailable,
      })
      .select('*')
      .single()
    if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
    return NextResponse.json(data, { status: 201 })
  })
}
