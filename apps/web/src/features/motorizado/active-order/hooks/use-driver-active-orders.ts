'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'

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

export function useDriverActiveOrders() {
  const qc = useQueryClient()
  const { data: uid } = useCurrentUserId()

  const query = useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => orders.listDriverOrders(),
    refetchInterval: 60_000,
  })

  useRealtimeChannel({
    channelName: `driver:events:${uid ?? 'pending'}`,
    changes: [{ event: 'UPDATE', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
    enabled: Boolean(uid),
  })

  return query
}
