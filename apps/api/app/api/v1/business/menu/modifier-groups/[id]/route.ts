import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import type { TablesUpdate } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getBusinessId } from '../../_shared'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['business', 'restaurant'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response
  const { id } = await params

  const body = await parseJson(req, Business.UpdateGroup)
  if (!body.ok) return body.response

  const { data: group } = await sb
    .from('menu_modifier_groups')
    .select('id, menu_items!inner(restaurant_id)')
    .eq('id', id)
    .eq('menu_items.restaurant_id', business.id)
    .maybeSingle()
  if (!group) return problemCode('FORBIDDEN', 403)

  const patch: TablesUpdate<'menu_modifier_groups'> = {}
  if (body.data.name !== undefined) patch.name = body.data.name
  if (body.data.minSelected !== undefined) patch.min_selected = body.data.minSelected
  if (body.data.maxSelected !== undefined) patch.max_selected = body.data.maxSelected
  if (body.data.sortOrder !== undefined) patch.sort_order = body.data.sortOrder
  if (body.data.isActive !== undefined) patch.is_active = body.data.isActive

  const { data, error } = await sb
    .from('menu_modifier_groups')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['business', 'restaurant'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response
  const { id } = await params

  const { data: group } = await sb
    .from('menu_modifier_groups')
    .select('id, menu_items!inner(restaurant_id)')
    .eq('id', id)
    .eq('menu_items.restaurant_id', business.id)
    .maybeSingle()
  if (!group) return problemCode('FORBIDDEN', 403)

  const { error } = await sb.from('menu_modifier_groups').delete().eq('id', id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
