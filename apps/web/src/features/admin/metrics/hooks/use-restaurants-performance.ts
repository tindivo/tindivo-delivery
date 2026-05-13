'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useRestaurantsPerformance(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'restaurants-performance', query],
    queryFn: () => admin.getRestaurantsPerformance(query),
    staleTime: 60_000,
  })
}
