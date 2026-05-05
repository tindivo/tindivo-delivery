import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateOptionSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  priceDelta: z.number().min(-9999.99).max(9999.99).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isAvailable: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, UpdateOptionSchema)
  if (!body.ok) return body.response

  const { id } = await params
  const updates: Record<string, unknown> = {}
  if (body.data.name !== undefined) updates.name = body.data.name
  if (body.data.priceDelta !== undefined) updates.price_delta = body.data.priceDelta
  if (body.data.sortOrder !== undefined) updates.sort_order = body.data.sortOrder
  if (body.data.isAvailable !== undefined) updates.is_available = body.data.isAvailable

  const { data, error } = await auth.auth.supabase
    .from('menu_modifier_options')
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
  const { error } = await auth.auth.supabase.from('menu_modifier_options').delete().eq('id', id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
