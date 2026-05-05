'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Lee los items + modificadores de un pedido `customer_pwa`. Para
 * `restaurant_pwa` el endpoint devuelve lista vacía (el restaurante creó
 * el pedido manualmente y no hay desglose por items).
 */
export function useOrderItems(orderId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['restaurant', 'order-items', orderId] as const,
    queryFn: () => restaurant.getOrderItems(orderId as string),
    enabled: Boolean(orderId) && enabled,
    staleTime: 30_000,
  })
}
