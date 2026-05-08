'use client'
import { orders } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Lista compañeros del restaurante con espacio en mochila para transferencia.
 * Solo se monta cuando el sheet de transferencia está abierto (`enabled`),
 * para evitar polling innecesario en cada render del active-order-detail.
 */
export function useDriverPeers(restaurantId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['driver', 'peers', restaurantId],
    queryFn: () => orders.listPeers(restaurantId ?? ''),
    enabled: enabled && !!restaurantId,
    staleTime: 30_000,
  })
}
