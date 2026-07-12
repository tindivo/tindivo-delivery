'use client'
import { admin } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const QK = ['admin', 'daily-summary'] as const

/**
 * Resumen del día (TZ Lima) con totales, comerciales, operación, cash, y
 * breakdown por restaurante y por driver. Refetch cada 60s + invalidación
 * por realtime sobre orders.
 */
export function useAdminDailySummary() {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'admin:daily-summary',
    changes: [{ event: '*', table: 'orders' }],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: QK })
    },
  })

  const query = useQuery({
    queryKey: QK,
    queryFn: () => admin.getDailySummary(),
    refetchInterval: health === 'healthy' ? 120_000 : 60_000,
  })

  return query
}
