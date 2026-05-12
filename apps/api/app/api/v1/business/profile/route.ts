import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import type { TablesUpdate } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['business'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase

  const { data, error } = await sb
    .from('marketplace_businesses')
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_published, is_verified, delivery_restaurant_id, created_at, updated_at',
    )
    .eq('user_id', auth.auth.userId)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('NOT_FOUND', 404)

  return NextResponse.json({ business: mapBusiness(data, auth.auth.email) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['business'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase

  const body = await parseJson(req, Business.UpdateBusinessProfile)
  if (!body.ok) return body.response

  const patch: TablesUpdate<'marketplace_businesses'> = {}
  if (body.data.name !== undefined) patch.name = body.data.name
  if (body.data.phone !== undefined) patch.phone = body.data.phone
  if (body.data.address !== undefined) patch.address = body.data.address
  if (body.data.description !== undefined) patch.description = body.data.description
  if (body.data.accentColor !== undefined) patch.accent_color = body.data.accentColor
  if (body.data.isPublished !== undefined) patch.is_published = body.data.isPublished

  const { data, error } = await sb
    .from('marketplace_businesses')
    .update(patch)
    .eq('user_id', auth.auth.userId)
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_published, is_verified, delivery_restaurant_id, created_at, updated_at',
    )
    .single()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ business: mapBusiness(data, auth.auth.email) })
}

function mapBusiness(row: any, email: string) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    description: row.description,
    accentColor: row.accent_color,
    isActive: row.is_active,
    isPublished: row.is_published,
    isVerified: row.is_verified,
    deliveryEnabled: Boolean(row.delivery_restaurant_id),
    email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
