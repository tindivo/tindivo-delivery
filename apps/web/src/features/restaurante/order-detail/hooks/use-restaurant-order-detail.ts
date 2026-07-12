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

  const { health } = useRealtimeChannel({
    channelName: `restaurant:order:${orderId}`,
    changes: [{ event: 'UPDATE', table: 'orders', filter: `id=eq.${orderId}` }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
    },
    enabled: Boolean(orderId),
  })

  const query = useQuery({
    queryKey: ['restaurant', 'order', orderId],
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    queryFn: () => orders.getRestaurantOrder(orderId) as Promise<any>,
    refetchInterval: health === 'degraded' ? 30_000 : 90_000,
  })

  return query
}
