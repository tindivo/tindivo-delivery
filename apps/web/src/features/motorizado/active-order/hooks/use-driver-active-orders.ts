'use client'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

function useCurrentUserId() {
  return useQuery({
    queryKey: ['me', 'user-id'],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
  })
}

/**
 * Hook de datos puro — solo lee `driver/orders`. Se puede llamar en múltiples
 * componentes sin conflicto (TanStack Query dedupe por queryKey).
 *
 * Para mantener los datos actualizados en tiempo real, montar
 * `useDriverActiveOrdersRealtime` UNA vez en el nivel superior (HomeTabs).
 */
export function useDriverActiveOrders() {
  return useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => orders.listDriverOrders(),
    refetchInterval: 60_000,
  })
}

/**
 * Sync de realtime para `driver:events:{uid}`. Debe montarse UNA SOLA VEZ en
 * el árbol (p.ej. HomeTabs) — si dos componentes lo montan simultáneamente
 * chocan en el mismo channel name y supabase-js rechaza el segundo `.on()`.
 */
export function useDriverActiveOrdersRealtime() {
  const qc = useQueryClient()
  const { data: uid } = useCurrentUserId()

  useRealtimeChannel({
    channelName: `driver:events:${uid ?? 'pending'}`,
    changes: [{ event: 'UPDATE', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
    enabled: Boolean(uid),
  })
}
