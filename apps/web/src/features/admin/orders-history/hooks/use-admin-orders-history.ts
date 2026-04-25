'use client'
import { orders } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

type OrderLike = { status: string }
type OrdersListResponse = { items?: OrderLike[] }

/**
 * Pedidos pasados (delivered + cancelled). Usa el endpoint general
 * /admin/orders y filtra en cliente para no romper la firma del backend.
 * Sin realtime porque son terminales — refetch a demanda + cada minuto.
 */
export function useAdminOrdersHistory() {
  return useQuery({
    queryKey: ['admin', 'orders', 'history'],
    queryFn: async () => {
      const all = (await orders.listAdminOrders()) as OrdersListResponse
      const past = (all.items ?? []).filter(
        (o) => o.status === 'delivered' || o.status === 'cancelled',
      )
      return { items: past }
    },
    refetchInterval: 60_000,
  })
}
