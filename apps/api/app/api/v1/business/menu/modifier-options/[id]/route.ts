import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getBusinessId } from '../../_shared'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['business'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response
  const { id } = await params

  const { data: option } = await sb
    .from('marketplace_menu_modifier_options')
    .select('id, marketplace_menu_modifier_groups!inner(marketplace_menu_items!inner(business_id))')
    .eq('id', id)
    .eq('marketplace_menu_modifier_groups.marketplace_menu_items.business_id', business.id)
    .maybeSingle()
  if (!option) return problemCode('FORBIDDEN', 403)

  const { error } = await sb.from('marketplace_menu_modifier_options').delete().eq('id', id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
