import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Drivers } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/drivers/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.auth.supabase
    .from('drivers')
    .select('*, users(email), driver_availability(is_available)')
    .eq('id', id)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('DRIVER_NOT_FOUND', 404)

  return NextResponse.json(data)
}

/**
 * PATCH /api/v1/admin/drivers/[id]
 * Edita campos del motorizado desde el admin (no cambia credenciales).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, Drivers.UpdateDriverRequest)
  if (!body.ok) return body.response

  const input = body.data
  const patch: {
    updated_at: string
    full_name?: string
    phone?: string
    vehicle_type?: 'moto' | 'bicicleta' | 'pie' | 'auto'
    license_plate?: string | null
    operating_days?: string[]
    shift_start?: string
    shift_end?: string
  } = { updated_at: new Date().toISOString() }

  if (input.fullName !== undefined) patch.full_name = input.fullName
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.vehicleType !== undefined) patch.vehicle_type = input.vehicleType
  if (input.licensePlate !== undefined) patch.license_plate = input.licensePlate ?? null
  if (input.operatingDays !== undefined) patch.operating_days = input.operatingDays
  if (input.shiftStart !== undefined) patch.shift_start = input.shiftStart
  if (input.shiftEnd !== undefined) patch.shift_end = input.shiftEnd

  const { data, error } = await auth.auth.supabase
    .from('drivers')
    .update(patch)
    .eq('id', id)
    .select('*, users(email), driver_availability(is_available)')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('DRIVER_NOT_FOUND', 404)

  return NextResponse.json(data)
}
