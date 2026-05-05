import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateItemSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0).max(9999.99).optional(),
  imageUrl: z.string().url().nullable().optional(),
  prepMinutes: z.number().int().min(5).max(120).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, UpdateItemSchema)
  if (!body.ok) return body.response

  const { id } = await params
  const updates: Record<string, unknown> = {}
  if (body.data.categoryId !== undefined) updates.category_id = body.data.categoryId
  if (body.data.name !== undefined) updates.name = body.data.name
  if (body.data.description !== undefined) updates.description = body.data.description
  if (body.data.price !== undefined) updates.price = body.data.price
  if (body.data.imageUrl !== undefined) updates.image_url = body.data.imageUrl
  if (body.data.prepMinutes !== undefined) updates.prep_minutes = body.data.prepMinutes
  if (body.data.isAvailable !== undefined) updates.is_available = body.data.isAvailable
  if (body.data.isFeatured !== undefined) updates.is_featured = body.data.isFeatured
  if (body.data.sortOrder !== undefined) updates.sort_order = body.data.sortOrder

  const { data, error } = await auth.auth.supabase
    .from('menu_items')
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
  const { error } = await auth.auth.supabase.from('menu_items').delete().eq('id', id)
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
