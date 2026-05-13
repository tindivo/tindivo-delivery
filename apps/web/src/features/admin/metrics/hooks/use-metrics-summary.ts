'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useMetricsSummary(
  query: { from: string; to: string },
  options?: { staleTime?: number; refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'summary', query],
    queryFn: () => admin.getMetricsSummary(query),
    staleTime: options?.staleTime ?? 60_000,
    refetchInterval: options?.refetchInterval ?? false,
  })
}
