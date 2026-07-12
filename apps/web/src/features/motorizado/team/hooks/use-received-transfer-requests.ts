'use client'
import { orders } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Solicitudes pendientes RECIBIDAS por el driver autenticado (otros drivers
 * le están pidiendo sus pedidos). Cada una tiene 30s para responder.
 *
 * Realtime: invalida cuando hay cambios en `order_transfer_requests` (INSERT
 * de una nueva, UPDATE a accepted/rejected, o cron expire).
 *
 * Polling adaptativo: 120s cuando el WebSocket está sano, 30s cuando está
 * degradado. El push entrega las transferencias en <1s en condiciones normales.
 */
export function useReceivedTransferRequests() {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'driver:team-received-requests',
    changes: [{ event: '*', table: 'order_transfer_requests' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'received-requests'] })
    },
  })

  const query = useQuery({
    queryKey: ['driver', 'team', 'received-requests'],
    queryFn: () => orders.listReceivedTransferRequests(),
    refetchInterval: health === 'degraded' ? 30_000 : 120_000,
  })

  return query
}
