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
 * Polling cada 5s como fallback agresivo porque el countdown live necesita
 * saber pronto si la solicitud cambió de estado (por timeout del cron).
 */
export function useReceivedTransferRequests() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'team', 'received-requests'],
    queryFn: () => orders.listReceivedTransferRequests(),
    refetchInterval: 5_000,
  })

  useRealtimeChannel({
    channelName: 'driver:team-received-requests',
    changes: [{ event: '*', table: 'order_transfer_requests' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'received-requests'] })
    },
  })

  return query
}
