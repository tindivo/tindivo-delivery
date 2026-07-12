'use client'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useChannelHealth } from '@/lib/supabase/use-realtime-channel'
import { useQuery } from '@tanstack/react-query'

export function useOrderDetail(orderId: string) {
  const { data: uid } = useQuery({
    queryKey: ['me', 'user-id'],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
  })

  const channelName = `driver:events:${uid ?? 'pending'}`
  const health = useChannelHealth(channelName)

  return useQuery({
    queryKey: ['driver', 'orders', orderId],
    queryFn: async () => {
      const list = await orders.listDriverOrders()
      // biome-ignore lint/suspicious/noExplicitAny: items dinámicos del backend
      return list.items?.find((o: any) => o.id === orderId) ?? null
    },
    refetchInterval: health === 'degraded' ? 15_000 : 60_000,
  })
}
