'use client'
import { supabase } from '@/lib/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const BLACKLIST_PHONES = [
  '999999999',
  '987654321',
  '912345678',
  '955555555',
  '900000000',
  '911111111',
  '923456789',
]

/**
 * Agrega el restaurante más frecuente en los últimos 90 días para una lista de teléfonos.
 * Se ejecuta en una sola query por página de manera eficiente.
 */
async function fetchFavoriteRestaurants(phones: string[]): Promise<Record<string, string>> {
  if (phones.length === 0) return {}

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data, error } = await supabase
    .from('orders')
    .select('client_phone, customer_phone, restaurant_id, restaurants(name)')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .or(`client_phone.in.(${phones.join(',')}),customer_phone.in.(${phones.join(',')})`)

  if (error) {
    console.error('Error fetching favorite restaurants:', error)
    return {}
  }

  const counts: Record<string, Record<string, { count: number; name: string }>> = {}

  for (const row of data ?? []) {
    const phone = row.client_phone || row.customer_phone
    if (!phone) continue
    const restaurantId = row.restaurant_id
    const restaurantName = row.restaurants?.name
    if (!restaurantId || !restaurantName) continue

    if (!counts[phone]) {
      counts[phone] = {}
    }
    if (!counts[phone][restaurantId]) {
      counts[phone][restaurantId] = { count: 0, name: restaurantName }
    }
    counts[phone][restaurantId].count++
  }

  const result: Record<string, string> = {}
  for (const phone of Object.keys(counts)) {
    const phoneRecord = counts[phone]
    if (!phoneRecord) continue
    let bestName = ''
    let bestCount = -1
    for (const rid of Object.keys(phoneRecord)) {
      const item = phoneRecord[rid]
      if (!item) continue
      const { count, name } = item
      if (count > bestCount) {
        bestCount = count
        bestName = name
      }
    }
    result[phone] = bestName
  }

  return result
}

export function useAgendaStats() {
  return useQuery({
    queryKey: ['admin', 'agenda', 'stats'],
    queryFn: async () => {
      const { count: total, error: err1 } = await supabase
        .from('customer_addresses')
        .select('*', { count: 'exact', head: true })
        .not('phone', 'in', `(${BLACKLIST_PHONES.join(',')})`)

      if (err1) throw err1

      const { count: curated, error: err2 } = await (supabase as any)
        .from('customer_addresses_with_stats')
        .select('*', { count: 'exact', head: true })
        .not('phone', 'in', `(${BLACKLIST_PHONES.join(',')})`)
        .eq('is_fully_curated', true)

      if (err2) throw err2

      const totalVal = total ?? 0
      const curatedVal = curated ?? 0

      return {
        total: totalVal,
        curated: curatedVal,
        percentage: totalVal ? Math.round((curatedVal / totalVal) * 100) : 0,
      }
    },
  })
}

export function useAgendaVista1({
  page,
  search,
  onlySinPin,
  onlyRefCorta,
  onlySinNombre,
  minTimesUsed,
}: {
  page: number
  search: string
  onlySinPin: boolean
  onlyRefCorta: boolean
  onlySinNombre: boolean
  minTimesUsed: number
}) {
  return useQuery({
    queryKey: [
      'admin',
      'agenda',
      'vista1',
      { page, search, onlySinPin, onlyRefCorta, onlySinNombre, minTimesUsed },
    ],
    queryFn: async () => {
      const from = (page - 1) * 30
      const to = from + 29

      let q = (supabase as any)
        .from('customer_addresses_with_stats')
        .select('*', { count: 'exact' })
        .not('phone', 'in', `(${BLACKLIST_PHONES.join(',')})`)
        .eq('is_fully_curated', false)

      if (search.trim()) {
        const s = `%${search.trim()}%`
        q = q.or(`phone.ilike.${s},customer_name.ilike.${s}`)
      }
      if (onlySinPin) {
        q = q.eq('has_pin', false)
      }
      if (onlyRefCorta) {
        q = q.eq('has_valid_ref', false)
      }
      if (onlySinNombre) {
        q = q.eq('has_name', false)
      }
      if (minTimesUsed > 0) {
        q = q.gte('times_used', minTimesUsed)
      }

      const { data, count, error } = await q
        .order('times_used', { ascending: false })
        .range(from, to)

      if (error) throw error

      const phones = (data ?? []).map((row: any) => row.phone)
      const favoriteRestaurants = await fetchFavoriteRestaurants(phones)

      const items = (data ?? []).map((row: any) => ({
        ...row,
        favorite_restaurant: favoriteRestaurants[row.phone] || null,
      }))

      return {
        items,
        total: count ?? 0,
      }
    },
  })
}

export function useAgendaVista2({
  page,
  search,
  sources,
  minTimesUsed,
  hasPin,
  lastUsedStart,
  lastUsedEnd,
  minAccuracy,
  maxAccuracy,
}: {
  page: number
  search: string
  sources: string[]
  minTimesUsed: number
  hasPin: boolean | null
  lastUsedStart: string | null
  lastUsedEnd: string | null
  minAccuracy: number | null
  maxAccuracy: number | null
}) {
  return useQuery({
    queryKey: [
      'admin',
      'agenda',
      'vista2',
      {
        page,
        search,
        sources,
        minTimesUsed,
        hasPin,
        lastUsedStart,
        lastUsedEnd,
        minAccuracy,
        maxAccuracy,
      },
    ],
    queryFn: async () => {
      const from = (page - 1) * 50
      const to = from + 49

      let q = (supabase as any)
        .from('customer_addresses_with_stats')
        .select('*', { count: 'exact' })

      if (search.trim()) {
        const s = `%${search.trim()}%`
        q = q.or(`phone.ilike.${s},reference.ilike.${s},customer_name.ilike.${s}`)
      }
      if (sources.length > 0) {
        q = q.in('source', sources)
      }
      if (minTimesUsed > 0) {
        q = q.gte('times_used', minTimesUsed)
      }
      if (hasPin !== null) {
        q = q.eq('has_pin', hasPin)
      }
      if (lastUsedStart) {
        q = q.gte('last_used_at', lastUsedStart)
      }
      if (lastUsedEnd) {
        q = q.lte('last_used_at', lastUsedEnd)
      }
      if (minAccuracy !== null) {
        q = q.gte('accuracy_m', minAccuracy)
      }
      if (maxAccuracy !== null) {
        q = q.lte('accuracy_m', maxAccuracy)
      }

      const { data, count, error } = await q
        .order('times_used', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        items: data ?? [],
        total: count ?? 0,
      }
    },
  })
}

export function useAgendaVista3({
  page,
  actions,
  phone,
  startDate,
  endDate,
  driverId,
}: {
  page: number
  actions: string[]
  phone: string
  startDate: string | null
  endDate: string | null
  driverId: string
}) {
  return useQuery({
    queryKey: ['admin', 'agenda', 'vista3', { page, actions, phone, startDate, endDate, driverId }],
    queryFn: async () => {
      const from = (page - 1) * 50
      const to = from + 49

      let q = supabase.from('address_capture_events').select('*', { count: 'exact' })

      if (actions.length > 0) {
        q = q.in('action', actions)
      }
      if (phone.trim()) {
        q = q.ilike('phone', `%${phone.trim()}%`)
      }
      if (driverId && driverId !== 'all') {
        q = q.eq('driver_id', driverId)
      }
      if (startDate) {
        q = q.gte('created_at', startDate)
      }
      if (endDate) {
        q = q.lte('created_at', endDate)
      }

      const { data, count, error } = await q
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        items: data ?? [],
        total: count ?? 0,
      }
    },
  })
}

export function useDriversList() {
  return useQuery({
    queryKey: ['admin', 'drivers-list-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, full_name')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

export function useCurateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      addressId,
      phone,
      lat,
      lng,
      reference,
      customerName,
      prevLat,
      prevLng,
      previousSource,
      previousTimesUsed,
      curationSession,
    }: {
      addressId: string
      phone: string
      lat: number
      lng: number
      reference: string
      customerName: string
      prevLat: number | null
      prevLng: number | null
      previousSource: string
      previousTimesUsed: number
      curationSession: string
    }) => {
      const didCoordsChange = prevLat !== lat || prevLng !== lng

      // Construir payload
      // biome-ignore lint/suspicious/noExplicitAny: columnas dinámicas para update
      const payload: any = {
        customer_name: customerName,
        reference: reference,
      }

      const fieldsUpdated = ['customer_name', 'reference']

      if (didCoordsChange) {
        payload.lat = lat
        payload.lng = lng
        payload.source = 'admin_curated'
        payload.accuracy_m = null
        fieldsUpdated.push('lat', 'lng')
      }

      // 1. Guardar cambios en la DB
      const { error: updateErr } = await supabase
        .from('customer_addresses')
        .update(payload)
        .eq('address_id', addressId)

      if (updateErr) throw updateErr

      // 2. Insertar evento de auditoría
      const { error: eventErr } = await supabase.from('address_capture_events').insert({
        phone,
        action: 'admin_captured',
        metadata: {
          previous_source: previousSource,
          previous_pedidos: previousTimesUsed,
          fields_updated: fieldsUpdated,
          curation_session: curationSession,
        },
      })

      if (eventErr) throw eventErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'agenda', 'stats'] })
      // No invalidamos vista1 inmediatamente si el componente maneja auto-avance para evitar parpadeos
    },
  })
}

export function useEditAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      addressId,
      phone,
      lat,
      lng,
      reference,
      customerName,
      prevAddress,
    }: {
      addressId: string
      phone: string
      lat: number
      lng: number
      reference: string
      customerName: string
      // biome-ignore lint/suspicious/noExplicitAny: prevAddress original DB record
      prevAddress: any
    }) => {
      const didCoordsChange = prevAddress.lat !== lat || prevAddress.lng !== lng

      // biome-ignore lint/suspicious/noExplicitAny: columnas dinámicas para update
      const payload: any = {
        customer_name: customerName,
        reference: reference,
      }

      const fieldsChanged = []
      if (prevAddress.customer_name !== customerName) fieldsChanged.push('customer_name')
      if (prevAddress.reference !== reference) fieldsChanged.push('reference')

      if (didCoordsChange) {
        payload.lat = lat
        payload.lng = lng
        payload.source = 'admin_curated'
        payload.accuracy_m = null
        fieldsChanged.push('lat', 'lng')
      }

      const { error: updateErr } = await supabase
        .from('customer_addresses')
        .update(payload)
        .eq('address_id', addressId)

      if (updateErr) throw updateErr

      const { error: eventErr } = await supabase.from('address_capture_events').insert({
        phone,
        action: 'admin_edited',
        metadata: {
          fields_changed: fieldsChanged,
          old_values: {
            lat: prevAddress.lat,
            lng: prevAddress.lng,
            reference: prevAddress.reference,
            customer_name: prevAddress.customer_name,
          },
          new_values: {
            lat,
            lng,
            reference,
            customer_name: customerName,
          },
        },
      })

      if (eventErr) throw eventErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'agenda'] })
    },
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      addressId,
      phone,
      addressData,
    }: {
      addressId: string
      phone: string
      // biome-ignore lint/suspicious/noExplicitAny: addressData original DB record
      addressData: any
    }) => {
      const { error: deleteErr } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('address_id', addressId)

      if (deleteErr) throw deleteErr

      const { error: eventErr } = await supabase.from('address_capture_events').insert({
        phone,
        action: 'admin_edited',
        metadata: {
          deleted: true,
          deleted_data: addressData,
        },
      })

      if (eventErr) throw eventErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'agenda'] })
    },
  })
}

export function useSetDefaultAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase.rpc('set_customer_address_default', {
        p_address_id: addressId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'agenda'] })
    },
  })
}
