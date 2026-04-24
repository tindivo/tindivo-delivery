'use client'
import { admin } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ResolveCashPayload } from '@tindivo/api-client'

type StatusFilter = 'disputed' | 'delivered' | 'confirmed' | 'resolved' | 'all'

export function useAdminCashSettlements(status: StatusFilter = 'disputed') {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'cash-settlements', status],
    queryFn: () => admin.listCashSettlements(status),
    refetchInterval: 30_000,
  })

  // Admin escucha TODOS los cambios para refrescar el dashboard
  useRealtimeChannel({
    channelName: 'admin:cash-settlements',
    changes: [{ event: '*', table: 'cash_settlements' }],
    onEvent: () => qc.invalidateQueries({ queryKey: ['admin', 'cash-settlements'] }),
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
