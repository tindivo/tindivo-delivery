import { Restaurants } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/restaurants/[id]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('RESTAURANT_NOT_FOUND', 404)

  return NextResponse.json(data)
}

/**
 * PATCH /api/v1/admin/restaurants/[id]
 * Edita campos del restaurante (HU-A-022).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, Restaurants.UpdateRestaurantRequest)
  if (!body.ok) return body.response

  const input = body.data
  const patch: {
    updated_at: string
    name?: string
    phone?: string
    address?: string
    yape_number?: string | null
    qr_url?: string | null
    accent_color?: string
  } = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) patch.name = input.name
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.address !== undefined) patch.address = input.address
  if (input.yapeNumber !== undefined) patch.yape_number = input.yapeNumber ?? null
  if (input.qrUrl !== undefined) patch.qr_url = input.qrUrl ?? null
  if (input.accentColor !== undefined) patch.accent_color = input.accentColor

  // Si se cambia el color, validar que no choque
  if (input.accentColor) {
    const { data: conflict } = await auth.auth.supabase
      .from('restaurants')
      .select('id, name')
      .eq('accent_color', input.accentColor)
      .neq('id', id)
      .maybeSingle()
    if (conflict) {
      return problemCode('ACCENT_COLOR_TAKEN', 409, `El color ya lo usa "${conflict.name}"`)
    }
  }

  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('RESTAURANT_NOT_FOUND', 404)

  return NextResponse.json(data)
}
