'use client'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Detalle del pedido visto desde el restaurante.
 *
 * Refresca con realtime: suscribe a `orders` filtrado por `id` para
 * mostrar transiciones de estado en vivo (driver acepta, llega, entrega).
 */
export function useRestaurantOrderDetail(orderId: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['restaurant', 'order', orderId],
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    queryFn: () => orders.getRestaurantOrder(orderId) as Promise<any>,
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: `restaurant:order:${orderId}`,
    changes: [{ event: 'UPDATE', table: 'orders', filter: `id=eq.${orderId}` }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
    },
    enabled: Boolean(orderId),
  })

  return query
}
