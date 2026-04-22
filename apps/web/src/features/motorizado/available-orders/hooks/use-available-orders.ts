'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'

export function useAvailableOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'available-orders'],
    queryFn: () => orders.listAvailable(),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: 'driver:available-orders',
    changes: [{ event: '*', table: 'orders', filter: 'status=eq.waiting_driver' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
    },
  })

  return query
}
