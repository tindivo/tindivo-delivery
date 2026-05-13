'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useOperationsFunnel(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['admin', 'metrics', 'operations-funnel', query],
    queryFn: () => admin.getOperationsFunnel(query),
    staleTime: 60_000,
  })
}
