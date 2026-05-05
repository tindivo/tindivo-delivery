import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreateItemSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(9999.99),
  imageUrl: z.string().url().nullable().optional(),
  prepMinutes: z.number().int().min(5).max(120).optional(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, CreateItemSchema)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('menu_items')
    .insert({
      restaurant_id: auth.auth.restaurantId,
      category_id: body.data.categoryId ?? null,
      name: body.data.name,
      description: body.data.description ?? null,
      price: body.data.price,
      image_url: body.data.imageUrl ?? null,
      prep_minutes: body.data.prepMinutes ?? null,
      is_available: body.data.isAvailable,
      is_featured: body.data.isFeatured,
      sort_order: body.data.sortOrder,
    })
    .select('*')
    .single()
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json(data, { status: 201 })
}
