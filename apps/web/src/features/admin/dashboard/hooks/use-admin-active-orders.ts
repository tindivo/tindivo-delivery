'use client'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type OrderLike = { status: string }
type OrdersListResponse = { items?: OrderLike[] }

export function useAdminActiveOrders() {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'admin:orders',
    changes: [{ event: '*', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })

  const query = useQuery({
    queryKey: ['admin', 'orders', 'active'],
    queryFn: async () => {
      const all = (await orders.listAdminOrders()) as OrdersListResponse
      const active = (all.items ?? []).filter(
        (o) => o.status !== 'delivered' && o.status !== 'cancelled',
      )
      return { items: active }
    },
    refetchInterval: health === 'degraded' ? 15_000 : 30_000,
  })

  return query
}
