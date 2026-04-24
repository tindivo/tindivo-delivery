'use client'
import { admin } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Lista los pedidos en status=picked_up sin tracking_link_sent_at — el
 * lote que el admin tiene que procesar "enviar WhatsApp al cliente".
 *
 * Realtime: cualquier UPDATE en orders (otro admin envía, driver marca
 * delivered, etc.) invalida la query para que el dashboard se mantenga
 * fresco sin polling agresivo.
 */
export function useTrackingPending() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'tracking-pending'],
    queryFn: () => admin.listTrackingPending(),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: 'admin:tracking-pending',
    changes: [{ event: 'UPDATE', table: 'orders' }],
    onEvent: () => qc.invalidateQueries({ queryKey: ['admin', 'tracking-pending'] }),
  })

  return query
}
