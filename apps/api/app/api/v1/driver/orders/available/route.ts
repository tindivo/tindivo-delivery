import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/orders/available
 *
 * Devuelve pedidos `waiting_driver` (sin driver) de los restaurantes que el
 * driver autenticado puede atender (`driver_restaurants`). Los pedidos
 * urgentes (post-timeout o post-rechazo, `urgent_since != null`) van
 * primero, ordenados FIFO por `urgent_since`. Los no-urgentes siguen,
 * ordenados por `estimated_ready_at` ascendente.
 *
 * El frontend recibe `urgent_since` y muestra badge "Urgente" rojo + glow
 * en los pedidos con valor; el botón cambia de "Aceptar" a "Tomar pedido"
 * y llama a `POST /driver/orders/:id/claim` (FCFS sin reglas R1-R5).
 *
 * Pedidos urgentes incluyen incluso aquellos rechazados previamente por
 * este mismo driver (decisión de producto: cola FCFS pura, sin filtro de
 * exclusión por rejection histórico — evita huérfanos cuando hay 1-2
 * drivers del restaurante).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  // Admin client para leer driver_restaurants (RLS lo permite al mismo driver,
  // pero usar admin evita un round-trip de evaluación de policy y simplifica).
  const admin = createAdminClient()

  const { data: drRows, error: drError } = await admin
    .from('driver_restaurants')
    .select('restaurant_id')
    .eq('driver_id', auth.auth.driverId)
  if (drError) return problemCode('INTERNAL_ERROR', 500, drError.message)

  const restaurantIds = (drRows ?? []).map((r) => r.restaurant_id)
  if (restaurantIds.length === 0) return NextResponse.json({ items: [] })

  // Orden compuesto: urgentes primero (urgent_since asc, nulls al final),
  // dentro de los no-urgentes por estimated_ready_at asc.
  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      '*, restaurants!inner(name, accent_color, address, phone, yape_number, qr_url, qr_url_secondary, coordinates_lat, coordinates_lng)',
    )
    .eq('status', 'waiting_driver')
    .is('driver_id', null)
    .in('restaurant_id', restaurantIds)
    .order('urgent_since', { ascending: true, nullsFirst: false })
    .order('estimated_ready_at', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
