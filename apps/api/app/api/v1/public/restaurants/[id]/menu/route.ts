import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/public/restaurants/[id]/menu
 * Despues de la unificacion business+restaurant, hay UNA sola fuente:
 * `restaurants` con `menu_*`. El parametro `catalog` queda como no-op
 * para back-compat con clientes viejos.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return problemCode('VALIDATION_ERROR', 400, 'id invalido')

  const sb = createAdminClient()

  const { data: restaurant, error: restaurantError } = await sb
    .from('restaurants')
    .select(
      'id, name, phone, address, description, accent_color, is_active, is_marketplace_published, is_delivery_enabled, coordinates_lat, coordinates_lng',
    )
    .eq('id', id)
    .eq('is_active', true)
    .eq('is_marketplace_published', true)
    .maybeSingle()

  if (restaurantError) return problemCode('INTERNAL_ERROR', 500, restaurantError.message)
  if (!restaurant) return problemCode('RESTAURANT_NOT_FOUND', 404)

  const { data: categories, error: categoriesError } = await sb
    .from('menu_categories')
    .select('id, name, description, sort_order')
    .eq('restaurant_id', id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (categoriesError) return problemCode('INTERNAL_ERROR', 500, categoriesError.message)

  const { data: items, error: itemsError } = await sb
    .from('menu_items')
    .select('id, category_id, name, description, price, image_url, prep_minutes, is_featured')
    .eq('restaurant_id', id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (itemsError) return problemCode('INTERNAL_ERROR', 500, itemsError.message)

  const itemIds = (items ?? []).map((item) => item.id)
  const { data: groups } =
    itemIds.length > 0
      ? await sb
          .from('menu_modifier_groups')
          .select('id, menu_item_id, name, min_selected, max_selected, sort_order')
          .in('menu_item_id', itemIds)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      : { data: [] }

  const groupIds = (groups ?? []).map((group) => group.id)
  const { data: options } =
    groupIds.length > 0
      ? await sb
          .from('menu_modifier_options')
          .select('id, group_id, name, price_delta, is_available')
          .in('group_id', groupIds)
          .eq('is_available', true)
          .order('sort_order', { ascending: true })
      : { data: [] }

  type OptionDto = { id: string; name: string; priceDelta: number; isAvailable: boolean }
  type GroupDto = {
    id: string
    name: string
    minSelected: number
    maxSelected: number
    options: OptionDto[]
  }
  type ItemDto = {
    id: string
    categoryId: string | null
    name: string
    description: string | null
    price: number
    imageUrl: string | null
    prepMinutes: number | null
    isFeatured: boolean
    modifierGroups: GroupDto[]
  }

  const optionsByGroup = new Map<string, OptionDto[]>()
  for (const option of options ?? []) {
    const list = optionsByGroup.get(option.group_id) ?? []
    list.push({
      id: option.id,
      name: option.name,
      priceDelta: Number(option.price_delta),
      isAvailable: option.is_available,
    })
    optionsByGroup.set(option.group_id, list)
  }

  const groupsByItem = new Map<string, GroupDto[]>()
  for (const group of groups ?? []) {
    const list = groupsByItem.get(group.menu_item_id) ?? []
    list.push({
      id: group.id,
      name: group.name,
      minSelected: group.min_selected,
      maxSelected: group.max_selected,
      options: optionsByGroup.get(group.id) ?? [],
    })
    groupsByItem.set(group.menu_item_id, list)
  }

  const itemsByCategory = new Map<string, ItemDto[]>()
  const uncategorized: ItemDto[] = []
  for (const item of items ?? []) {
    const mapped: ItemDto = {
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.image_url,
      prepMinutes: item.prep_minutes,
      isFeatured: item.is_featured,
      modifierGroups: groupsByItem.get(item.id) ?? [],
    }
    if (item.category_id) {
      const list = itemsByCategory.get(item.category_id) ?? []
      list.push(mapped)
      itemsByCategory.set(item.category_id, list)
    } else {
      uncategorized.push(mapped)
    }
  }

  const mappedCategories = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    items: itemsByCategory.get(category.id) ?? [],
  }))
  if (uncategorized.length > 0) {
    mappedCategories.push({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Otros',
      description: null,
      items: uncategorized,
    })
  }

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone,
      address: restaurant.address,
      description: restaurant.description,
      accentColor: restaurant.accent_color,
      coordinates:
        typeof restaurant.coordinates_lat === 'number' &&
        typeof restaurant.coordinates_lng === 'number'
          ? { lat: restaurant.coordinates_lat, lng: restaurant.coordinates_lng }
          : null,
      isOpen: restaurant.is_active,
      isBlocked: false,
      catalogType: restaurant.is_delivery_enabled ? ('delivery' as const) : ('business' as const),
      deliveryEnabled: restaurant.is_delivery_enabled,
      categories: mappedCategories.map((category) => category.name),
      featuredItemNames: (items ?? [])
        .filter((item) => item.is_featured)
        .map((item) => item.name)
        .slice(0, 3),
    },
    categories: mappedCategories,
  })
}
