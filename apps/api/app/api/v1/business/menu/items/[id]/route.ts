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

  const body = await parseJson(req, Business.UpdateItem)
  if (!body.ok) return body.response

  const patch: TablesUpdate<'menu_items'> = {}
  if (body.data.categoryId !== undefined) patch.category_id = body.data.categoryId
  if (body.data.name !== undefined) patch.name = body.data.name
  if (body.data.description !== undefined) patch.description = body.data.description
  if (body.data.price !== undefined) patch.price = body.data.price
  if (body.data.imageUrl !== undefined) patch.image_url = body.data.imageUrl
  if (body.data.prepMinutes !== undefined) patch.prep_minutes = body.data.prepMinutes
  if (body.data.isAvailable !== undefined) patch.is_available = body.data.isAvailable
  if (body.data.isFeatured !== undefined) patch.is_featured = body.data.isFeatured
  if (body.data.sortOrder !== undefined) patch.sort_order = body.data.sortOrder

  const { data, error } = await sb
    .from('menu_items')
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
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', business.id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
