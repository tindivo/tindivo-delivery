'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useDemandHeatmap(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'demand-heatmap', query],
    queryFn: () => admin.getDemandHeatmap(query),
    staleTime: 60_000,
  })
}
