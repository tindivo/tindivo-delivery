import { withIdempotency } from '@/lib/http/idempotency'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getBusinessId } from '../_shared'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['business'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const business = await getBusinessId(sb, auth.auth.userId)
  if (!business.ok) return business.response

  const body = await parseJson(req, Business.CreateItem)
  if (!body.ok) return body.response

  const admin = createAdminClient()
  return withIdempotency(req, 'business_items', body.data, admin, async () => {
    const { data, error } = await sb
      .from('marketplace_menu_items')
      .insert({
        business_id: business.id,
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
  })
}
