'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useDriversPerformance(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'drivers-performance', query],
    queryFn: () => admin.getDriversPerformance(query),
    staleTime: 60_000,
  })
}
