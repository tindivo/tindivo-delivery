'use client'
import { admin } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ResolveCashPayload } from '@tindivo/api-client'

type StatusFilter = 'disputed' | 'delivered' | 'confirmed' | 'resolved' | 'all'

export function useAdminCashSettlements(status: StatusFilter = 'disputed') {
  const qc = useQueryClient()

  const { health } = useRealtimeChannel({
    channelName: 'admin:cash-settlements',
    changes: [{ event: '*', table: 'cash_settlements' }],
    onEvent: () => qc.invalidateQueries({ queryKey: ['admin', 'cash-settlements'] }),
  })

  const query = useQuery({
    queryKey: ['admin', 'cash-settlements', status],
    queryFn: () => admin.listCashSettlements(status),
    refetchInterval: health === 'healthy' ? 60_000 : 30_000,
  })

  return query
}

export function useResolveCashSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveCashPayload }) =>
      admin.resolveCashSettlement(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cash-settlements'] }),
  })
}
