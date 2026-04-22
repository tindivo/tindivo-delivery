'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { restaurant } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'

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
 * Lista las liquidaciones de efectivo (delivered/confirmed/disputed/resolved)
 * del restaurante autenticado, con realtime sobre cambios del driver.
 * HU-R-025.
 */
export function useRestaurantCashSettlements() {
  const qc = useQueryClient()
  const { data: restaurantId } = useMyRestaurantId()

  const query = useQuery({
    queryKey: ['restaurant', 'cash-settlements'],
    queryFn: () => restaurant.listCashSettlements(),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: `restaurant:${restaurantId ?? 'pending'}:cash-settlements`,
    changes: [
      {
        event: '*',
        table: 'cash_settlements',
        filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined,
      },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'cash-settlements'] })
    },
    enabled: Boolean(restaurantId),
  })

  return query
}

export function useConfirmCashSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, receivedAmount }: { id: string; receivedAmount: number }) =>
      restaurant.confirmCashSettlement(id, { receivedAmount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant', 'cash-settlements'] }),
  })
}

export function useDisputeCashSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reportedAmount, note }: { id: string; reportedAmount: number; note: string }) =>
      restaurant.disputeCashSettlement(id, { reportedAmount, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant', 'cash-settlements'] }),
  })
}
