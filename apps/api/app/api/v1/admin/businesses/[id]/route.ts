import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import type { TablesUpdate } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/v1/admin/businesses/[id]
 * Admin enlaza el negocio a un restaurant existente (o desenlaza pasando
 * null en `deliveryRestaurantId`), o cambia los flags `is_verified` /
 * `is_active` / `is_published`.
 *
 * Si se enlaza con un restaurant inexistente, retorna 404. El servicio NO
 * copia accent_color ni hereda is_active del restaurant — el admin
 * mantiene esos campos independientes a propósito.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const { id } = await params

  const body = await parseJson(req, Business.AdminUpdateBusiness)
  if (!body.ok) return body.response

  const patch: TablesUpdate<'marketplace_businesses'> = {}

  if (body.data.deliveryRestaurantId !== undefined) {
    if (body.data.deliveryRestaurantId !== null) {
      const { data: r, error: rErr } = await sb
        .from('restaurants')
        .select('id')
        .eq('id', body.data.deliveryRestaurantId)
        .maybeSingle()
      if (rErr) return problemCode('INTERNAL_ERROR', 500, rErr.message)
      if (!r) return problemCode('NOT_FOUND', 404, 'Restaurant no encontrado')
    }
    patch.delivery_restaurant_id = body.data.deliveryRestaurantId
  }

  if (body.data.isVerified !== undefined) patch.is_verified = body.data.isVerified
  if (body.data.isActive !== undefined) patch.is_active = body.data.isActive
  if (body.data.isPublished !== undefined) patch.is_published = body.data.isPublished

  const { data: updated, error: uErr } = await sb
    .from('marketplace_businesses')
    .update(patch)
    .eq('id', id)
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_published, is_verified, delivery_restaurant_id, created_at, updated_at',
    )
    .maybeSingle()
  if (uErr) return problemCode('INTERNAL_ERROR', 500, uErr.message)
  if (!updated) return problemCode('NOT_FOUND', 404)

  return NextResponse.json(updated)
}
