'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'

type OrderLike = { status: string }
type OrdersListResponse = { items?: OrderLike[] }

export function useAdminActiveOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'orders', 'active'],
    queryFn: async () => {
      const all = (await orders.listAdminOrders()) as OrdersListResponse
      const active = (all.items ?? []).filter(
        (o) => o.status !== 'delivered' && o.status !== 'cancelled',
      )
      return { items: active }
    },
    refetchInterval: 15_000,
  })

  useRealtimeChannel({
    channelName: 'admin:orders',
    changes: [{ event: '*', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })

  return query
}
