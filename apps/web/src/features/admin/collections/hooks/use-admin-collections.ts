'use client'
import { admin } from '@/lib/api/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Settlements } from '@tindivo/contracts'

type StatusFilter = 'pending' | 'paid' | 'overdue' | 'all'

export function useAdminSettlements(status: StatusFilter = 'pending', restaurantId?: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'collections', 'settlements', status, restaurantId ?? null],
    queryFn: () => admin.listSettlements(status, restaurantId),
    refetchInterval: 30_000,
  })

  useRealtimeChannel({
    channelName: 'admin:collections',
    changes: [
      { event: '*', table: 'settlements' },
      { event: 'UPDATE', table: 'restaurants' },
    ],
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })

  return query
}

export function useSettlementsSummary() {
  return useQuery({
    queryKey: ['admin', 'collections', 'summary'],
    queryFn: () => admin.getSettlementsSummary(),
    refetchInterval: 30_000,
  })
}

export function useMarkSettlementPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Settlements.MarkSettlementPaidRequest }) =>
      admin.markSettlementPaid(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useGenerateSettlements() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body?: Settlements.GenerateSettlementsRequest) => admin.generateSettlements(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}
