'use client'
import { useQuery } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ['driver', 'orders', orderId],
    queryFn: async () => {
      const list = await orders.listDriverOrders()
      return list.items?.find((o: any) => o.id === orderId)
    },
    refetchInterval: 15_000,
  })
}
