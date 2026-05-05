import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreateOptionSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(2).max(80),
  priceDelta: z.number().min(-9999.99).max(9999.99).default(0),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isAvailable: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, CreateOptionSchema)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('menu_modifier_options')
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
}
