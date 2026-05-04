import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Drivers } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/v1/admin/drivers/[id]/restaurants
 *
 * Reemplaza el set completo de restaurantes asignados al motorizado.
 * Solo los drivers asignados a un restaurante son candidatos en
 * `findAssignmentCandidates` para pedidos creados por ese restaurante.
 *
 * Body: { restaurantIds: string[] }
 *
 * Estrategia: DELETE-all + INSERT-all dentro de un PostgREST batch. Para
 * evitar ventanas donde el driver quede temporalmente sin asignaciones,
 * primero insertamos las nuevas con `upsert + ignoreDuplicates` y luego
 * borramos las que no estén en el set nuevo.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id: driverId } = await params
  const body = await parseJson(req, Drivers.SetDriverRestaurantsRequest)
  if (!body.ok) return body.response

  const admin = createAdminClient()

  const { data: driverExists } = await admin
    .from('drivers')
    .select('id')
    .eq('id', driverId)
    .maybeSingle()
  if (!driverExists) return problemCode('DRIVER_NOT_FOUND', 404)

  const desired = Array.from(new Set(body.data.restaurantIds))

  if (desired.length > 0) {
    const { error: insertErr } = await admin.from('driver_restaurants').upsert(
      desired.map((restaurant_id) => ({ driver_id: driverId, restaurant_id })),
      { onConflict: 'driver_id,restaurant_id', ignoreDuplicates: true },
    )
    if (insertErr) return problemCode('INTERNAL_ERROR', 500, insertErr.message)
  }

  let deleteQuery = admin.from('driver_restaurants').delete().eq('driver_id', driverId)
  if (desired.length > 0) {
    deleteQuery = deleteQuery.not('restaurant_id', 'in', `(${desired.join(',')})`)
  }
  const { error: deleteErr } = await deleteQuery
  if (deleteErr) return problemCode('INTERNAL_ERROR', 500, deleteErr.message)

  return NextResponse.json({ driverId, restaurantIds: desired })
}
