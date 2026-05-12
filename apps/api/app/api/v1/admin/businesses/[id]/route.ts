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
 * Admin enlaza el negocio a un restaurant existente (o desenlaza pasando
 * null en `deliveryRestaurantId`), o cambia los flags `is_verified` /
 * `is_active` / `is_published`.
 *
 * Si `mergeCredentials=true` y se enlaza con un restaurant: reasigna
 * `restaurants.user_id` al user del business, agrega 'restaurant' a
 * `users.roles[]`, y desactiva el user viejo del restaurant. Permite que
 * el dueño use una sola credencial para tindivo.com y delivery.tindivo.com.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response
  const sb = auth.auth.supabase
  const admin = createAdminClient()
  const { id } = await params

  const body = await parseJson(req, Business.AdminUpdateBusiness)
  if (!body.ok) return body.response

  const patch: TablesUpdate<'marketplace_businesses'> = {}

  let businessUserId: string | null = null

  if (body.data.deliveryRestaurantId !== undefined) {
    if (body.data.deliveryRestaurantId !== null) {
      const { data: r, error: rErr } = await sb
        .from('restaurants')
        .select('id, user_id')
        .eq('id', body.data.deliveryRestaurantId)
        .maybeSingle()
      if (rErr) return problemCode('INTERNAL_ERROR', 500, rErr.message)
      if (!r) return problemCode('NOT_FOUND', 404, 'Restaurant no encontrado')

      if (body.data.mergeCredentials) {
        const { data: business, error: bErr } = await sb
          .from('marketplace_businesses')
          .select('id, user_id')
          .eq('id', id)
          .maybeSingle()
        if (bErr) return problemCode('INTERNAL_ERROR', 500, bErr.message)
        if (!business) return problemCode('NOT_FOUND', 404)

        businessUserId = business.user_id
        const oldRestaurantUserId = r.user_id

        if (oldRestaurantUserId !== businessUserId) {
          // 1. Reasignar restaurants.user_id al user del business.
          const { error: updRest } = await admin
            .from('restaurants')
            .update({ user_id: businessUserId })
            .eq('id', body.data.deliveryRestaurantId)
          if (updRest)
            return problemCode('INTERNAL_ERROR', 500, `Reasignar restaurant: ${updRest.message}`)

          // 2. Agregar 'restaurant' a users.roles del business user (sin duplicar).
          const { data: bUser } = await admin
            .from('users')
            .select('roles')
            .eq('id', businessUserId)
            .single()
          const currentRoles = (bUser?.roles ?? []) as string[]
          if (!currentRoles.includes('restaurant')) {
            const { error: updRoles } = await admin
              .from('users')
              .update({ roles: [...currentRoles, 'restaurant'] })
              .eq('id', businessUserId)
            if (updRoles)
              return problemCode('INTERNAL_ERROR', 500, `Extender roles: ${updRoles.message}`)
          }

          // 3. Desactivar el user viejo del restaurant (no se borra para preservar histórico).
          const { error: updOld } = await admin
            .from('users')
            .update({ is_active: false })
            .eq('id', oldRestaurantUserId)
          if (updOld)
            return problemCode('INTERNAL_ERROR', 500, `Desactivar viejo user: ${updOld.message}`)
        }
      }
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
