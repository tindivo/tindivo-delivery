import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, CreateCategorySchema)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('menu_categories')
    .insert({
      restaurant_id: auth.auth.restaurantId,
      name: body.data.name,
      description: body.data.description ?? null,
      sort_order: body.data.sortOrder,
      is_active: body.data.isActive,
    })
    .select('*')
    .single()
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json(data, { status: 201 })
}
