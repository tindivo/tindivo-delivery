'use client'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Lista pedidos activos de OTROS drivers en restaurantes que el driver
 * autenticado atiende. Se actualiza en vivo via Realtime sobre `orders`
 * (cualquier UPDATE invalida el cache).
 *
 * Polling cada 30s como fallback por si Realtime se desconecta.
 */
export function useTeamOrders() {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'driver:team-orders',
    changes: [{ event: 'UPDATE', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'orders'] })
    },
  })

  // También suscribirse a transfer_requests porque cambios ahí afectan el flag
  // hasPendingRequest de las cards (driver acepta/rechaza/expira → la card
  // vuelve a mostrar botón "Solicitar" en vez de "Esperando respuesta").
  useRealtimeChannel({
    channelName: 'driver:team-orders-transfers',
    changes: [{ event: '*', table: 'order_transfer_requests' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'orders'] })
    },
  })

  const query = useQuery({
    queryKey: ['driver', 'team', 'orders'],
    queryFn: () => orders.listTeamOrders(),
    refetchInterval: health === 'degraded' ? 30_000 : 90_000,
  })

  return query
}
