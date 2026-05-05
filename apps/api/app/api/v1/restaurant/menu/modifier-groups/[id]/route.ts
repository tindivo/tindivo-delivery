import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateGroupSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  minSelected: z.number().int().min(0).max(20).optional(),
  maxSelected: z.number().int().min(1).max(20).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, UpdateGroupSchema)
  if (!body.ok) return body.response

  const { id } = await params
  const updates: Record<string, unknown> = {}
  if (body.data.name !== undefined) updates.name = body.data.name
  if (body.data.minSelected !== undefined) updates.min_selected = body.data.minSelected
  if (body.data.maxSelected !== undefined) updates.max_selected = body.data.maxSelected
  if (body.data.sortOrder !== undefined) updates.sort_order = body.data.sortOrder
  if (body.data.isActive !== undefined) updates.is_active = body.data.isActive

  const { data, error } = await auth.auth.supabase
    .from('menu_modifier_groups')
    .update(updates as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params
  const { error } = await auth.auth.supabase.from('menu_modifier_groups').delete().eq('id', id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
