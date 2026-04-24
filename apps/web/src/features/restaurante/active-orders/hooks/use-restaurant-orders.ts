'use client'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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

export function useRestaurantOrders() {
  const qc = useQueryClient()
  const { data: restaurantId } = useMyRestaurantId()

  const query = useQuery({
    queryKey: ['restaurant', 'orders'],
    queryFn: () => orders.listRestaurantOrders(),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: `restaurant:${restaurantId ?? 'pending'}:orders`,
    changes: [
      {
        event: '*',
        table: 'orders',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
      },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] })
    },
    enabled: Boolean(restaurantId),
  })

  return query
}
