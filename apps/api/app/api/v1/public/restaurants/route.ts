import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/public/restaurants
 * Listado publico del marketplace de tindivo.com. Despues de la unificacion
 * business+restaurant, todos los locales viven en `restaurants` con dos flags:
 *   - is_marketplace_published: aparece publicamente
 *   - is_delivery_enabled: recibe pedidos delivery (sino, solo catalogo + WhatsApp)
 */
export async function GET() {
  const sb = createAdminClient()

  const { data: restaurants, error } = await sb
    .from('restaurants')
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_marketplace_published, is_delivery_enabled, coordinates_lat, coordinates_lng',
    )
    .eq('is_active', true)
    .eq('is_marketplace_published', true)
    .order('name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const restaurantIds = (restaurants ?? []).map((r) => r.id)
  const { data: categories } =
    restaurantIds.length > 0
      ? await sb
          .from('menu_categories')
          .select('restaurant_id, name')
          .in('restaurant_id', restaurantIds)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      : { data: [] }
  const { data: featured } =
    restaurantIds.length > 0
      ? await sb
          .from('menu_items')
          .select('restaurant_id, name')
          .in('restaurant_id', restaurantIds)
          .eq('is_available', true)
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
      : { data: [] }

  const categoriesByRestaurant = new Map<string, string[]>()
  for (const row of categories ?? []) {
    const list = categoriesByRestaurant.get(row.restaurant_id) ?? []
    if (!list.includes(row.name)) list.push(row.name)
    categoriesByRestaurant.set(row.restaurant_id, list)
  }

  const featuredByRestaurant = new Map<string, string[]>()
  for (const row of featured ?? []) {
    const list = featuredByRestaurant.get(row.restaurant_id) ?? []
    if (list.length < 3) list.push(row.name)
    featuredByRestaurant.set(row.restaurant_id, list)
  }

  return NextResponse.json({
    items: (restaurants ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      description: r.description,
      accentColor: r.accent_color,
      coordinates:
        typeof r.coordinates_lat === 'number' && typeof r.coordinates_lng === 'number'
          ? { lat: r.coordinates_lat, lng: r.coordinates_lng }
          : null,
      isOpen: r.is_active,
      isBlocked: false,
      catalogType: r.is_delivery_enabled ? ('delivery' as const) : ('business' as const),
      deliveryEnabled: r.is_delivery_enabled,
      categories: categoriesByRestaurant.get(r.id) ?? [],
      featuredItemNames: featuredByRestaurant.get(r.id) ?? [],
    })),
  })
}
