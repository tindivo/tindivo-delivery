import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Drivers } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/drivers
 * Lista todos los motorizados con su email y disponibilidad actual.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('drivers')
    .select('*, users(email), driver_availability(is_available)')
    .order('full_name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}

/**
 * POST /api/v1/admin/drivers
 * Crea un motorizado: genera auth.users, perfil en public.users (rol driver)
 * y entidad en public.drivers. El trigger `trg_drivers_ensure_availability`
 * crea automáticamente la fila en public.driver_availability con
 * is_available=false, así que no hay que insertarla desde aquí.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Drivers.CreateDriverRequest)
  if (!body.ok) return body.response

  const admin = createAdminClient()
  const input = body.data

  // 1) Crear usuario en auth.users
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.userEmail,
    password: input.userPassword,
    email_confirm: true,
  })

  if (createErr || !created?.user) {
    return problemCode('VALIDATION_ERROR', 400, createErr?.message ?? 'No se pudo crear el usuario')
  }

  const userId = created.user.id

  // 2) Insertar perfil en public.users
  const { error: profileErr } = await admin.from('users').insert({
    id: userId,
    email: input.userEmail,
    role: 'driver',
    is_active: true,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId)
    return problemCode('INTERNAL_ERROR', 500, profileErr.message)
  }

  // 3) Insertar driver
  const { data: driver, error: driverErr } = await admin
    .from('drivers')
    .insert({
      user_id: userId,
      full_name: input.fullName,
      phone: input.phone,
      vehicle_type: input.vehicleType,
      license_plate: input.licensePlate ?? null,
      operating_days: input.operatingDays,
      shift_start: input.shiftStart,
      shift_end: input.shiftEnd,
      is_active: true,
    })
    .select('*')
    .single()

  if (driverErr || !driver) {
    await admin.auth.admin.deleteUser(userId)
    return problemCode(
      'INTERNAL_ERROR',
      500,
      driverErr?.message ?? 'No se pudo crear el motorizado',
    )
  }

  return NextResponse.json(driver, { status: 201 })
}
