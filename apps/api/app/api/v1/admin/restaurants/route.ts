import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Restaurants } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/restaurants
 * Lista todos los restaurantes para el admin (con filtro opcional por estado).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .select('*')
    .order('name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}

/**
 * POST /api/v1/admin/restaurants
 * Crea un restaurante nuevo: genera el usuario en auth.users, perfil en
 * public.users y entidad en public.restaurants. HU-A-020.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Restaurants.CreateRestaurantRequest)
  if (!body.ok) return body.response

  const admin = createAdminClient()
  const input = body.data

  // 1) Verificar color único (restricción de unicidad en DB, pero mensaje amable)
  const { data: existingColor } = await admin
    .from('restaurants')
    .select('name')
    .eq('accent_color', input.accentColor)
    .maybeSingle()

  if (existingColor) {
    return problemCode('ACCENT_COLOR_TAKEN', 409, `El color ya lo usa "${existingColor.name}"`)
  }

  // 2) Crear usuario en auth.users
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.ownerEmail,
    password: input.ownerPassword,
    email_confirm: true,
  })

  if (createErr || !created?.user) {
    return problemCode('VALIDATION_ERROR', 400, createErr?.message ?? 'No se pudo crear el usuario')
  }

  const userId = created.user.id

  // 3) Insertar perfil en public.users (rol restaurant)
  const { error: profileErr } = await admin.from('users').insert({
    id: userId,
    email: input.ownerEmail,
    role: 'restaurant',
    is_active: true,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId)
    return problemCode('INTERNAL_ERROR', 500, profileErr.message)
  }

  // 4) Insertar restaurant
  const { data: restaurant, error: restaurantErr } = await admin
    .from('restaurants')
    .insert({
      user_id: userId,
      name: input.name,
      phone: input.phone,
      address: input.address,
      yape_number: input.yapeNumber ?? null,
      qr_url: input.qrUrl ?? null,
      accent_color: input.accentColor,
      coordinates_lat: input.coordinates.lat,
      coordinates_lng: input.coordinates.lng,
      is_active: true,
      is_blocked: false,
    })
    .select('*')
    .single()

  if (restaurantErr || !restaurant) {
    await admin.auth.admin.deleteUser(userId)
    return problemCode(
      'INTERNAL_ERROR',
      500,
      restaurantErr?.message ?? 'No se pudo crear el restaurante',
    )
  }

  return NextResponse.json(restaurant, { status: 201 })
}
