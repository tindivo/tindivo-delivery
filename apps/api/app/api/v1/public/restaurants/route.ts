import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = createAdminClient() as any

  const { data: restaurants, error } = await sb
    .from('restaurants')
    .select(
      'id, name, phone, address, accent_color, is_active, is_blocked, coordinates_lat, coordinates_lng',
    )
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const restaurantIds = (restaurants ?? []).map((r: any) => r.id)
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
    items: (restaurants ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      accentColor: r.accent_color,
      coordinates:
        typeof r.coordinates_lat === 'number' && typeof r.coordinates_lng === 'number'
          ? { lat: r.coordinates_lat, lng: r.coordinates_lng }
          : null,
      isOpen: r.is_active && !r.is_blocked,
      isBlocked: r.is_blocked,
      categories: categoriesByRestaurant.get(r.id) ?? [],
      featuredItemNames: featuredByRestaurant.get(r.id) ?? [],
    })),
  })
}
