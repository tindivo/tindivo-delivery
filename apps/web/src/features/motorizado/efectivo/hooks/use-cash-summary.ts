'use client'
import { driver } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useCashSummary(driverId: string | null | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'cash-summary'],
    queryFn: () => driver.getCashSummary(),
  })

  useRealtimeChannel({
    channelName: `driver:${driverId ?? 'pending'}:cash-settlements`,
    changes: [
      {
        event: '*',
        table: 'cash_settlements',
        filter: driverId ? `driver_id=eq.${driverId}` : undefined,
      },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'cash-summary'] })
    },
    enabled: Boolean(driverId),
  })

  return query
}
