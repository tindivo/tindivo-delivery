import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('drivers')
    .select(
      'id, full_name, phone, vehicle_type, license_plate, operating_days, shift_start, shift_end, is_active, driver_availability(is_available)',
    )
    .eq('id', auth.auth.driverId)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('NOT_FOUND', 404)

  const availability = Array.isArray(data.driver_availability)
    ? data.driver_availability[0]
    : data.driver_availability

  return NextResponse.json({
    id: data.id,
    fullName: data.full_name,
    phone: data.phone,
    vehicleType: data.vehicle_type,
    licensePlate: data.license_plate,
    operatingDays: data.operating_days ?? [],
    shiftStart: data.shift_start,
    shiftEnd: data.shift_end,
    isActive: data.is_active,
    isAvailable: availability?.is_available ?? false,
    email: auth.auth.email,
  })
}
