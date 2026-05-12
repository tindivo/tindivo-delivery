import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Business } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { TablesUpdate } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/v1/admin/businesses/[id]
 *
 * Admin actualiza flags del negocio/restaurant. Cuando `isDeliveryEnabled`
 * pasa de false a true, requiere `commissionPerOrder` y agrega
 * 'restaurant' a `users.roles[]` del dueno. Sin merge credentials porque
 * despues de la unificacion negocio y restaurant son la misma entidad.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const admin = createAdminClient()
  const { id } = await params

  const body = await parseJson(req, Business.AdminUpdateBusiness)
  if (!body.ok) return body.response

  // Si va a habilitar delivery, validar que commissionPerOrder este definido
  if (body.data.isDeliveryEnabled === true && body.data.commissionPerOrder === undefined) {
    return problemCode(
      'VALIDATION_ERROR',
      400,
      'commissionPerOrder es requerido al habilitar delivery',
    )
  }

  const { data: current, error: cErr } = await sb
    .from('restaurants')
    .select('user_id, is_delivery_enabled')
    .eq('id', id)
    .maybeSingle()
  if (cErr) return problemCode('INTERNAL_ERROR', 500, cErr.message)
  if (!current) return problemCode('NOT_FOUND', 404)

  const patch: TablesUpdate<'restaurants'> = {}
  if (body.data.description !== undefined) patch.description = body.data.description
  if (body.data.isMarketplacePublished !== undefined)
    patch.is_marketplace_published = body.data.isMarketplacePublished
  if (body.data.isDeliveryEnabled !== undefined)
    patch.is_delivery_enabled = body.data.isDeliveryEnabled
  if (body.data.isVerified !== undefined) patch.is_verified = body.data.isVerified
  if (body.data.isActive !== undefined) patch.is_active = body.data.isActive
  if (body.data.commissionPerOrder !== undefined)
    patch.commission_per_order = body.data.commissionPerOrder

  const { data: updated, error: uErr } = await sb
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select(
      'id, name, phone, address, description, accent_color, commission_per_order, is_active, is_marketplace_published, is_verified, is_delivery_enabled, created_at, updated_at',
    )
    .maybeSingle()
  if (uErr) return problemCode('INTERNAL_ERROR', 500, uErr.message)
  if (!updated) return problemCode('NOT_FOUND', 404)

  // Si activamos delivery por primera vez, agregar 'restaurant' a roles[]
  if (body.data.isDeliveryEnabled === true && !current.is_delivery_enabled) {
    const { data: u } = await admin.from('users').select('roles').eq('id', current.user_id).single()
    const currentRoles = (u?.roles ?? []) as string[]
    if (!currentRoles.includes('restaurant')) {
      await admin
        .from('users')
        .update({ roles: [...currentRoles, 'restaurant'] })
        .eq('id', current.user_id)
    }
  }

  return NextResponse.json(updated)
}
