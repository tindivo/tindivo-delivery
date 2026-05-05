'use client'
import { restaurant } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const QK = ['restaurant', 'pending-acceptance'] as const

function useMyRestaurantId() {
  return useQuery({
    queryKey: ['me', 'restaurant-id'],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', userData.user.id)
        .maybeSingle()
      return data?.id ?? null
    },
  })
}

/**
 * Lista de pedidos en estado pending_acceptance del restaurante autenticado.
 * Realtime: subscribe a cambios de orders del restaurante. Refetch cada 5s
 * porque el countdown de 5min necesita actualizar la UI con los timestamps.
 */
export function usePendingAcceptanceOrders() {
  const qc = useQueryClient()
  const { data: restaurantId } = useMyRestaurantId()

  const query = useQuery({
    queryKey: QK,
    queryFn: () => restaurant.listPendingAcceptance(),
    refetchInterval: 5_000,
  })

  useRealtimeChannel({
    channelName: `restaurant:${restaurantId ?? 'pending'}:pending-acceptance`,
    changes: [
      {
        event: '*',
        table: 'orders',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
      },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] })
    },
    enabled: Boolean(restaurantId),
  })

  return query
}
