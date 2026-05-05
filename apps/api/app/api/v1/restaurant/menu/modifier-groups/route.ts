import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreateGroupSchema = z
  .object({
    menuItemId: z.string().uuid(),
    name: z.string().min(2).max(60),
    minSelected: z.number().int().min(0).max(20).default(0),
    maxSelected: z.number().int().min(1).max(20).default(1),
    sortOrder: z.number().int().min(0).max(9999).default(0),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.maxSelected >= d.minSelected, { message: 'maxSelected debe ser ≥ minSelected' })

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const body = await parseJson(req, CreateGroupSchema)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('menu_modifier_groups')
    .insert({
      menu_item_id: body.data.menuItemId,
      name: body.data.name,
      min_selected: body.data.minSelected,
      max_selected: body.data.maxSelected,
      sort_order: body.data.sortOrder,
      is_active: body.data.isActive,
    })
    .select('*')
    .single()
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json(data, { status: 201 })
}
