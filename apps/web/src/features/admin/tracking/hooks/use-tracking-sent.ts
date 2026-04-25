'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Historial de pedidos con tracking ya enviado por WhatsApp.
 * Sin realtime — son registros de auditoría. Refresco manual + cada minuto.
 */
export function useTrackingSent() {
  return useQuery({
    queryKey: ['admin', 'tracking-sent'],
    queryFn: () => admin.listTrackingSent(),
    refetchInterval: 60_000,
  })
}
