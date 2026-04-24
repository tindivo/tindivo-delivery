'use client'
import { orders } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ['driver', 'orders', orderId],
    queryFn: async () => {
      const list = await orders.listDriverOrders()
      // biome-ignore lint/suspicious/noExplicitAny: items dinámicos del backend
      return list.items?.find((o: any) => o.id === orderId)
    },
    refetchInterval: 15_000,
  })
}
