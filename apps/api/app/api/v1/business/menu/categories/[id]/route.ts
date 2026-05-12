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

  const body = await parseJson(req, Business.UpdateCategory)
  if (!body.ok) return body.response

  const patch: TablesUpdate<'menu_categories'> = {}
  if (body.data.name !== undefined) patch.name = body.data.name
  if (body.data.description !== undefined) patch.description = body.data.description
  if (body.data.sortOrder !== undefined) patch.sort_order = body.data.sortOrder
  if (body.data.isActive !== undefined) patch.is_active = body.data.isActive

  const { data, error } = await sb
    .from('menu_categories')
    .update(patch)
    .eq('id', id)
    .eq('restaurant_id', business.id)
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

  const { error } = await sb
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', business.id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
