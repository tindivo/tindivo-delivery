'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useSalesTimeseries(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'sales-timeseries', query],
    queryFn: () => admin.getSalesTimeseries(query),
    staleTime: 60_000,
  })
}
