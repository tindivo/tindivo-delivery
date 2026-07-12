'use client'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useAvailableOrders() {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'driver:available-orders',
    changes: [{ event: '*', table: 'orders', filter: 'status=eq.waiting_driver' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
    },
  })

  const query = useQuery({
    queryKey: ['driver', 'available-orders'],
    queryFn: () => orders.listAvailable(),
    refetchInterval: health === 'healthy' ? 90_000 : 20_000,
  })

  return query
}
