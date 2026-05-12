import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = createAdminClient() as any

  const { data: restaurants, error } = await sb
    .from('restaurants')
    .select('id, name, phone, address, accent_color, is_active, coordinates_lat, coordinates_lng')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const { data: businesses, error: businessError } = await sb
    .from('marketplace_businesses')
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_published, delivery_restaurant_id',
    )
    .eq('is_active', true)
    .eq('is_published', true)
    .order('name', { ascending: true })

  if (businessError) return problemCode('INTERNAL_ERROR', 500, businessError.message)

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

  const businessIds = (businesses ?? []).map((b: any) => b.id)
  const { data: businessCategories } =
    businessIds.length > 0
      ? await sb
          .from('marketplace_menu_categories')
          .select('business_id, name')
          .in('business_id', businessIds)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      : { data: [] }
  const { data: businessFeatured } =
    businessIds.length > 0
      ? await sb
          .from('marketplace_menu_items')
          .select('business_id, name')
          .in('business_id', businessIds)
          .eq('is_available', true)
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
      : { data: [] }

  const categoriesByBusiness = new Map<string, string[]>()
  for (const row of businessCategories ?? []) {
    const list = categoriesByBusiness.get(row.business_id) ?? []
    if (!list.includes(row.name)) list.push(row.name)
    categoriesByBusiness.set(row.business_id, list)
  }

  const featuredByBusiness = new Map<string, string[]>()
  for (const row of businessFeatured ?? []) {
    const list = featuredByBusiness.get(row.business_id) ?? []
    if (list.length < 3) list.push(row.name)
    featuredByBusiness.set(row.business_id, list)
  }

  return NextResponse.json({
    items: [
      ...(businesses ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        address: b.address,
        description: b.description,
        accentColor: b.accent_color,
        coordinates: null,
        isOpen: b.is_active && b.is_published,
        isBlocked: false,
        catalogType: 'business' as const,
        deliveryEnabled: b.delivery_restaurant_id !== null,
        categories: categoriesByBusiness.get(b.id) ?? [],
        featuredItemNames: featuredByBusiness.get(b.id) ?? [],
      })),
      ...(restaurants ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        address: r.address,
        description: null,
        accentColor: r.accent_color,
        coordinates:
          typeof r.coordinates_lat === 'number' && typeof r.coordinates_lng === 'number'
            ? { lat: r.coordinates_lat, lng: r.coordinates_lng }
            : null,
        isOpen: r.is_active,
        isBlocked: false,
        catalogType: 'delivery' as const,
        deliveryEnabled: true,
        categories: categoriesByRestaurant.get(r.id) ?? [],
        featuredItemNames: featuredByRestaurant.get(r.id) ?? [],
      })),
    ],
  })
}
