'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'

export function useAdminOrderDetail(orderId: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'orders', orderId],
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    queryFn: () => orders.getAdminOrder(orderId) as Promise<any>,
    refetchInterval: 10_000,
  })

  useRealtimeChannel({
    channelName: `admin:order:${orderId}`,
    changes: [{ event: 'UPDATE', table: 'orders', filter: `id=eq.${orderId}` }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders', orderId] })
    },
    enabled: Boolean(orderId),
  })

  return query
}
