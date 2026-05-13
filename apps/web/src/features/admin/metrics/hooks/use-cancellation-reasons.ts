'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useCancellationReasons(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'cancellation-reasons', query],
    queryFn: () => admin.getCancellationReasons(query),
    staleTime: 60_000,
  })
}
