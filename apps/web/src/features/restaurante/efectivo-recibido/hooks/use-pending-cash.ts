'use client'
import { restaurant } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

function useMyRestaurantId() {
  return useQuery({
    queryKey: ['me', 'restaurant-id'],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return null
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle()
      return data?.id ?? null
    },
  })
}

/**
 * Lista pedidos en efectivo del restaurante que el driver aún no entregó
 * (status=delivered + payment_status=pending_cash + cash_settlement_id null),
 * agrupados por motorizado. Se actualiza con realtime sobre `orders` para
 * que cuando un pedido se marque entregado o el driver lo liquide
 * (cash_settlement_id pasa a no-null), la lista se refresque.
 */
export function useRestaurantPendingCash() {
  const qc = useQueryClient()
  const { data: restaurantId } = useMyRestaurantId()

  const query = useQuery({
    queryKey: ['restaurant', 'cash-pending'],
    queryFn: () => restaurant.listPendingCash(),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: `restaurant:${restaurantId ?? 'pending'}:cash-pending`,
    changes: [
      {
        event: '*',
        table: 'orders',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
      },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'cash-pending'] })
    },
    enabled: Boolean(restaurantId),
  })

  return query
}
